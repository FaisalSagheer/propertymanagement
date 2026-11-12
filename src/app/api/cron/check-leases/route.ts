import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { leaseExpirationService } from "@/lib/services/lease-expiration.service";
import { checkCronAuth } from "@/lib/auth/cron-auth";

export async function GET(req: Request) {
  // Authorise before touching the database or doing any work.
  const denied = checkCronAuth(req);
  if (denied) return denied;

  try {
    await connectToDatabase();

    const result = await leaseExpirationService.checkAndExpireLeases();

    return NextResponse.json({
      success: true,
      message: "Lease expiration check completed",
      data: result,
    });
  } catch (error: any) {
    console.error("Error in lease expiration cron:", error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
