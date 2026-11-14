import NextAuth, { CredentialsSignin, type NextAuthConfig } from "next-auth";
import { MongoDBAdapter } from "@auth/mongodb-adapter";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import CredentialsProvider from "next-auth/providers/credentials";
import { MongoClient } from "mongodb";
import connectDB from "./mongodb";
import User, { UserDocument } from "@/models/User";
import { UserRole } from "@/types";
import { resolveUserRole } from "@/lib/auth/resolve-role";
import {
  checkLoginAllowed,
  clientIpFromHeaders,
  recordLoginFailure,
  recordLoginSuccess,
} from "@/lib/auth/login-throttle";
import type { Provider } from "next-auth/providers";

// MongoDB client for NextAuth adapter
// Use lazy connection to avoid timeout during build
const uri = process.env.MONGODB_URI!;
const options = {
  serverSelectionTimeoutMS: 30000,
  connectTimeoutMS: 30000,
};

const clientPromise: Promise<MongoClient> = (() => {
  if (!global._mongoClientPromise) {
    const client = new MongoClient(uri, options);
    global._mongoClientPromise = client.connect();
  }
  return global._mongoClientPromise;
})();

/**
 * Thrown when a sign-in is refused because of too many recent failures. Extends
 * CredentialsSignin so Auth.js treats it as a rejected sign-in (not a server
 * fault); the `code` reaches the client so the form can explain why.
 */
class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

// Create providers array conditionally
const providers: Provider[] = [];

// Add Google OAuth Provider if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile.sub,
          email: profile.email,
          firstName: profile?.given_name || "",
          lastName: profile?.family_name || "",
          avatar: profile?.picture,
          role: UserRole.TENANT, // Default role for OAuth users
          isActive: true,
          emailVerified: new Date(profile?.email_verified ? Date.now() : 0),
        };
      },
    })
  );
}

// Add GitHub OAuth Provider if configured
if (process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET) {
  providers.push(
    GitHubProvider({
      clientId: process.env.GITHUB_CLIENT_ID,
      clientSecret: process.env.GITHUB_CLIENT_SECRET,
      profile(profile) {
        return {
          id: profile?.id?.toString() ?? "",
          email: profile?.email ?? "",
          firstName: profile?.name?.split(" ")?.[0] || "",
          lastName: profile?.name?.split(" ")?.slice(1)?.join(" ") || "",
          avatar: profile?.avatar_url,
          role: UserRole.TENANT, // Default role for OAuth users
          isActive: true,
          emailVerified: profile?.email ? new Date() : null,
        };
      },
    })
  );
}

// Always add Credentials Provider
providers.push(
  CredentialsProvider({
    name: "credentials",
    credentials: {
      email: {
        label: "Email",
        type: "email",
        placeholder: "Enter your email",
      },
      password: {
        label: "Password",
        type: "password",
        placeholder: "Enter your password",
      },
    },
    async authorize(credentials, request) {
      // A missing field is a rejected sign-in, not a server fault — same
      // reasoning as the credential checks below.
      if (!credentials?.email || !credentials?.password) {
        return null;
      }

      const email = (credentials.email as string).toLowerCase().trim();
      const ip = clientIpFromHeaders(request?.headers);

      // Refuse BEFORE looking at the password: a locked-out sign-in must fail
      // even if the password is right, or the lock would not slow guessing.
      // Same answer whether or not the account exists.
      await connectDB();
      const gate = await checkLoginAllowed(email, ip);
      if (!gate.allowed) {
        throw new TooManyAttempts();
      }

      try {
        // Find user with password field included
        const user = (await User.findOne({
          email,
        }).select("+password")) as UserDocument | null;

        // Return null, never throw, on a failed credential check. Auth.js v5
        // turns any non-AuthError thrown from authorize into
        // `error=Configuration` — a generic "server configuration problem"
        // page — so a wrong password was indistinguishable from a broken
        // deployment, both on screen and in the logs. Returning null produces
        // the correct CredentialsSignin result.
        if (!user) {
          await recordLoginFailure(email, ip);
          return null;
        }

        if (!user?.isActive) {
          await recordLoginFailure(email, ip);
          return null;
        }

        // Check password
        const isPasswordValid = await user.comparePassword(
          credentials.password as string
        );

        if (!isPasswordValid) {
          await recordLoginFailure(email, ip);
          return null;
        }

        await recordLoginSuccess(email, ip);

        // Update last login
        await user.updateLastLogin();

        return {
          id: user?._id?.toString() ?? "",
          email: user?.email ?? "",
          firstName: user?.firstName,
          lastName: user?.lastName,
          role: user?.role as UserRole,
          avatar: user?.avatar,
          isActive: user?.isActive,
        };
      } catch (error) {
        console.error("Authentication error:", error);
        throw new Error("Authentication failed");
      }
    },
  })
);

