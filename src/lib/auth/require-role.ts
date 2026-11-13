/**
 * PropertyPro - Inline role gate
 *
 * For route handlers written as plain `export async function GET(request)`
 * rather than wrapped in `withRoleAndDB`. Restructuring those into the wrapper
 * form means rewriting the whole function body; this gives them the same
 * guarantees with a two-line guard at the top:
 *
 *   const gate = await requireRole([UserRole.ADMIN, UserRole.MANAGER]);
 *   if ("error" in gate) return gate.error;
 *   const { user } = gate;
 *
 * It resolves custom roles exactly as withRoleAndDB does, so a role created in
 * the admin UI behaves identically on both kinds of route — a plain
 * `session.user.role` comparison would refuse every custom-role holder.
 */

import { auth } from "@/lib/auth";
import { UserRole } from "@/types";
import { createErrorResponse, type AuthenticatedUser } from "@/lib/api-utils";
import { resolveUserRole } from "@/lib/auth/resolve-role";
import type { NextResponse } from "next/server";

type Gate =
  | { user: AuthenticatedUser }
  | { error: NextResponse<any> };

export async function requireRole(
  allowed: UserRole | UserRole[]
): Promise<Gate> {
  const session = await auth();

  if (!session?.user?.id || !session?.user?.email) {
    return { error: createErrorResponse("Authentication required", 401) };
  }

  if (session.user.isActive === false) {
    return { error: createErrorResponse("Account is deactivated", 403) };
  }

  // The session already carries the resolved role and permissions (see the
  // session callback in lib/auth.ts), but resolve again so this helper is
  // correct even if called with a session minted before that change.
  //
  // Resolve from `assignedRole`, not `role`: the session's `role` is already
  // the built-in role a custom role inherits from, and resolving that again
  // would drop the custom role's permissions.
  const resolved = await resolveUserRole(
    (session.user.assignedRole ?? session.user.role) as string
  );

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email,
    firstName: session.user.firstName,
    lastName: session.user.lastName,
    role: resolved.effectiveRole,
    assignedRole: resolved.assignedRole,
    isCustomRole: resolved.isCustom,
    permissions: resolved.permissions,
    // Narrowed to true by the deactivated check above.
    isActive: true,
  };

  const allowedRoles = Array.isArray(allowed) ? allowed : [allowed];
  if (!allowedRoles.includes(user.role)) {
    return { error: createErrorResponse("Insufficient permissions", 403) };
  }

  return { user };
}
