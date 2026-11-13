/**
 * PropertyPro - Invoice Seed API
 * Creates sample invoices for testing the tenant invoice history feature
 */

import { demoRoute } from "@/lib/auth/route-guards";
import { NextRequest } from "next/server";
import { Invoice, Property, User, Lease } from "@/models";
import { UserRole, InvoiceStatus, InvoiceType } from "@/types";
import {
  createSuccessResponse,
  createErrorResponse,
  handleApiError,
  withRoleAndDB,
} from "@/lib/api-utils";

export const POST = demoRoute(withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      // First, let's check if we have any properties, tenants, and leases
      const properties = await Property.find().limit(5);
      const tenants = await User.find({ role: UserRole.TENANT }).limit(5);
      const leases = await Lease.find()
        .populate("tenantId")
        .populate("propertyId")
        .limit(5);




      if (
        properties.length === 0 ||
        tenants.length === 0 ||
        leases.length === 0
      ) {
        return createErrorResponse(
          "Need at least one property, tenant, and lease to create sample invoices",
          400
        );
      }

      // Create sample invoices for each lease
      const sampleInvoices = [];

      for (let i = 0; i < Math.min(leases.length, 3); i++) {
        const lease = leases[i];

        // Create multiple invoices for each lease (past, current, future)
        const invoiceData = [
          {
            invoiceNumber: `INV-2024-${String(i * 3 + 1).padStart(3, "0")}`,
            tenantId: lease.tenantId._id,
            propertyId: lease.propertyId._id,
            leaseId: lease._id,
            unitId: lease.unitId,
            issueDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000), // 60 days ago
            dueDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
            status: InvoiceStatus.PAID,
            subtotal: lease.terms?.rentAmount || 1200,
            totalAmount: lease.terms?.rentAmount || 1200,
            amountPaid: lease.terms?.rentAmount || 1200,
            balanceRemaining: 0,
            gracePeriodEnd: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000),
            lineItems: [
              {
                description: "Monthly Rent - Previous Month",
                amount: lease.terms?.rentAmount || 1200,
                type: InvoiceType.RENT,
                quantity: 1,
                unitPrice: lease.terms?.rentAmount || 1200,
              },
            ],
          },
          {
            invoiceNumber: `INV-2024-${String(i * 3 + 2).padStart(3, "0")}`,
            tenantId: lease.tenantId._id,
            propertyId: lease.propertyId._id,
            leaseId: lease._id,
            unitId: lease.unitId,
            issueDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
            dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000), // 25 days from now
            status: InvoiceStatus.ISSUED,
            subtotal: lease.terms?.rentAmount || 1200,
            totalAmount: lease.terms?.rentAmount || 1200,
            amountPaid: 0,
            balanceRemaining: lease.terms?.rentAmount || 1200,
            gracePeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            lineItems: [
              {
                description: "Monthly Rent - Current Month",
                amount: lease.terms?.rentAmount || 1200,
                type: InvoiceType.RENT,
                quantity: 1,
                unitPrice: lease.terms?.rentAmount || 1200,
              },
            ],
          },
          {
            invoiceNumber: `INV-2024-${String(i * 3 + 3).padStart(3, "0")}`,
            tenantId: lease.tenantId._id,
            propertyId: lease.propertyId._id,
            leaseId: lease._id,
            unitId: lease.unitId,
            issueDate: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000), // 45 days ago
            dueDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000), // 15 days ago (overdue)
            status: InvoiceStatus.OVERDUE,
            subtotal: (lease.terms?.rentAmount || 1200) + 50, // Add late fee
            totalAmount: (lease.terms?.rentAmount || 1200) + 50,
            amountPaid: 600, // Partial payment
            balanceRemaining: (lease.terms?.rentAmount || 1200) + 50 - 600,
            gracePeriodEnd: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            lateFeeAmount: 50,
            lateFeeAppliedDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            lineItems: [
              {
                description: "Monthly Rent - Overdue",
                amount: lease.terms?.rentAmount || 1200,
                type: InvoiceType.RENT,
                quantity: 1,
                unitPrice: lease.terms?.rentAmount || 1200,
              },
              {
                description: "Late Fee",
                amount: 50,
                type: InvoiceType.LATE_FEE,
                quantity: 1,
                unitPrice: 50,
              },
            ],
          },
        ];

        sampleInvoices.push(...invoiceData);
      }

      // Create the invoices
      const createdInvoices = [];
      for (const invoiceData of sampleInvoices) {
        try {
          const invoice = new Invoice(invoiceData);
          await invoice.save();
          createdInvoices.push(invoice);
        } catch (error) {
          console.error("Error creating invoice:", error);
          // Continue with other invoices
        }
      }

      return createSuccessResponse(
        {
          created: createdInvoices.length,
          invoices: createdInvoices.map((inv) => ({
            id: inv._id,
            invoiceNumber: inv.invoiceNumber,
            tenant: inv.tenantId,
            status: inv.status,
            amount: inv.totalAmount,
          })),
        },
        `Created ${createdInvoices.length} sample invoices`
      );
    } catch (error) {
      return handleApiError(error, "Failed to create sample invoices");
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
      const leases = await Lease.find()
        .populate("tenantId", "firstName lastName")
        .populate("propertyId", "name")
        .limit(5);
      const invoices = await Invoice.find()
        .populate("tenantId", "firstName lastName email")
        .populate("propertyId", "name address")
        .limit(10);

      return createSuccessResponse(
        {
          properties: properties.length,
          tenants: tenants.length,
          leases: leases.length,
          invoices: invoices.length,
          sampleData: {
            properties: properties.map((p) => ({ id: p._id, name: p.name })),
            tenants: tenants.map((t) => ({
              id: t._id,
              name: `${t.firstName} ${t.lastName}`,
            })),
            leases: leases.map((l) => ({
              id: l._id,
              tenant: l.tenantId
                ? `${l.tenantId.firstName} ${l.tenantId.lastName}`
                : "No tenant",
              property: l.propertyId?.name || "No property",
            })),
            invoices: invoices.map((i) => ({
              id: i._id,
              invoiceNumber: i.invoiceNumber,
              tenant: i.tenantId
                ? `${i.tenantId.firstName} ${i.tenantId.lastName}`
                : "No tenant",
              property: i.propertyId?.name || "No property",
              status: i.status,
              amount: i.totalAmount,
            })),
          },
        },
        "Sample data overview"
      );
    } catch (error) {
      return handleApiError(error, "Failed to retrieve sample data");
    }
  }
));

// DELETE endpoint to clean up test data
export const DELETE = demoRoute(withRoleAndDB([UserRole.ADMIN])(
  async (user, request: NextRequest) => {
    try {
      const result = await Invoice.deleteMany({
        invoiceNumber: { $regex: /^INV-2024-/ },
      });

      return createSuccessResponse(
        { deleted: result.deletedCount },
        `Deleted ${result.deletedCount} test invoices`
      );
    } catch (error) {
      return handleApiError(error, "Failed to delete test invoices");
    }
  }
));
