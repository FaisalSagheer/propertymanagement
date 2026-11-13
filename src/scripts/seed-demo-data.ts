/**
 * PropertyPro - Full Demo Data Seed Script
 * Creates a complete demo environment: admins, managers, tenants, properties (with units),
 * leases, payments, maintenance, messages, events, announcements, and core settings.
 *
 * Usage: npm run seed:demo-data
 */

// IMPORTANT: Load environment variables FIRST before any other imports
import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";
import connectDB from "@/lib/mongodb";
import { demoDataService } from "@/lib/services/demo-data.service";
import { migrationHelpers } from "@/lib/database/schema-updates";
import { SystemSettingsService } from "@/lib/services/settings-service";

async function main() {
  try {
    console.log("🔄 Connecting to MongoDB...");
    await connectDB();
    console.log("✅ Connected to MongoDB\n");

    const propertyCount = Number(process.env.DEMO_PROPERTY_COUNT || 5);
    const tenantCount = Number(process.env.DEMO_TENANT_COUNT || 15);

    const adminEmail = process.env.DEMO_ADMIN_EMAIL || "admin@demo.com";
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD || "DemoAdmin1234!";
    const organizationName =
      process.env.DEMO_ORG_NAME || "Demo Property Management";

    console.log("📦 Installing demo data with options:");
    console.log(
      JSON.stringify(
        {
          propertyCount,
          tenantCount,
          adminEmail,
          organizationName,
        },
        null,
        2
      )
    );
    console.log();

    const result = await demoDataService.installDemoData({
      includeUsers: true,
      includeProperties: true,
      includeTenants: true,
      includeLeases: true,
      includePayments: true,
      includeMaintenance: true,
      includeMessages: true,
      includeEvents: true,
      includeAnnouncements: true,
      propertyCount,
      tenantCount,
      organizationName,
      adminEmail,
      adminPassword,
    });

    if (!result.success) {
      console.error("❌ Failed to install demo data.");
      if (result.errors.length) {
        console.error("Errors:");
        for (const err of result.errors) {
          console.error("  -", err);
        }
      }
      // Common case: demo data already exists
      await mongoose.connection.close();
      process.exit(1);
    }

    console.log("✅ Demo data installed successfully!\n");
    console.log("📊 Entity counts:");
    console.table(result.data);

    if (result.adminCredentials) {
      console.log("👤 Admin credentials:");
      console.log("  Email:", result.adminCredentials.email);
      console.log("  Password:", result.adminCredentials.password);
      console.log();
    }

    // Initialize system-wide settings
    console.log("⚙️ Ensuring system settings are initialized...");
    const systemSettings = await SystemSettingsService.getSettings();
    console.log(
      "✅ System settings ready (ID:",
      systemSettings?._id?.toString() || "unknown",
      ")\n"
    );

    // Initialize payment system configuration
    console.log("💳 Initializing payment system configuration (if needed)...");
    await migrationHelpers.initializeSystemConfig();
    console.log("✅ Payment system configuration initialized.\n");

    console.log("🎉 Demo environment is ready!");
  } catch (error: any) {
    console.error("❌ Error running demo data seed:", error?.message || error);
    console.error(error);
    process.exit(1);
  } finally {
    // Always try to close the connection gracefully
    try {
      await mongoose.connection.close();
      // eslint-disable-next-line no-console
      console.log("\n✅ MongoDB connection closed");
    } catch (e) {
      console.error("⚠️ Error while closing MongoDB connection:", e);
    }

    process.exit(0);
  }
}

main();

