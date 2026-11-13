/**
 * PropertyPro - Session Debug API
 * Debug endpoint to check current session and user role
 */

import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { demoRoutesBlocked } from "@/lib/auth/route-guards";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-utils";

export async function GET(request: NextRequest) {
  const blocked = demoRoutesBlocked();
  if (blocked) return blocked;

  try {
    const session = await auth();

    return createSuccessResponse({
      session: session,
      user: session?.user || null,
      isAuthenticated: !!session?.user,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Session debug error:", error);
    return createErrorResponse("Failed to get session info", 500);
  }
}
