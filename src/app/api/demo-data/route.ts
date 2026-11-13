/**
 * PropertyPro - Demo Data API
 * API endpoints for installing and managing demo data
 */

export const dynamic = "force-dynamic";

import { MIN_PASSWORD_LENGTH } from "@/lib/auth/password-policy";
import { NextRequest } from "next/server";
import { UserRole } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
  parseRequestBody,
} from "@/lib/api-utils";
import {
  demoDataService,
  DemoDataOptions,
} from "@/lib/services/demo-data.service";
import { z } from "zod";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const installDemoDataSchema = z.object({
  includeUsers: z.boolean().default(true),
  includeProperties: z.boolean().default(true),
  includeTenants: z.boolean().default(true),
  includeLeases: z.boolean().default(true),
  includePayments: z.boolean().default(true),
  includeMaintenance: z.boolean().default(true),
  includeMessages: z.boolean().default(true),
  includeEvents: z.boolean().default(true),
  includeAnnouncements: z.boolean().default(true),
  propertyCount: z.number().min(1).max(20).default(5),
  tenantCount: z.number().min(1).max(50).default(15),
  organizationName: z
    .string()
    .min(1)
    .max(100)
    .default("Demo Property Management"),
  adminEmail: z.string().email().default("admin@demo.com"),
  adminPassword: z.string().min(MIN_PASSWORD_LENGTH).default("DemoAdmin1234!"),
});

// ============================================================================
// POST /api/demo-data - Install demo data
// ============================================================================
export const POST = withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      const { success, data: body, error } = await parseRequestBody(request);
      if (!success) {
        return createErrorResponse(error!, 400);
      }

      // Validate request body
      const validation = installDemoDataSchema.safeParse(body);
      if (!validation.success) {
        return createErrorResponse(
          `Validation failed: ${validation.error.errors
            .map((e) => e.message)
            .join(", ")}`,
          400
        );
      }

      const options: DemoDataOptions = validation.data;

      // Install demo data
      const result = await demoDataService.installDemoData(options);

      if (result.success) {
        return createSuccessResponse(
          {
            installed: result.data,
            adminCredentials: result.adminCredentials,
            message: result.message,
          },
          "Demo data installed successfully",
          201
        );
      } else {
        return createErrorResponse(result.message, 400, {
          errors: result.errors,
        });
      }
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// ============================================================================
// DELETE /api/demo-data - Clear demo data
// ============================================================================
export const DELETE = withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      const result = await demoDataService.clearDemoData();

      if (result.success) {
        return createSuccessResponse(
          { message: result.message },
          "Demo data cleared successfully"
        );
      } else {
        return createErrorResponse(result.message, 500);
      }
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// ============================================================================
// GET /api/demo-data - Check demo data status
// ============================================================================
export const GET = withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      // Import models dynamically to check data
      const {
        User,
        Property,
        Tenant,
        Lease,
        Payment,
        MaintenanceRequest,
        Message,
        Event,
        Announcement,
      } = await import("@/models");

      // Check if demo data exists
      const [
        userCount,
        propertyCount,
        tenantCount,
        leaseCount,
        paymentCount,
        maintenanceCount,
        messageCount,
        eventCount,
        announcementCount,
      ] = await Promise.all([
        User.countDocuments(),
        Property.countDocuments(),
        Tenant.countDocuments(),
        Lease.countDocuments(),
        Payment.countDocuments(),
        MaintenanceRequest.countDocuments(),
        Message.countDocuments(),
        Event.countDocuments(),
        Announcement.countDocuments(),
      ]);

      const totalRecords =
        userCount +
        propertyCount +
        tenantCount +
        leaseCount +
        paymentCount +
        maintenanceCount +
        messageCount +
        eventCount +
        announcementCount;

      const hasDemoData = totalRecords > 0;

      // Get sample data for preview
      let sampleData = null;
      if (hasDemoData) {
        const [sampleUsers, sampleProperties, sampleTenants] =
          await Promise.all([
            User.find().select("firstName lastName email role").limit(3).lean(),
            Property.find().select("name address type").limit(3).lean(),
            Tenant.find()
              .populate("userId", "firstName lastName email")
              .limit(3)
              .lean(),
          ]);

        sampleData = {
          users: sampleUsers,
          properties: sampleProperties,
          tenants: sampleTenants,
        };
      }

      return createSuccessResponse(
        {
          hasDemoData,
          counts: {
            users: userCount,
            properties: propertyCount,
            tenants: tenantCount,
            leases: leaseCount,
            payments: paymentCount,
            maintenanceRequests: maintenanceCount,
            messages: messageCount,
            events: eventCount,
            announcements: announcementCount,
            total: totalRecords,
          },
          sampleData,
        },
        "Demo data status retrieved successfully"
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
);

