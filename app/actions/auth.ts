"use server";

import { cookies } from "next/headers";
import { query, getPool } from "@/lib/pg";

// Action to set session token cookie
export async function setSessionCookie(token: string | null) {
  const cookieStore = await cookies();
  if (token) {
    cookieStore.set("token", token, {
      path: "/",
      httpOnly: false, // Accessible by client scripts to sync, but middleware reads it
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 7, // 7 days
      sameSite: "lax",
    });
  } else {
    cookieStore.set("token", "", {
      path: "/",
      maxAge: 0,
    });
  }
}

// Action to check if database is configured on the server
export async function checkAdminConfig() {
  const hasDb = !!process.env.DATABASE_URL;
  return hasDb;
}

// Action to create company profile in PostgreSQL
export async function provisionCompanyProfile(uid: string, email: string, name: string) {
  try {
    const checkRes = await query("SELECT * FROM companies WHERE id = $1", [uid]);

    if (checkRes.rows.length === 0) {
      const insertRes = await query(
        `INSERT INTO companies (id, name, admin_email, admin_uid, status, trial_start, subscription_end)
         VALUES ($1, $2, $3, $4, 'trial', NOW(), NULL)
         RETURNING *`,
        [uid, name || "Ma Société", email, uid]
      );
      return { success: true, isNew: true, data: insertRes.rows[0] };
    }

    return { success: true, isNew: false, data: checkRes.rows[0] };
  } catch (error: any) {
    console.error("Error provisioning company profile:", error);
    return { success: false, error: error.message };
  }
}

// Action to verify and use activation key in a PostgreSQL transaction
export async function activateLicenseKey(uid: string, rawKey: string, email: string) {
  const key = rawKey.trim().toUpperCase();
  if (!/^ELN-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
    return { success: false, error: "Le format de la clé doit être ELN-XXXX-XXXX" };
  }

  const pool = getPool();
  if (!pool) return { success: false, error: "Base de données non connectée" };

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const keyRes = await client.query("SELECT * FROM activation_keys WHERE key = $1", [key]);
    if (keyRes.rows.length === 0) {
      throw new Error("Clé d'activation invalide ou inexistante.");
    }

    const keyData = keyRes.rows[0];
    if (keyData.status !== "unused") {
      throw new Error("Cette clé a déjà été utilisée.");
    }

    if (keyData.expires_at && new Date(keyData.expires_at).getTime() < Date.now()) {
      throw new Error("Cette clé a expiré.");
    }

    const companyRes = await client.query("SELECT * FROM companies WHERE id = $1", [uid]);
    if (companyRes.rows.length === 0) {
      throw new Error("Compte entreprise introuvable.");
    }

    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const subscriptionEnd = new Date(Date.now() + thirtyDays);

    await client.query(
      `UPDATE activation_keys 
       SET status = 'used', company_id = $1, used_by = $2, used_at = NOW()
       WHERE key = $3`,
      [uid, email, key]
    );

    await client.query(
      `UPDATE companies
       SET status = 'active', subscription_end = $1
       WHERE id = $2`,
      [subscriptionEnd, uid]
    );

    await client.query("COMMIT");
    return { success: true, subscriptionEnd };
  } catch (error: any) {
    await client.query("ROLLBACK");
    console.error("License key activation transaction failed:", error);
    return { success: false, error: error.message };
  } finally {
    client.release();
  }
}
