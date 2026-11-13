/**
 * PropertyPro - Create Admin Setup API
 * One-time setup endpoint to create the initial admin user.
 *
 * There is no signed-in user to check here (no admin exists yet), so this is
 * protected by a secret instead: set SETUP_TOKEN (24+ characters) in the
 * environment and send it as the `x-setup-token` header. With no token set the
 * route answers 404, so a normal deployment exposes nothing. It also refuses to
 * run once ANY admin exists. Remove SETUP_TOKEN again after creating the admin.
 *
 *   curl -X POST https://<host>/api/setup/create-admin \
 *     -H "x-setup-token: $SETUP_TOKEN" -H "content-type: application/json" \
 *     -d '{"email":"...","password":"...","firstName":"...","lastName":"..."}'
 */

import { NextRequest } from "next/server";
import { User } from "@/models";
import { UserRole } from "@/types";
import { createSuccessResponse, createErrorResponse } from "@/lib/api-utils";
import connectDB from "@/lib/mongodb";
import { checkSetupToken } from "@/lib/auth/route-guards";
import { validatePasswordPolicy } from "@/lib/auth/password-policy";
import { checkPasswordBreached, BREACHED_PASSWORD_MESSAGE } from "@/lib/auth/password-breach";

export async function POST(request: NextRequest) {
  // Authorise before touching the database.
  const denied = checkSetupToken(request);
  if (denied) return denied;

  try {
    await connectDB();

    // Check if any admin already exists
    const existingAdmin = await User.findOne({
      role: UserRole.ADMIN,
    });
    if (existingAdmin) {
      return createErrorResponse("An admin already exists", 400);
    }

    const body = await request.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return createErrorResponse("Invalid request body", 400);
    }

    // Validate required fields
    const { firstName, lastName, password } = body;
    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
    if (!email || !password || !firstName || !lastName) {
      return createErrorResponse("Missing required fields", 400);
    }

    const passwordError = validatePasswordPolicy(password);
    if (passwordError) {
      return createErrorResponse(passwordError, 400);
    }
    const breach = await checkPasswordBreached(password);
    if (breach.status === "breached") {
      return createErrorResponse(BREACHED_PASSWORD_MESSAGE, 400);
    }

    // Check if user with email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return createErrorResponse("User with this email already exists", 400);
    }

    // Create admin user. Fields are listed explicitly; nothing else from the
    // request body is copied onto the user.
    const adminUser = new User({
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      email,
      password, // Will be hashed by the model
      role: UserRole.ADMIN,
      phone: body.phone || undefined,
      isActive: true,
      emailVerified: new Date(),
    });

    const savedUser = await adminUser.save();

    // Remove password from response
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    return createSuccessResponse(
      { data: userResponse },
      "Admin created successfully"
    );
  } catch (error) {
    console.error("Error creating admin:", error);
    return createErrorResponse("Failed to create admin", 500);
  }
}
