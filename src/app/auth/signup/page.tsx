"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MIN_PASSWORD_LENGTH, PASSWORD_HINT } from "@/lib/auth/password-policy";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  User,
} from "lucide-react";

/**
 * Registration form, mirroring the sign-in page's layout and controls.
 *
 * Posts to /api/auth/register, which takes exactly these four fields as
 * required (phone, avatar and role are optional there, and role defaults to
 * TENANT — this page does not offer a role picker, so a self-registered user
 * can never choose to be an admin).
 */
function SignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Carried through from the pricing links that point here with ?plan=<id>, so
  // the choice survives the round trip to sign-in.
  const plan = searchParams.get("plan");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // The plan decides the account's role and opens its subscription.
        // Defaulted rather than omitted: without one no subscription is
        // created and the user lands as a tenant, which is not what someone
        // arriving at a sign-up form is asking for.
        body: JSON.stringify({
          firstName,
          lastName,
          email,
          password,
          plan: plan || "free",
        }),
      });
      const json = await res.json();

      if (!res.ok || json?.success === false) {
        // The API puts the reason in `error`, not `message`.
        setError(json?.error || "Could not create your account");
        return;
      }

      // Sign the new user straight in rather than bouncing them to the login
      // form to retype what they just entered. If that fails for any reason
      // the account still exists, so fall back to sign-in instead of erroring.
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        router.push("/auth/signin");
        return;
      }

      // A paid plan is not granted at sign-up: the account is created on the
      // free role and only promoted when Stripe confirms a paid invoice. So
      // send them to Checkout now — otherwise the plan they chose is
      // unreachable and they silently sit on Free.
      if (plan && plan !== "free") {
        const checkout = await fetch("/api/billing/checkout", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planId: plan, cycle: "monthly" }),
        });
        const checkoutJson = await checkout.json();

        if (checkout.ok && checkoutJson?.data?.url) {
          // Full navigation, not router.push: this is Stripe's domain.
          window.location.href = checkoutJson.data.url;
          return;
        }

        // Checkout could not start. The account exists and works on Free, so
        // land them in the app with the reason rather than stranding them on a
        // form they cannot resubmit — the email is taken now.
        console.error(
          "Could not start checkout after sign-up:",
          checkoutJson?.error
        );
        router.push("/dashboard?checkout=failed");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("Could not create your account");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-accent/50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900 dark:text-gray-100">
            Create your account
          </h2>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage your properties with ease
          </p>
        </div>

        {/* Sign Up Form */}
        <Card>
          <CardHeader>
            <CardTitle>Get started</CardTitle>
            <CardDescription>
              Enter your details to create an account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="firstName"
                      type="text"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      placeholder="Enter your first name"
                      className="pl-10"
                      autoComplete="given-name"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                    <Input
                      id="lastName"
                      type="text"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      placeholder="Enter your last name"
                      className="pl-10"
                      autoComplete="family-name"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-10"
                    autoComplete="email"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="pl-10 pr-10"
                    autoComplete="new-password"
                    minLength={MIN_PASSWORD_LENGTH}
                    required
                  />
                  <button
                    // "button", not the implicit "submit", or toggling
                    // visibility would submit the form.
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {PASSWORD_HINT}
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>

              <p className="text-center text-sm text-gray-600 dark:text-gray-400">
                Already have an account?{" "}
                <Link
                  href={plan ? `/auth/signin?plan=${plan}` : "/auth/signin"}
                  className="font-medium text-primary hover:underline"
                >
                  Sign in
                </Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  // useSearchParams needs a Suspense boundary, otherwise the production build
  // fails while prerendering this page.
  return (
    <Suspense
      fallback={
        <p className="text-muted-foreground py-16 text-center text-sm">
          Loading…
        </p>
      }
    >
      <SignUpForm />
    </Suspense>
  );
}
