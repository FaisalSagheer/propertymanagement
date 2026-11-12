/**
 * PropertyPro - Delete one user by email (safe by default)
 *
 * Built for removing the seeded demo accounts (e.g. admin@demo.com) from a live
 * database. Reads MONGODB_URI from .env.local.
 *
 * USAGE
 *   node scripts/delete-user.js admin@demo.com            # dry run, writes nothing
 *   APPLY=1 node scripts/delete-user.js admin@demo.com    # actually delete
 *
 * What it does
 *   - Looks up exactly one user by email (case-insensitive). Nothing else is
 *     matched, so it cannot delete more than that one account.
 *   - Refuses to delete the LAST active admin (set FORCE=1 to override), so you
 *     cannot lock yourself out of the app.
 *   - Reports records that point at the user (properties, manager accounts,
 *     subscriptions) so you can see what would be left orphaned. It does NOT
 *     delete those.
 *   - On APPLY, deletes the user plus that user's Auth.js sessions and linked
 *     OAuth accounts, so any signed-in session for it stops working.
 *
 * Make sure you have created your own real admin account BEFORE removing a demo
 * one.
 */

const mongoose = require("mongoose");
require("dotenv").config({ path: ".env.local", quiet: true });

const APPLY = process.env.APPLY === "1";
const FORCE = process.env.FORCE === "1";
const email = (process.argv[2] || "").trim().toLowerCase();

async function main() {
  if (!email || !email.includes("@")) {
    console.error("Usage: node scripts/delete-user.js <email>");
    process.exitCode = 1;
    return;
  }
  if (!process.env.MONGODB_URI) {
    console.error("MONGODB_URI is not set (expected in .env.local)");
    process.exitCode = 1;
    return;
  }

  await mongoose.connect(process.env.MONGODB_URI, {
    serverSelectionTimeoutMS: 15000,
  });
  const db = mongoose.connection.db;
  console.log(`Connected to database "${db.databaseName}"`);

  const users = db.collection("users");
  const user = await users.findOne({ email });
  if (!user) {
    console.log(`No user found with email ${email} - nothing to do.`);
    return;
  }

  console.log(
    `Found: ${user.firstName || ""} ${user.lastName || ""} <${user.email}>  role=${user.role}  active=${user.isActive}  created=${user.createdAt ? new Date(user.createdAt).toISOString() : "unknown"}`
  );

  // Never remove the last way into the app.
  if (user.role === "admin") {
    const otherAdmins = await users.countDocuments({
      role: "admin",
      isActive: { $ne: false },
      deletedAt: null,
      _id: { $ne: user._id },
    });
    console.log(`Other active admins: ${otherAdmins}`);
    if (otherAdmins === 0 && !FORCE) {
      console.error(
        "REFUSING: this is the only active admin. Create another admin first (or set FORCE=1 if you are sure)."
      );
      process.exitCode = 1;
      return;
    }
  }

  // Things that reference this user and would be left behind.
  const id = user._id;
  const refs = {
    "properties (owner/manager/agent)": await db
      .collection("properties")
      .countDocuments({ $or: [{ ownerId: id }, { managerId: id }, { assignedAgentId: id }] }),
    "manager accounts": await db.collection("manageraccounts").countDocuments({ managerUserId: id }),
    subscriptions: await db.collection("subscriptions").countDocuments({ userId: id }),
  };
  const sessions = await db.collection("sessions").countDocuments({ userId: id });
  const accounts = await db.collection("accounts").countDocuments({ userId: id });
  console.log("Records pointing at this user (NOT deleted):", refs);
  console.log(`Will also remove: ${sessions} session(s), ${accounts} linked OAuth account(s)`);

  if (!APPLY) {
    console.log("\nDRY RUN - nothing deleted. Re-run with APPLY=1 to delete.");
    return;
  }

  await db.collection("sessions").deleteMany({ userId: id });
  await db.collection("accounts").deleteMany({ userId: id });
  const res = await users.deleteOne({ _id: id });
  console.log(`\nDeleted ${res.deletedCount} user (${email}).`);
}

main()
  .catch((err) => {
    console.error("Failed:", String(err && err.message ? err.message : err).replace(/\/\/[^@\s]*@/g, "//***@"));
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
