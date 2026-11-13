/**
 * PropertyPro - Maintenance Seed API
 * Creates sample maintenance requests for testing
 */

import { demoRoute } from "@/lib/auth/route-guards";
import { NextRequest } from "next/server";
import { MaintenanceRequest, Property, Tenant, User } from "@/models";
import { UserRole, MaintenancePriority, MaintenanceStatus } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";

export const POST = demoRoute(withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      // First, let's check if we have any properties and tenant users
      const properties = await Property.find().limit(5);
      const tenants = await User.find({ role: UserRole.TENANT }).limit(5);



      if (properties.length === 0 || tenants.length === 0) {
        return createErrorResponse(
          "Need at least one property and one tenant to create sample maintenance requests",
          400
        );
      }

      // Create sample maintenance requests
      const sampleRequests = [
        {
          propertyId: properties[0]._id,
          tenantId: tenants[0]._id,
          title: "Leaky Faucet in Kitchen",
          description:
            "The kitchen faucet has been dripping constantly for the past week. It's wasting water and making noise at night.",
          priority: MaintenancePriority.MEDIUM,
          status: MaintenanceStatus.SUBMITTED,
          category: "Plumbing",
          estimatedCost: 150,
        },
        {
          propertyId: properties[0]._id,
          tenantId: tenants[0]._id,
          title: "Broken Air Conditioning",
          description:
            "The AC unit stopped working yesterday. It's getting very hot in the apartment.",
          priority: MaintenancePriority.HIGH,
          status: MaintenanceStatus.SUBMITTED,
          category: "HVAC",
          estimatedCost: 300,
        },
      ];

      // Add more requests if we have more properties/tenants
      if (properties.length > 1 && tenants.length > 1) {
        sampleRequests.push({
          propertyId: properties[1]._id,
          tenantId: tenants[1]._id,
          title: "Electrical Outlet Not Working",
          description:
            "The outlet in the living room stopped working. Need an electrician to check it.",
          priority: MaintenancePriority.MEDIUM,
          status: MaintenanceStatus.ASSIGNED,
          category: "Electrical",
          estimatedCost: 100,
        });
      }

      // Create the maintenance requests
      const createdRequests = [];
      for (const requestData of sampleRequests) {
        const maintenanceRequest = new MaintenanceRequest(requestData);
        await maintenanceRequest.save();
        createdRequests.push(maintenanceRequest);
      }

      return createSuccessResponse(
        {
          created: createdRequests.length,
          requests: createdRequests,
        },
        `Created ${createdRequests.length} sample maintenance requests`
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
));

// GET endpoint to check existing data
export const GET = demoRoute(withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      const properties = await Property.find().select("name address").limit(5);
      const tenants = await User.find({ role: UserRole.TENANT })
        .select("firstName lastName email")
        .limit(5);
      const maintenanceRequests = await MaintenanceRequest.find()
        .populate("propertyId", "name address")
        .populate("tenantId", "firstName lastName email")
        .limit(5);

      return createSuccessResponse(
        {
          properties: properties.length,
          tenants: tenants.length,
          maintenanceRequests: maintenanceRequests.length,
          sampleData: {
            properties: properties.map((p) => ({ id: p._id, name: p.name })),
            tenants: tenants.map((t) => ({
              id: t._id,
              user: `${t.firstName} ${t.lastName}`,
            })),
            maintenanceRequests: maintenanceRequests.map((r) => ({
              id: r._id,
              title: r.title,
              property: r.propertyId?.name || "No property",
              tenant: r.tenantId
                ? `${r.tenantId.firstName} ${r.tenantId.lastName}`
                : "No tenant",
            })),
          },
        },
        "Database status retrieved"
      );
    } catch (error) {
      return handleApiError(error);
    }
  }
));
