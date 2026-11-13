/**
 * PropertyPro - Password Setup API
 * Handle tenant password setup from invitation tokens
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { checkPasswordBreached, BREACHED_PASSWORD_MESSAGE } from "@/lib/auth/password-breach";
import {
  MIN_PASSWORD_LENGTH,
  MAX_PASSWORD_LENGTH,
  PASSWORD_MIN_MESSAGE,
  PASSWORD_MAX_MESSAGE,
} from "@/lib/auth/password-policy";
import { User } from "@/models";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
} from "@/lib/api-utils";
import {
  validateInvitationToken,
  markTokenAsUsed,
} from "@/lib/invitation-utils";
import { emailService } from "@/lib/email-service";
import { UserRole } from "@/types";
import { z } from "zod";

// Password setup validation schema
const passwordSetupSchema = z
  .object({
    token: z.string().min(1, "Token is required"),
    password: z
      .string()
      .min(MIN_PASSWORD_LENGTH, PASSWORD_MIN_MESSAGE)
      .max(MAX_PASSWORD_LENGTH, PASSWORD_MAX_MESSAGE),
    confirmPassword: z.string().min(1, "Password confirmation is required"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

// ============================================================================
// POST /api/auth/setup-password - Set up password from invitation token
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    await connectDB();

    // Parse request body
    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) {
      return createErrorResponse(error!, 400);
    }

    // Validate request data
    const validation = passwordSetupSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((err) => err.message);
      return createErrorResponse(errors.join(", "), 400);
    }

    const { token, password } = validation.data;

    // Validate invitation token
    const tokenResult = await validateInvitationToken(
      token,
      "tenant_invitation"
    );
    if (!tokenResult.success || !tokenResult.invitation) {
      return createErrorResponse("Invalid or expired invitation token", 400);
    }

    const invitation = tokenResult.invitation;

    const breach = await checkPasswordBreached(password);
    if (breach.status === "breached") {
      return createErrorResponse(BREACHED_PASSWORD_MESSAGE, 400);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: invitation.email,
    });

    if (existingUser) {
      return createErrorResponse(
        "An account with this email already exists",
        409
      );
    }

    // Create new tenant user
    const tenantData = invitation.tenantData!;
    const newUser = new User({
      firstName: tenantData.firstName,
      lastName: tenantData.lastName,
      email: invitation.email,
      password, // Will be hashed by the model's pre-save middleware
      role: UserRole.TENANT,
      phone: tenantData.phone,
      avatar: tenantData.avatar,
      isActive: true,
      emailVerified: new Date(), // Mark as verified since they used the invitation

      // Tenant-specific fields
      dateOfBirth: tenantData.dateOfBirth,
      employmentInfo: tenantData.employmentInfo,
      emergencyContacts: tenantData.emergencyContacts,
      creditScore: tenantData.creditScore,
      moveInDate: tenantData.moveInDate,
      applicationNotes: tenantData.applicationNotes,
      tenantStatus: "approved", // Set initial status
      applicationDate: new Date().toISOString(),
    });

    // Save the new user
    const savedUser = await newUser.save();

    // Mark invitation token as used
    await markTokenAsUsed(token);

    // Send account activation confirmation email
    const userName = `${tenantData.firstName} ${tenantData.lastName}`;
    await emailService.sendAccountActivated(invitation.email, userName);

    // Remove password from response
    const userResponse = savedUser.toJSON();
    delete userResponse.password;

    return createSuccessResponse(
      {
        user: userResponse,
        message: "Account created successfully",
      },
      "Password setup completed successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// GET /api/auth/setup-password - Validate invitation token
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return createErrorResponse("Token is required", 400);
    }

    // Validate invitation token
    const tokenResult = await validateInvitationToken(
      token,
      "tenant_invitation"
    );
    if (!tokenResult.success || !tokenResult.invitation) {
      return createErrorResponse("Invalid or expired invitation token", 400);
    }

    const invitation = tokenResult.invitation;
    const tenantData = invitation.tenantData!;

    // Check if user already exists
    await connectDB();
    const existingUser = await User.findOne({
      email: invitation.email,
    });

    if (existingUser) {
      return createErrorResponse(
        "An account with this email already exists",
        409
      );
    }

    return createSuccessResponse(
      {
        valid: true,
        email: invitation.email,
        tenantName: `${tenantData.firstName} ${tenantData.lastName}`,
        expiresAt: invitation.expiresAt,
      },
      "Token is valid"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
