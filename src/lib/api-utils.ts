import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { ApiResponse, PaginationParams, UserRole } from "@/types";
import { resolveUserRole } from "@/lib/auth/resolve-role";
import connectDB, { connectDBSafe } from "./mongodb";
import { ensureTenantProfile } from "./tenant-utils";
// Import will be done dynamically to avoid circular dependencies

export { formatCurrency } from "@/lib/utils/formatting";
// Re-export connectDB for convenience
export { default as connectDB } from "./mongodb";

// ============================================================================
// RESPONSE HELPERS
// ============================================================================

export function createSuccessResponse<T>(
  data: T,
  message?: string,
  pagination?: ApiResponse["pagination"]
): NextResponse<ApiResponse<T>> {
  return NextResponse.json({
    success: true,
    data,
    message,
    pagination,
  });
}

export function createErrorResponse(
  error: string,
  statusCode: number = 400,
  message?: string
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error,
      message,
    },
    { status: statusCode }
  );
}

// ============================================================================
// AUTHENTICATION HELPERS
// ============================================================================

// ============================================================================
// DATABASE HELPERS
// ============================================================================

export function withDatabase(
  handler: (request: NextRequest, context?: unknown) => Promise<NextResponse>
) {
  return async (request: NextRequest, context?: unknown) => {
    try {
      const connection = await connectDBSafe();
      if (!connection && process.env.NODE_ENV === "production") {
        return createErrorResponse("Database connection failed", 500);
      }
      return handler(request, context);
    } catch (error) {
      console.error("Database connection error:", error);
      if (process.env.NODE_ENV === "production") {
        return createErrorResponse("Database connection failed", 500);
      }
      // In development, continue without database
      console.warn(
        "⚠️ Continuing without database connection in development mode"
      );
      return handler(request, context);
    }
  };
}

// ============================================================================
// PAGINATION HELPERS
// ============================================================================

export function parsePaginationParams(
  searchParams: URLSearchParams
): PaginationParams {
  return {
    page: parseInt(searchParams.get("page") || "1"),
  limit: Math.min(parseInt(searchParams.get("limit") || "12"), 100),
    sortBy: searchParams.get("sortBy") || undefined,
    sortOrder: (searchParams.get("sortOrder") as "asc" | "desc") || "desc",
    search: searchParams.get("search") || undefined,
  };
}

export function createPaginationInfo(
  page: number,
  limit: number,
  total: number
) {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNext: page < totalPages,
    hasPrev: page > 1,
  };
}

export async function paginateQuery(
  model: any,
  query: any = {},
  params: PaginationParams
) {
  const { page = 1, limit = 10, sortBy, sortOrder, search } = params;

  // Add search functionality
  // IMPORTANT: Don't overwrite $or if it already exists (e.g., from status filtering)
  if (search && model.schema.paths.name) {
    if (query.$or) {
      // If $or already exists, combine with $and to preserve both conditions
      query.$and = [
        { $or: query.$or }, // Keep existing $or (e.g., status filter)
        {
          $or: [
            { name: { $regex: search, $options: "i" } },
            { description: { $regex: search, $options: "i" } },
          ],
        },
      ];
      delete query.$or; // Remove the old $or since we're using $and now
    } else {
      // No existing $or, safe to add search $or
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
      ];
    }
  }

  // Calculate skip value
  const skip = (page - 1) * limit;

  // Build sort object
  const sort: any = {};
  if (sortBy) {
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;
  } else {
    sort.createdAt = -1; // Default sort by creation date
  }

  // Execute queries
  const [data, total] = await Promise.all([
    model.find(query).sort(sort).skip(skip).limit(limit).lean(),
    model.countDocuments(query),
  ]);

  const pagination = createPaginationInfo(page, limit, total);

  return { data, pagination };
}

// ============================================================================
// ERROR HANDLING
// ============================================================================

export function handleApiError(error: any): NextResponse<ApiResponse> {
  console.error("API Error:", error);

  // Mongoose validation error
  if (error.name === "ValidationError") {
    const errors = Object.values(error.errors).map((err: any) => err.message);
    return createErrorResponse(errors.join(", "), 400);
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    // Handle different error formats from MongoDB
    let field = "record";
    if (error.keyPattern && typeof error.keyPattern === "object") {
      field = Object.keys(error.keyPattern)[0];
    } else if (error.keyValue && typeof error.keyValue === "object") {
      field = Object.keys(error.keyValue)[0];
    } else if (error.message && error.message.includes("dup key")) {
      // Extract field from error message if keyPattern is not available
      const match = error.message.match(/dup key: \{ (\w+):/);
      if (match) {
        field = match[1];
      }
    }
    return createErrorResponse(`${field} already exists`, 409);
  }

  // Mongoose cast error
  if (error.name === "CastError") {
    return createErrorResponse("Invalid ID format", 400);
  }

  // Custom API error
  if (error.statusCode) {
    return createErrorResponse(error.message, error.statusCode);
  }

  // Default server error
  return createErrorResponse("Internal server error", 500);
}

// ============================================================================
// REQUEST VALIDATION
// ============================================================================

export async function parseRequestBody(request: NextRequest) {
  try {
    const body = await request.json();
    return { success: true, data: body };
  } catch (error) {
    return { success: false, error: "Invalid JSON body" };
  }
}

export function validateRequiredFields(data: any, fields: string[]) {
  const missing = fields.filter((field) => !data[field]);

  if (missing.length > 0) {
    throw new Error(`Missing required fields: ${missing.join(", ")}`);
  }
}

// ============================================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================================

/**
 * The user object every guarded route handler receives as its first argument.
 *
 * `role` is the RESOLVED base role — a custom role reports the role it inherits
 * from, so existing checks keep working — while `assignedRole` is what the user
 * actually holds, e.g. "agent".
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  /**
   * Carried through from the session because several maintenance routes build
   * display names from them. They are optional on the session, so treat them
   * as optional here rather than asserting.
   */
  firstName?: string;
  lastName?: string;
  role: UserRole;
  assignedRole: string;
  isCustomRole: boolean;
  permissions: string[];
  isActive: boolean;
}

