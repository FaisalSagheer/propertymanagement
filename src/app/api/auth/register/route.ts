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

    const {
      firstName,
      lastName,
      email,
      phone,
      password,
      role = UserRole.TENANT,
      avatar,
      plan,
    } = body;

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

    // Validate password length
    if (password.length < 6) {
      console.error("Password too short:", password.length);
      return createErrorResponse(
        "Password must be at least 6 characters long",
        400
      );
    }

    // Map role values to enum values for single company architecture
    const roleMapping: Record<string, UserRole> = {
      tenant: UserRole.TENANT,
      admin: UserRole.ADMIN,
      manager: UserRole.MANAGER,
      // Legacy mappings for backward compatibility
      super_admin: UserRole.ADMIN,
      property_manager: UserRole.MANAGER,
      owner: UserRole.MANAGER,
      property_owner: UserRole.MANAGER,
      "Property Owner": UserRole.MANAGER,
      "Property Manager": UserRole.MANAGER,
      maintenance_staff: UserRole.MANAGER,
      "Maintenance Staff": UserRole.MANAGER,
      leasing_agent: UserRole.MANAGER,
      "Leasing Agent": UserRole.MANAGER,
    };

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

    const mappedRole = selectedPlan
      ? UserRole.MANAGER
      : (roleMapping[role] ?? role);

    // Validate role. A plan sign-up is always a manager, so only a sign-up
    // without a plan needs the enum check.
    if (
      !selectedPlan &&
      !Object.values(UserRole).includes(mappedRole as UserRole)
    ) {
      console.error(
        "Invalid role specified:",
        role,
        "Available roles:",
        Object.values(UserRole)
      );
      return createErrorResponse(`Invalid role specified: ${role}`, 400);
    }

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
        avatar: avatar || null,
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
      availableRoles: Object.values(UserRole),
      requirements: {
        firstName: "Required, max 50 characters",
        lastName: "Required, max 50 characters",
        email: "Required, valid email format",
        password: "Required, minimum 6 characters",
        phone: "Optional, valid phone number format",
        role: `Optional, one of: ${Object.values(UserRole).join(", ")}`,
      },
    },
    "Registration endpoint information"
  );
};
