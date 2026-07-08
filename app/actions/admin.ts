"use server";

import { query } from "@/lib/pg";

interface CompanyData {
  id: string;
  name: string;
  adminEmail: string;
  adminUid: string;
  status: "trial" | "active" | "suspended";
  trialStart: any;
  subscriptionEnd: any;
  createdAt: any;
}

// Generate a random key: ELN-XXXX-XXXX
function generateRandomKey() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const genPart = () =>
    Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `ELN-${genPart()}-${genPart()}`;
}

// Fetch all companies
export async function getAllCompanies(): Promise<CompanyData[]> {
  try {
    const res = await query("SELECT * FROM companies ORDER BY created_at DESC");
    return res.rows.map((c) => ({
      id: c.id,
      name: c.name,
      adminEmail: c.admin_email,
      adminUid: c.admin_uid,
      status: c.status as any,
      trialStart: c.trial_start ? new Date(c.trial_start).toISOString() : null,
      subscriptionEnd: c.subscription_end ? new Date(c.subscription_end).toISOString() : null,
      createdAt: c.created_at ? new Date(c.created_at).toISOString() : null,
    }));
  } catch (error) {
    console.error("Error fetching companies:", error);
    return [];
  }
}

// Generate new activation key
export async function createActivationKey() {
  const key = generateRandomKey();
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + thirtyDays);

  try {
    await query(
      `INSERT INTO activation_keys (key, company_id, status, used_by, expires_at)
       VALUES ($1, NULL, 'unused', NULL, $2)`,
      [key, expiresAt]
    );
    return { success: true, key };
  } catch (error: any) {
    console.error("Error creating key:", error);
    return { success: false, error: error.message };
  }
}

// Suspend company
export async function suspendCompany(companyId: string) {
  try {
    await query("UPDATE companies SET status = 'suspended', updated_at = NOW() WHERE id = $1", [companyId]);
    return { success: true };
  } catch (error: any) {
    console.error("Error suspending company:", error);
    return { success: false, error: error.message };
  }
}

// Reactivate company (adds 30 days to subscriptionEnd)
export async function reactivateCompany(companyId: string) {
  try {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const subscriptionEnd = new Date(Date.now() + thirtyDays);

    await query(
      "UPDATE companies SET status = 'active', subscription_end = $1, updated_at = NOW() WHERE id = $2",
      [subscriptionEnd, companyId]
    );

    return { success: true, subscriptionEnd };
  } catch (error: any) {
    console.error("Error reactivating company:", error);
    return { success: false, error: error.message };
  }
}

// Check if user is a super admin
export async function checkSuperAdmin(uid: string, email?: string): Promise<boolean> {
  if (email === "admin@elena.saas") return true;
  try {
    const res = await query("SELECT * FROM super_admins WHERE uid = $1", [uid]);
    return res.rows.length > 0;
  } catch (error) {
    console.error("Error checking super admin status:", error);
    return false;
  }
}