/**
 * Typed so call sites stop inferring `user` as implicit-any. `handler` was
 * `any`, which left the parameter untyped in every guarded route and cost
 * handlers any autocomplete on the user object.
 */
type AuthenticatedHandler = (
  user: AuthenticatedUser,
  request: NextRequest,
  context?: any
) => Promise<NextResponse<any>> | NextResponse<any>;

// Primary authentication middleware for Next.js 15 App Router
export function withRoleAndDB(roles: UserRole | UserRole[]) {
  return function (handler: AuthenticatedHandler): any {
    return async (
      request: NextRequest,
      context?: any
    ): Promise<NextResponse> => {
      try {
        // Connect to database
        await connectDB();

        // Use auth() for Next.js 15 App Router compatibility
        const session = await auth();

        if (!session?.user) {
          return createErrorResponse("Authentication required", 401);
        }

        // Validate required session properties
        if (!session?.user?.id || !session?.user?.email) {
          return createErrorResponse("Invalid session", 401);
        }

        // Resolve the assigned role. Built-in roles pass through untouched;
        // an admin-created role is looked up in the `roles` collection and
        // resolved to the base role it inherits from. Previously this was a
        // bare `as UserRole` cast, so a custom role matched nothing in
        // allowedRoles and was refused by every guarded route.
        //
        // Resolve from `assignedRole` (the name actually stored on the user),
        // NOT `role`: the session callback has already replaced `role` with the
        // built-in role a custom role inherits from, so resolving that again
        // would see a plain built-in role and silently drop the custom role's
        // permissions (and its property_view_all scope lift).
        const resolved = await resolveUserRole(
          (session.user.assignedRole ?? session.user.role) as string
        );

        const user: AuthenticatedUser = {
          id: session.user.id,
          email: session.user.email,
          firstName: session.user.firstName,
          lastName: session.user.lastName,
          // The base role, so existing checks keep working unchanged.
          role: resolved.effectiveRole,
          /** What the user is actually assigned, e.g. "agent". */
          assignedRole: resolved.assignedRole,
          isCustomRole: resolved.isCustom,
          /** Available to handlers that want a finer check than a role. */
          permissions: resolved.permissions,
          isActive: session?.user?.isActive !== false,
        };

        // Check if user is active
        if (!user.isActive) {
          return createErrorResponse("Account is deactivated", 403);
        }

        // Check role permissions
        const allowedRoles = Array.isArray(roles) ? roles : [roles];
        if (!allowedRoles.includes(user.role)) {
          return createErrorResponse("Insufficient permissions", 403);
        }

        let tenantProfile = null;

        if (user.role === UserRole.TENANT) {
          try {
            tenantProfile = await ensureTenantProfile(user.id);
          } catch (tenantError) {
            console.error("Failed to ensure tenant profile:", tenantError);
            return createErrorResponse("Unable to resolve tenant profile", 500);
          }

          if (!tenantProfile) {
            console.error(
              "Tenant profile could not be created or retrieved for user",
              user.id
            );
            return createErrorResponse("Tenant profile unavailable", 500);
          }
        }

        const augmentedContext = {
          ...(context ?? {}),
          tenantProfile,
        };

        // Call the handler with user as first parameter

        const result = await handler(user, request, augmentedContext);

        // Ensure we always return a NextResponse
        if (!result) {
          console.error("Handler returned null/undefined");
          return createErrorResponse(
            "Internal server error: no response from handler",
            500
          );
        }

        return result;
      } catch (error) {
        console.error("withRoleAndDB error:", error);
        return handleApiError(error);
      }
    };
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

export function sanitizeUser(user: any) {
  const { password, ...sanitized } = user;
  return sanitized;
}

export function generateSlug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// export function formatCurrency(amount: number): string {
//   return new Intl.NumberFormat("en-US", {
//     style: "currency",
//     currency: "USD",
//   }).format(amount);
// }

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
}

export function isValidObjectId(id: string): boolean {
  if (!id) return false;

  // Use MongoDB's ObjectId validation for more robust checking
  try {
    const { ObjectId } = require("mongoose").Types;
    return ObjectId.isValid(id);
  } catch {
    // Fallback to regex if mongoose is not available
    return /^[0-9a-fA-F]{24}$/.test(id);
  }
}
