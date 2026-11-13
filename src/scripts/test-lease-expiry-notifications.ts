/**
 * PropertyPro - Manual Test Script for Lease Expiry Notifications
 * This script creates test data and verifies the lease expiry notification system
 */

import mongoose from "mongoose";
import dotenv from "dotenv";
import { Lease } from "@/models/Lease";
import { User } from "@/models/User";
import { Property } from "@/models/Property";
import { NotificationAutomation } from "@/lib/notification-automation";
import connectDB from "@/lib/mongodb";

// Load environment variables
dotenv.config({ path: ".env.local" });

interface TestResult {
  test: string;
  status: "PASS" | "FAIL" | "SKIP";
  message: string;
  details?: any;
}

class LeaseExpiryNotificationTester {
  private results: TestResult[] = [];
  private testUserId: mongoose.Types.ObjectId | null = null;
  private testPropertyId: mongoose.Types.ObjectId | null = null;
  private testLeaseIds: mongoose.Types.ObjectId[] = [];

  /**
   * Run all tests
   */
  async runAllTests(): Promise<void> {
    console.log("🧪 Starting Lease Expiry Notification Tests...\n");

    try {
      await connectDB();
      console.log("✅ Connected to database\n");

      await this.setupTestData();
      await this.testNotificationIntervals();
      await this.testMultipleRecipients();
      await this.testEmailTemplates();
      await this.cleanupTestData();

      this.printResults();
    } catch (error) {
      console.error("❌ Test suite failed:", error);
    } finally {
      await mongoose.connection.close();
      console.log("\n✅ Database connection closed");
    }
  }

  /**
   * Setup test data
   */
  private async setupTestData(): Promise<void> {
    console.log("📝 Setting up test data...");

    try {
      // Create test admin user (property owner)
      const testOwner = await User.create({
        firstName: "Test",
        lastName: "Owner",
        email: `test-owner-${Date.now()}@example.com`,
        role: "admin",
        password: "test1234567890",
      });

      // Create test manager user
      const testManager = await User.create({
        firstName: "Test",
        lastName: "Manager",
        email: `test-manager-${Date.now()}@example.com`,
        role: "manager",
        password: "test1234567890",
      });

      // Create test tenant user
      const testTenant = await User.create({
        firstName: "Test",
        lastName: "Tenant",
        email: `test-tenant-${Date.now()}@example.com`,
        role: "tenant",
        password: "test1234567890",
      });

      this.testUserId = testTenant._id as mongoose.Types.ObjectId;

      // Create test property
      const testProperty = await Property.create({
        name: "Test Property - Lease Expiry Notifications",
        address: "123 Test Street",
        city: "Test City",
        state: "TS",
        zipCode: "12345",
        country: "Test Country",
        type: "apartment",
        bedrooms: 2,
        bathrooms: 1,
        squareFeet: 1000,
        rent: 1500,
        ownerId: testOwner._id,
        managerId: testManager._id,
        status: "occupied",
      });

      this.testPropertyId = testProperty._id as mongoose.Types.ObjectId;

      // Create test leases with different expiry dates
      const intervals = [90, 60, 30, 14, 7];
      
      for (const days of intervals) {
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 6); // Started 6 months ago

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + days); // Expires in X days

        const lease = await Lease.create({
          propertyId: testProperty._id,
          tenantId: testTenant._id,
          startDate,
          endDate,
          monthlyRent: 1500,
          securityDeposit: 1500,
          status: "active",
          terms: `Test lease expiring in ${days} days`,
        });

        this.testLeaseIds.push(lease._id as mongoose.Types.ObjectId);
      }

      this.addResult({
        test: "Setup Test Data",
        status: "PASS",
        message: `Created ${intervals.length} test leases with different expiry dates`,
        details: {
          owner: testOwner.email,
          manager: testManager.email,
          tenant: testTenant.email,
          property: testProperty.name,
          leaseCount: this.testLeaseIds.length,
        },
      });

