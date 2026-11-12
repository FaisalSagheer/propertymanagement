/**
 * PropertyPro - Seed demo data during the build (opt-in, safe to re-run)
 *
 * Runs automatically after `npm run build` (see the "postbuild" script).
 * It does nothing unless SEED_ON_BUILD=true, and it NEVER fails the build.
 *
 * Safety rules:
 *  - Skips unless SEED_ON_BUILD=true.
 *  - Skips if MONGODB_URI is missing.
 *  - Refuses to run without DEMO_ADMIN_PASSWORD (the built-in default is public).
 *  - Skips if the database already has any users, so existing data is never touched.
 *  - Never prints the admin password.
 *
 * Optional env: DEMO_ADMIN_EMAIL, DEMO_ORG_NAME, DEMO_PROPERTY_COUNT, DEMO_TENANT_COUNT
 */

import dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";

const log = (msg: string) => console.log(`[seed-on-build] ${msg}`);

async function main() {
  if (process.env.SEED_ON_BUILD !== "true") {
    log("SEED_ON_BUILD is not 'true' - skipping.");
    return;
  }
  if (!process.env.MONGODB_URI) {
    log("MONGODB_URI is not set - skipping.");
    return;
  }
  const adminPassword = process.env.DEMO_ADMIN_PASSWORD;
  if (!adminPassword) {
    log("DEMO_ADMIN_PASSWORD is not set - skipping (refusing to use a default password).");
    return;
  }

  // Import after the guards so a skipped run never touches the database layer.
  const { default: connectDB } = await import("@/lib/mongodb");
  const { User } = await import("@/models");
  const { demoDataService } = await import("@/lib/services/demo-data.service");
  const { migrationHelpers } = await import("@/lib/database/schema-updates");
  const { SystemSettingsService } = await import("@/lib/services/settings-service");

  log("Connecting to MongoDB...");
  await connectDB();

  const existingUsers = await User.countDocuments();
  if (existingUsers > 0) {
    log(`Database already has ${existingUsers} user(s) - skipping to protect existing data.`);
    return;
  }

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
    propertyCount: Number(process.env.DEMO_PROPERTY_COUNT || 5),
    tenantCount: Number(process.env.DEMO_TENANT_COUNT || 15),
    organizationName: process.env.DEMO_ORG_NAME || "Demo Property Management",
    adminEmail: process.env.DEMO_ADMIN_EMAIL || "admin@demo.com",
    adminPassword,
  });

  if (!result.success) {
    log(`Seeding did not complete: ${result.errors.join("; ") || "unknown error"}`);
    return;
  }

  await SystemSettingsService.getSettings();
  await migrationHelpers.initializeSystemConfig();

  log("Demo data installed:");
  console.table(result.data);
  log(`Admin login: ${process.env.DEMO_ADMIN_EMAIL || "admin@demo.com"} (password from DEMO_ADMIN_PASSWORD)`);
}

main()
  .catch((err) => {
    // A seeding problem must never break a deployment.
    console.error("[seed-on-build] Failed (build continues):", err?.message || err);
  })
  .finally(async () => {
    try {
      await mongoose.connection.close();
    } catch {
      /* ignore */
    }
    process.exit(0);
  });
