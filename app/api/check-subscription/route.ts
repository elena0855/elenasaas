import { NextResponse } from "next/server";
import { query } from "@/lib/pg";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    
    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    // 1. Check if super admin
    const adminCheck = await query(
      "SELECT * FROM super_admins WHERE uid = $1",
      [uid]
    );
    const isSuperAdmin = adminCheck.rows.length > 0;

    // 2. Fetch company status
    const res = await query(
      "SELECT status, trial_start, subscription_end FROM companies WHERE id = $1",
      [uid]
    );

    if (res.rows.length === 0) {
      // If company doesn't exist, return default trial values (fallback)
      return NextResponse.json({
        status: "trial",
        trialStart: new Date().toISOString(),
        subscriptionEnd: null,
        role: isSuperAdmin ? "super_admin" : "user",
      });
    }

    const company = res.rows[0];
    return NextResponse.json({
      status: company.status,
      trialStart: new Date(company.trial_start).toISOString(),
      subscriptionEnd: company.subscription_end ? new Date(company.subscription_end).toISOString() : null,
      role: isSuperAdmin ? "super_admin" : "user",
    });
  } catch (error: any) {
    console.error("Error in check-subscription API:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
