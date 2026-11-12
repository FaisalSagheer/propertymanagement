/**
 * PropertyPro - Reset Password API
 * Handle password reset from reset tokens
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
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
import { z } from "zod";

// Reset password validation schema
const resetPasswordSchema = z
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
// POST /api/auth/reset-password - Reset password with token
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
    const validation = resetPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((err) => err.message);
      return createErrorResponse(errors.join(", "), 400);
    }

    const { token, password } = validation.data;

    // Validate reset token
    const tokenResult = await validateInvitationToken(token, "password_reset");
    if (!tokenResult.success || !tokenResult.invitation) {
      return createErrorResponse("Invalid or expired reset token", 400);
    }

    const resetToken = tokenResult.invitation;

    // Find the user
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    if (!user.isActive) {
      return createErrorResponse("Account is deactivated", 403);
    }

    // Update user password
    user.password = password; // Will be hashed by the model's pre-save middleware
    await user.save();

    // Mark reset token as used
    await markTokenAsUsed(token);

    return createSuccessResponse(
      {
        message: "Password reset successfully",
        email: user.email,
      },
      "Password has been reset successfully"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// GET /api/auth/reset-password - Validate reset token
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return createErrorResponse("Token is required", 400);
    }

    // Validate reset token
    const tokenResult = await validateInvitationToken(token, "password_reset");
    if (!tokenResult.success || !tokenResult.invitation) {
      return createErrorResponse("Invalid or expired reset token", 400);
    }

    const resetToken = tokenResult.invitation;

    // Find the user to get their name
    await connectDB();
    const user = await User.findById(resetToken.userId);
    if (!user) {
      return createErrorResponse("User not found", 404);
    }

    if (!user.isActive) {
      return createErrorResponse("Account is deactivated", 403);
    }

    return createSuccessResponse(
      {
        valid: true,
        email: resetToken.email,
        userName: `${user.firstName} ${user.lastName}`,
        expiresAt: resetToken.expiresAt,
      },
      "Token is valid"
    );
  } catch (error) {
    return handleApiError(error);
  }
}
