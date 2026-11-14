/**
 * PropertyPro - User Registration API Route
 * Handle user registration with validation and role assignment
 */

import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { User, ManagerAccount, Subscription } from "@/models";
import { MANAGER_PLANS } from "@/lib/billing/plans";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  parseRequestBody,
  withDatabase,
} from "@/lib/api-utils";
import { validatePasswordPolicy, MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { checkPasswordBreached, BREACHED_PASSWORD_MESSAGE } from "@/lib/auth/password-breach";
import { clientIpFromHeaders } from "@/lib/auth/login-throttle";
import {
  consumeRateLimits,
  emailFromBody,
  registerRules,
  tooManyRequests,
} from "@/lib/auth/request-limit";
import { isValidPhoneNumber, normalizePhoneNumber } from "@/lib/utils";

// ============================================================================
// POST /api/auth/register - Register a new user
// ============================================================================

export const POST = withDatabase(async (request: NextRequest) => {
  try {
    const { success, data: body, error } = await parseRequestBody(request);
    if (!success) {
      console.error("Failed to parse request body:", error);
      return createErrorResponse(error!, 400);
    }

    // Cap sign-ups per client and per address BEFORE doing any work, counting
    // invalid attempts too (junk requests are the cheap way to spam this).
    const limit = await consumeRateLimits(
      registerRules(emailFromBody(body), clientIpFromHeaders(request.headers))
    );
    if (!limit.allowed) {
      return tooManyRequests(limit.retryAfterSec);
    }

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      plan,
    } = body;

    // Self-registration NEVER lets the client choose its own privileges. `role`,
    // `subscription`, `permissions`, `isActive` and the like are deliberately
    // not read from the body: the role is decided below, server-side, from
    // whether a valid plan was chosen. (Previously a client-supplied `role`
    // was honoured, so `{"role":"admin"}` created an administrator.)
    if (body.role !== undefined && body.role !== UserRole.TENANT) {
      console.warn(
        `[register] ignored client-supplied role "${String(body.role)}" for ${String(email)}`
      );
    }

    // Validate required fields
    if (!firstName || !lastName || !email || !password) {
      console.error("Missing required fields:", {
        firstName: !!firstName,
        lastName: !!lastName,
        email: !!email,
        password: !!password,
      });
      return createErrorResponse("Missing required fields", 400);
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      console.error("Invalid email format:", email);
      return createErrorResponse("Invalid email format", 400);
    }

    // Enforce the shared password policy (length only; see password-policy.ts)
    const passwordError = validatePasswordPolicy(password);
    if (passwordError) {
      return createErrorResponse(passwordError, 400);
    }
    const breach = await checkPasswordBreached(password);
    if (breach.status === "breached") {
      return createErrorResponse(BREACHED_PASSWORD_MESSAGE, 400);
    }

    // A self-registration carries a plan id. Every plan is sold as a Manager
    // account, so the user's role is the built-in `manager`; WHICH plan they
    // are on is recorded separately in `subscription`. The id is checked
    // against MANAGER_PLANS rather than trusted: it arrives from the client,
    // and without this check `plan: "admin"` would become the user's plan.
    let selectedPlan: (typeof MANAGER_PLANS)[number] | null = null;
    let entitledPlan: string | null = null;

    if (plan) {
      selectedPlan = MANAGER_PLANS.find((p) => p.id === plan) ?? null;
      if (!selectedPlan) {
        return createErrorResponse(`Unknown plan: ${plan}`, 400);
      }

      // A PAID plan is not granted at sign-up. The user starts on `free`, and
      // the Subscription / ManagerAccount records hold the requested plan as
      // `pending`; the Stripe webhook moves the user onto it when an invoice
      // is actually paid (handleInvoicePaid). Granting `pro` here would give
      // every Pro feature to anyone who typed an email address.
      const isPaid = (selectedPlan.monthlyPrice ?? 0) > 0;
      entitledPlan = isPaid ? "free" : selectedPlan.id;
    }

    // Server-decided role. A plan sign-up is a manager account; anything else
    // is a plain tenant. Admins are never created through this endpoint.
    const mappedRole = selectedPlan ? UserRole.MANAGER : UserRole.TENANT;

    // Validate phone number if provided
    if (phone) {
      if (!isValidPhoneNumber(phone)) {
        return createErrorResponse("Invalid phone number format", 400);
      }
    }

    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return createErrorResponse("User with this email already exists", 409);
      }

      // Create new user
      const newUser = new User({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.toLowerCase().trim(),
        phone: phone ? normalizePhoneNumber(phone.trim()) : undefined,
        password,
        role: mappedRole,
        subscription: entitledPlan,
        avatar: null,
        isActive: true,
        emailVerified: null, // Will be set when email is verified
      });

      // Save user (password will be hashed by pre-save middleware)
      const savedUser = await newUser.save();

      // Open the subscription for a self-registration. Mirrors what the Stripe
      // webhook creates on checkout, minus the Stripe ids — those are attached
      // later if and when the account actually pays.
      //
      // Deliberately not fatal: the user exists and can sign in, so failing the
      // whole request here would leave an account they could not re-create
      // (the email is taken). Logged loudly instead, for an admin to reconcile.
      if (selectedPlan) {
        // A paid plan is not active until money arrives; the free tier has
        // nothing to collect, so it starts active.
        // monthlyPrice is null on the per-client "custom" plan, which is
        // treated as nothing-to-collect here rather than crashing.
        const subscriptionStatus =
          (selectedPlan.monthlyPrice ?? 0) > 0 ? "pending" : "active";
        let managerAccountId: mongoose.Types.ObjectId | null = null;

        try {
          const account = await ManagerAccount.create({
            clientName: `${firstName.trim()} ${lastName.trim()}`.trim(),
            contactEmail: email.toLowerCase().trim(),
            managerUserId: savedUser._id,
            planId: selectedPlan.id,
            status: subscriptionStatus,
            amount: selectedPlan.monthlyPrice ?? 0,
            billingCycle: "monthly",
            startedAt: new Date(),
            renewsAt: null,
            paymentMethod: "card",
          });
          managerAccountId = account._id as mongoose.Types.ObjectId;
        } catch (subscriptionError) {
          console.error(
            `Registered ${email} on plan "${selectedPlan.id}" but the subscription record failed:`,
            subscriptionError
          );
        }

        // The standalone Subscription record. Kept in its own try so that a
        // failure here can never undo the ManagerAccount above, or the user.
        try {
          await Subscription.create({
            userId: savedUser._id,
            managerAccountId,
            planId: selectedPlan.id,
            status: subscriptionStatus,
            billingCycle: "monthly",
            amount: selectedPlan.monthlyPrice ?? 0,
            currency: "GBP",
            unitLimit: selectedPlan.unitLimit,
            paymentMethod: "card",
            startedAt: new Date(),
          });
        } catch (subscriptionError) {
          console.error(
            `Registered ${email} on plan "${selectedPlan.id}" but the Subscription document failed:`,
            subscriptionError
          );
        }
      }

      // Remove password from response
      const userResponse = savedUser.toJSON();
      delete userResponse.password;

      return createSuccessResponse(
        {
          user: userResponse,
          message: "Registration successful",
        },
        "User registered successfully"
      );
    } catch (error: any) {
      // Handle duplicate email error
      if (
        error.code === 11000 ||
        error.message.includes("Email already exists")
      ) {
        return createErrorResponse("User with this email already exists", 409);
      }

      // Handle validation errors
      if (error.name === "ValidationError") {
        const validationErrors = Object.values(error.errors).map(
          (err: any) => err.message
        );
        return createErrorResponse(
          `Validation error: ${validationErrors.join(", ")}`,
          400
        );
      }

      throw error;
    }
  } catch (error) {
    console.error("Registration error:", error);
    return handleApiError(error);
  }
});

// ============================================================================
// GET /api/auth/register - Get registration information (for testing)
// ============================================================================

export const GET = async () => {
  return createSuccessResponse(
    {
      message: "Registration endpoint is available",
      requirements: {
        firstName: "Required, max 50 characters",
        lastName: "Required, max 50 characters",
        email: "Required, valid email format",
        password: `Required, minimum ${MIN_PASSWORD_LENGTH} characters`,
        phone: "Optional, valid phone number format",
        plan: `Optional, one of: ${MANAGER_PLANS.map((p) => p.id).join(", ")}. Decides the account type; the role is always set by the server.`,
      },
    },
    "Registration endpoint information"
  );
};