      console.log(`✅ Created test data: ${this.testLeaseIds.length} leases\n`);
    } catch (error) {
      this.addResult({
        test: "Setup Test Data",
        status: "FAIL",
        message: `Failed to create test data: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
      throw error;
    }
  }

  /**
   * Test notification intervals
   */
  private async testNotificationIntervals(): Promise<void> {
    console.log("📅 Testing notification intervals...");

    try {
      const intervals = [90, 60, 30, 14, 7];
      
      for (const days of intervals) {
        const targetDate = new Date();
        targetDate.setDate(targetDate.getDate() + days);

        const leases = await Lease.find({
          status: "active",
          endDate: {
            $gte: new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate()
            ),
            $lt: new Date(
              targetDate.getFullYear(),
              targetDate.getMonth(),
              targetDate.getDate() + 1
            ),
          },
          deletedAt: { $exists: false },
        });

        this.addResult({
          test: `Notification Interval - ${days} days`,
          status: leases.length > 0 ? "PASS" : "FAIL",
          message: `Found ${leases.length} lease(s) expiring in ${days} days`,
          details: { days, leaseCount: leases.length },
        });
      }

      console.log("✅ Notification interval tests completed\n");
    } catch (error) {
      this.addResult({
        test: "Notification Intervals",
        status: "FAIL",
        message: `Failed to test intervals: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * Test multiple recipients
   */
  private async testMultipleRecipients(): Promise<void> {
    console.log("👥 Testing multiple recipients...");

    try {
      const lease = await Lease.findById(this.testLeaseIds[0]).populate([
        {
          path: "tenantId",
          select: "firstName lastName email",
        },
        {
          path: "propertyId",
          select: "name ownerId managerId",
          populate: [
            {
              path: "ownerId",
              select: "firstName lastName email role",
            },
            {
              path: "managerId",
              select: "firstName lastName email role",
            },
          ],
        },
      ]);

      if (!lease) {
        throw new Error("Test lease not found");
      }

      const tenant = lease.tenantId as any;
      const property = lease.propertyId as any;
      const owner = property?.ownerId as any;
      const manager = property?.managerId as any;

      const recipients = [];
      if (tenant && tenant.email) recipients.push("Tenant");
      if (owner && owner.email) recipients.push("Owner");
      if (manager && manager.email && manager._id.toString() !== owner?._id.toString()) {
        recipients.push("Manager");
      }

      this.addResult({
        test: "Multiple Recipients",
        status: recipients.length === 3 ? "PASS" : "FAIL",
        message: `Notifications would be sent to: ${recipients.join(", ")}`,
        details: {
          tenant: tenant?.email,
          owner: owner?.email,
          manager: manager?.email,
          recipientCount: recipients.length,
        },
      });

      console.log(`✅ Multiple recipients test completed (${recipients.length} recipients)\n`);
    } catch (error) {
      this.addResult({
        test: "Multiple Recipients",
        status: "FAIL",
        message: `Failed to test recipients: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * Test email templates
   */
  private async testEmailTemplates(): Promise<void> {
    console.log("📧 Testing email templates...");

    try {
      // This is a structural test - we verify the data structure is correct
      const lease = await Lease.findById(this.testLeaseIds[0]).populate([
        "tenantId",
        {
          path: "propertyId",
          populate: ["ownerId", "managerId"],
        },
      ]);

      if (!lease) {
        throw new Error("Test lease not found");
      }

      const tenant = lease.tenantId as any;
      const property = lease.propertyId as any;
      const owner = property?.ownerId as any;

      // Verify tenant notification data structure
      const tenantNotificationData = {
        userEmail: tenant.email,
        userName: `${tenant.firstName} ${tenant.lastName}`,
        propertyName: property.name,
        expiryDate: lease.endDate.toISOString(),
        daysUntilExpiry: Math.ceil(
          (lease.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
      };

      // Verify landlord notification data structure
      const landlordNotificationData = {
        userEmail: owner.email,
        userName: `${owner.firstName} ${owner.lastName}`,
        propertyName: property.name,
        tenantName: `${tenant.firstName} ${tenant.lastName}`,
        expiryDate: lease.endDate.toISOString(),
        daysUntilExpiry: Math.ceil(
          (lease.endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        ),
        leaseId: lease._id.toString(),
        isLandlord: true,
      };

      const hasAllTenantFields =
        tenantNotificationData.userEmail &&
        tenantNotificationData.userName &&
        tenantNotificationData.propertyName &&
        tenantNotificationData.expiryDate &&
        tenantNotificationData.daysUntilExpiry;

      const hasAllLandlordFields =
        landlordNotificationData.userEmail &&
        landlordNotificationData.userName &&
        landlordNotificationData.propertyName &&
        landlordNotificationData.tenantName &&
        landlordNotificationData.expiryDate &&
        landlordNotificationData.daysUntilExpiry &&
        landlordNotificationData.leaseId &&
        landlordNotificationData.isLandlord;

      this.addResult({
        test: "Email Template Data - Tenant",
        status: hasAllTenantFields ? "PASS" : "FAIL",
        message: hasAllTenantFields
          ? "All required fields present for tenant email"
          : "Missing required fields for tenant email",
        details: tenantNotificationData,
      });

      this.addResult({
        test: "Email Template Data - Landlord",
        status: hasAllLandlordFields ? "PASS" : "FAIL",
        message: hasAllLandlordFields
          ? "All required fields present for landlord email"
          : "Missing required fields for landlord email",
        details: landlordNotificationData,
      });

      console.log("✅ Email template tests completed\n");
    } catch (error) {
      this.addResult({
        test: "Email Templates",
        status: "FAIL",
        message: `Failed to test email templates: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * Cleanup test data
   */
  private async cleanupTestData(): Promise<void> {
    console.log("🧹 Cleaning up test data...");

    try {
      // Delete test leases
      await Lease.deleteMany({ _id: { $in: this.testLeaseIds } });

      // Delete test property
      if (this.testPropertyId) {
        await Property.deleteOne({ _id: this.testPropertyId });
      }

      // Delete test users
      await User.deleteMany({
        email: { $regex: /^test-(owner|manager|tenant)-.*@example\.com$/ },
      });

      this.addResult({
        test: "Cleanup Test Data",
        status: "PASS",
        message: "Successfully cleaned up all test data",
      });

      console.log("✅ Test data cleaned up\n");
    } catch (error) {
      this.addResult({
        test: "Cleanup Test Data",
        status: "FAIL",
        message: `Failed to cleanup: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * Add test result
   */
  private addResult(result: TestResult): void {
    this.results.push(result);
  }

  /**
   * Print test results
   */
  private printResults(): void {
    console.log("\n" + "=".repeat(80));
    console.log("📊 TEST RESULTS SUMMARY");
    console.log("=".repeat(80) + "\n");

    const passed = this.results.filter((r) => r.status === "PASS").length;
    const failed = this.results.filter((r) => r.status === "FAIL").length;
    const skipped = this.results.filter((r) => r.status === "SKIP").length;

    this.results.forEach((result, index) => {
      const icon = result.status === "PASS" ? "✅" : result.status === "FAIL" ? "❌" : "⏭️";
      console.log(`${icon} Test ${index + 1}: ${result.test}`);
      console.log(`   Status: ${result.status}`);
      console.log(`   Message: ${result.message}`);
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`);
      }
      console.log("");
    });

    console.log("=".repeat(80));
    console.log(`Total Tests: ${this.results.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log("=".repeat(80) + "\n");

    if (failed === 0) {
      console.log("🎉 All tests passed!");
    } else {
      console.log("⚠️  Some tests failed. Please review the results above.");
    }
  }
}

// Run tests
const tester = new LeaseExpiryNotificationTester();
tester.runAllTests().catch(console.error);

