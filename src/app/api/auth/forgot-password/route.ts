/**
 * PropertyPro - Forgot Password API
 * Handle password reset requests
 */

export const dynamic = "force-dynamic";

import { NextRequest } from "next/server";
import connectDB from "@/lib/mongodb";
import { User } from "@/models";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
} from "@/lib/api-utils";
import {
  createPasswordResetToken,
  sendPasswordResetEmail,
} from "@/lib/invitation-utils";
import { clientIpFromHeaders } from "@/lib/auth/login-throttle";
import {
  consumeRateLimits,
  emailFromBody,
  forgotPasswordRules,
  tooManyRequests,
} from "@/lib/auth/request-limit";
import { z } from "zod";

// Forgot password validation schema
const forgotPasswordSchema = z.object({
  email: z
    .string()
    .email("Please enter a valid email address")
    .toLowerCase()
    .trim(),
});

// ============================================================================
// POST /api/auth/forgot-password - Request password reset
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
    // Each request can send a real email, so cap them per address and per
    // client BEFORE doing any work. Applies to any email, real or not, so it
    // reveals nothing about which accounts exist.
    const limit = await consumeRateLimits(
      forgotPasswordRules(emailFromBody(body), clientIpFromHeaders(request.headers))
    );
    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfterSec);
    }

    const validation = forgotPasswordSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.errors.map((err) => err.message);
      return createErrorResponse(errors.join(", "), 400);
    }

    const { email } = validation.data;

    // Find user by email
    const user = await User.findOne({ email });

    // Always return success to prevent email enumeration attacks
    // But only send email if user exists
    if (user && user.isActive) {
      // Create password reset token
      const tokenResult = await createPasswordResetToken(
        user._id.toString(),
        user.email
      );

      if (tokenResult.success && tokenResult.token) {
        // Send password reset email
        const userName = `${user.firstName} ${user.lastName}`;
        await sendPasswordResetEmail(tokenResult.token, userName);
      }
    }

    // Always return success response for security
    return createSuccessResponse(
      {
        message:
          "If an account with that email exists, a password reset link has been sent.",
        email,
      },
      "Password reset request processed"
    );
  } catch (error) {
    return handleApiError(error);
  }
}

// ============================================================================
// GET /api/auth/forgot-password - Get forgot password information
// ============================================================================
export async function GET() {
  return createSuccessResponse(
    {
      message: "Password reset endpoint is available",
      process: [
        "1. Submit email address",
        "2. System checks if account exists",
        "3. If account exists, password reset email is sent",
        "4. User clicks link in email to reset password",
        "5. User sets new password",
      ],
      security: [
        "Email enumeration protection - always returns success",
        "Reset tokens expire in 1 hour",
        "Only one active reset token per user",
        "Tokens are single-use only",
      ],
    },
    "Forgot password endpoint information"
  );
}