// ============================================================================
// Helper functions for demo data management
// ============================================================================

export async function checkDemoDataExists(): Promise<boolean> {
  try {
    const { User } = await import("@/models");
    const userCount = await User.countDocuments();
    return userCount > 0;
  } catch (error) {
    console.error("Error checking demo data:", error);
    return false;
  }
}

export async function installQuickDemo(): Promise<{
  success: boolean;
  message: string;
  adminCredentials?: { email: string; password: string };
}> {
  try {
    const options: DemoDataOptions = {
      includeUsers: true,
      includeProperties: true,
      includeTenants: true,
      includeLeases: true,
      includePayments: true,
      includeMaintenance: true,
      includeMessages: true,
      includeEvents: true,
      includeAnnouncements: true,
      propertyCount: 3,
      tenantCount: 8,
      organizationName: "Quick Demo Properties",
      adminEmail: "admin@quickdemo.com",
      adminPassword: "QuickDemo123!",
    };

    const result = await demoDataService.installDemoData(options);

    return {
      success: result.success,
      message: result.message,
      adminCredentials: result.adminCredentials,
    };
  } catch (error) {
    console.error("Error installing quick demo:", error);
    return {
      success: false,
      message: "Failed to install quick demo data",
    };
  }
}

export async function getDemoDataSummary(): Promise<{
  success: boolean;
  summary?: {
    totalRecords: number;
    breakdown: Record<string, number>;
    lastUpdated: Date;
  };
}> {
  try {
    const {
      User,
      Property,
      Tenant,
      Lease,
      Payment,
      MaintenanceRequest,
      Message,
      Event,
      Announcement,
    } = await import("@/models");

    const [
      userCount,
      propertyCount,
      tenantCount,
      leaseCount,
      paymentCount,
      maintenanceCount,
      messageCount,
      eventCount,
      announcementCount,
    ] = await Promise.all([
      User.countDocuments(),
      Property.countDocuments(),
      Tenant.countDocuments(),
      Lease.countDocuments(),
      Payment.countDocuments(),
      MaintenanceRequest.countDocuments(),
      Message.countDocuments(),
      Event.countDocuments(),
      Announcement.countDocuments(),
    ]);

    const breakdown = {
      users: userCount,
      properties: propertyCount,
      tenants: tenantCount,
      leases: leaseCount,
      payments: paymentCount,
      maintenanceRequests: maintenanceCount,
      messages: messageCount,
      events: eventCount,
      announcements: announcementCount,
    };

    const totalRecords = Object.values(breakdown).reduce(
      (sum, count) => sum + count,
      0
    );

    // Get the most recent record to determine last updated
    const latestUser = await User.findOne()
      .sort({ createdAt: -1 })
      .select("createdAt")
      .lean();
    const lastUpdated = latestUser?.createdAt || new Date();

    return {
      success: true,
      summary: {
        totalRecords,
        breakdown,
        lastUpdated,
      },
    };
  } catch (error) {
    console.error("Error getting demo data summary:", error);
    return {
      success: false,
    };
  }
}