export const authOptions: NextAuthConfig = {
  adapter: MongoDBAdapter(clientPromise),
  providers,

  // Trust host for development and production
  trustHost: true,

  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },

  // Cookie configuration for production
  cookies: {
    sessionToken: {
      name:
        process.env.NODE_ENV === "production"
          ? "__Secure-next-auth.session-token"
          : "next-auth.session-token",
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },

  callbacks: {
    async jwt({ token, user, account }) {
      // Initial sign in
      if (account && user) {
        token.role = user?.role;
        token.isActive = user?.isActive;
        token.userId = user?.id;
      }

      // Return previous token if the access token has not expired yet
      return token;
    },

    async session({ session, token }) {
      // Send properties to the client
      if (token) {
        session.user.id = (token?.userId as string) ?? "";

        // The role as stored on the user — for an admin-created role this is
        // its raw name, e.g. "agent", not a UserRole enum member.
        let rawRole = (token?.role as string) ?? UserRole.TENANT;
        session.user.isActive = (token?.isActive as boolean) ?? false;

        // Fetch fresh user data for the session
        try {
          await connectDB();
          const user = await User.findById(token?.userId).select("-password");
          if (user) {
            rawRole = (user?.role as string) ?? UserRole.TENANT;

            session.user.firstName = user?.firstName;
            session.user.lastName = user?.lastName;
            session.user.name = `${user?.firstName || ""} ${
              user?.lastName || ""
            }`;
            session.user.avatar = user?.avatar;
            session.user.bio = user?.bio;
            session.user.location = user?.location;
            session.user.city = user?.city;
            session.user.website = user?.website;
            session.user.address = user?.address;
            session.user.phone = user?.phone;
            // Add createdAt for Member Since date
            session.user.createdAt = user?.createdAt;
          }
        } catch (error) {
          console.error("Session user fetch error:", error);
        }

        // Resolve a custom role to the built-in role it inherits from before
        // exposing it. Every client-side check compares against the three-value
        // UserRole enum, so without this a user holding "agent" matches nothing
        // — an empty sidebar and no access anywhere in the UI, even though the
        // API layer would have let them through.
        try {
          const resolved = await resolveUserRole(rawRole);
          session.user.role = resolved.effectiveRole;
          session.user.assignedRole = resolved.assignedRole;
          session.user.isCustomRole = resolved.isCustom;
          session.user.permissions = resolved.permissions;
        } catch (error) {
          // Fail closed: an unresolvable role gets the least access.
          console.error("Session role resolution error:", error);
          session.user.role = UserRole.TENANT;
          session.user.assignedRole = rawRole;
          session.user.isCustomRole = false;
          session.user.permissions = [];
        }
      }

      return session;
    },

    async signIn({ user, account }) {
      try {
        await connectDB();

        // For OAuth providers, create or update user
        if (account?.provider !== "credentials") {
          const existingUser = await User.findOne({ email: user.email });

          if (existingUser) {
            // Update existing user with OAuth info
            existingUser.avatar = user.avatar || existingUser.avatar;
            existingUser.emailVerified =
              existingUser.emailVerified || new Date();
            await existingUser.save();
          } else {
            // Create new user for OAuth
            await User.create({
              email: user.email,
              firstName: user.firstName || "",
              lastName: user.lastName || "",
              avatar: user.avatar,
              role: UserRole.TENANT,
              isActive: true,
              emailVerified: new Date(),
            });
          }
        }

        return true;
      } catch (error) {
        console.error("Sign in error:", error);
        return false;
      }
    },
  },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  debug: process.env.NODE_ENV === "development",
};

// Export NextAuth instance with auth, handlers, signIn, signOut
export const {
  auth,
  handlers,
  signIn: signInAction,
  signOut: signOutAction,
} = NextAuth(authOptions);

// Helper function to check if user has required role
export function hasRole(
  userRole: UserRole,
  requiredRoles: UserRole[]
): boolean {
  return requiredRoles.includes(userRole);
}

// Helper function to check if user is admin
export function isAdmin(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

// Helper function to check if user can manage properties
export function canManageProperties(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
}

// Helper function to check if user can access tenant features
export function canAccessTenantFeatures(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER, UserRole.TENANT].includes(userRole);
}

// Helper function to check if user has company-wide access (not tenant-specific)
export function hasCompanyAccess(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
}

// Helper function to check if user can manage users
export function canManageUsers(userRole: UserRole): boolean {
  return userRole === UserRole.ADMIN;
}

// Helper function to check if user can view all company data
export function canViewAllData(userRole: UserRole): boolean {
  return [UserRole.ADMIN, UserRole.MANAGER].includes(userRole);
}
