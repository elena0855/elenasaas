"use server";

import { adminDb, admin } from "@/lib/firebase-admin";

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
    const snap = await adminDb.collection("companies").orderBy("createdAt", "desc").get();
    return snap.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name || "",
        adminEmail: data.adminEmail || "",
        adminUid: data.adminUid || "",
        status: data.status || "trial",
        trialStart: data.trialStart ? (data.trialStart.toDate ? data.trialStart.toDate().toISOString() : data.trialStart) : null,
        subscriptionEnd: data.subscriptionEnd ? (data.subscriptionEnd.toDate ? data.subscriptionEnd.toDate().toISOString() : data.subscriptionEnd) : null,
        createdAt: data.createdAt ? (data.createdAt.toDate ? data.createdAt.toDate().toISOString() : data.createdAt) : null,
      };
    });
  } catch (error) {
    console.error("Error fetching companies:", error);
    return [];
  }
}

// Generate new activation key
export async function createActivationKey() {
  const key = generateRandomKey();
  const keyRef = adminDb.collection("activation_keys").doc(key);
  const thirtyDays = 30 * 24 * 60 * 60 * 1000;
  const expiresAt = new Date(Date.now() + thirtyDays);

  try {
    await keyRef.set({
      key: key,
      companyId: null,
      status: "unused",
      usedBy: null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: admin.firestore.Timestamp.fromDate(expiresAt),
    });
    return { success: true, key };
  } catch (error: any) {
    console.error("Error creating key:", error);
    return { success: false, error: error.message };
  }
}

// Suspend company
export async function suspendCompany(companyId: string) {
  try {
    const companyRef = adminDb.collection("companies").doc(companyId);
    await companyRef.update({
      status: "suspended",
    });
    return { success: true };
  } catch (error: any) {
    console.error("Error suspending company:", error);
    return { success: false, error: error.message };
  }
}

// Reactivate company (adds 30 days to subscriptionEnd)
export async function reactivateCompany(companyId: string) {
  try {
    const companyRef = adminDb.collection("companies").doc(companyId);
    const docSnap = await companyRef.get();

    if (!docSnap.exists) {
      return { success: false, error: "Company doc not found" };
    }

    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    const subscriptionEnd = new Date(Date.now() + thirtyDays);

    await companyRef.update({
      status: "active",
      subscriptionEnd: admin.firestore.Timestamp.fromDate(subscriptionEnd),
    });

    return { success: true, subscriptionEnd };
  } catch (error: any) {
    console.error("Error reactivating company:", error);
    return { success: false, error: error.message };
  }
}
