"use server";

import { cookies } from "next/headers";
import { adminDb, admin } from "@/lib/firebase-admin";

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

// Action to check if Admin SDK is configured on the server
export async function checkAdminConfig() {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  const isValid = !!(
    privateKey && 
    privateKey.includes("-----BEGIN PRIVATE KEY-----") &&
    !privateKey.includes("YOUR_PRIVATE_KEY_HERE") &&
    clientEmail &&
    !clientEmail.includes("xxxxx") &&
    projectId &&
    projectId !== "YOUR_PROJECT_ID"
  );
  return isValid;
}

// Helper to wrap Firestore promises with a safety timeout
function withTimeout<T>(promise: Promise<T>, ms: number = 8000): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Délai d'attente Firestore dépassé. Veuillez vérifier que votre base de données Firestore a bien été créée sur votre console Firebase.")), ms)
    )
  ]);
}

// Action to create company profile if Cloud Function is slow or not deployed
export async function provisionCompanyProfile(uid: string, email: string, name: string) {
  try {
    const companyRef = adminDb.collection("companies").doc(uid);
    const doc = await withTimeout(companyRef.get());

    if (!doc.exists) {
      const companyData = {
        name: name || "Ma Société",
        adminEmail: email,
        adminUid: uid,
        status: "trial",
        trialStart: admin.firestore.FieldValue.serverTimestamp(),
        subscriptionEnd: null,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      };
      await withTimeout(companyRef.set(companyData));
      return { success: true, isNew: true };
    }

    return { success: true, isNew: false, data: doc.data() };
  } catch (error: any) {
    console.error("Error provisioning company profile:", error);
    return { success: false, error: error.message };
  }
}

// Action to verify and use activation key in a transaction
export async function activateLicenseKey(uid: string, rawKey: string, email: string) {
  const key = rawKey.trim().toUpperCase();
  if (!/^ELN-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(key)) {
    return { success: false, error: "Le format de la clé doit être ELN-XXXX-XXXX" };
  }

  try {
    const keyRef = adminDb.collection("activation_keys").doc(key);
    const companyRef = adminDb.collection("companies").doc(uid);

    const result = await adminDb.runTransaction(async (transaction) => {
      const keyDoc = await transaction.get(keyRef);
      const companyDoc = await transaction.get(companyRef);

      if (!keyDoc.exists) {
        throw new Error("Clé d'activation invalide ou inexistante.");
      }

      const keyData = keyDoc.data()!;
      if (keyData.status !== "unused") {
        throw new Error("Cette clé a déjà été utilisée.");
      }

      // Check if key is expired
      if (keyData.expiresAt) {
        const expiresTime = keyData.expiresAt.toDate ? keyData.expiresAt.toDate().getTime() : new Date(keyData.expiresAt).getTime();
        if (expiresTime < Date.now()) {
          throw new Error("Cette clé a expiré.");
        }
      }

      if (!companyDoc.exists) {
        throw new Error("Compte entreprise introuvable.");
      }

      // Calculate +30 days
      const thirtyDays = 30 * 24 * 60 * 60 * 1000;
      const subscriptionEnd = new Date(Date.now() + thirtyDays);

      // Update key doc
      transaction.update(keyRef, {
        status: "used",
        companyId: uid,
        usedBy: email,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Update company status and subscriptionEnd
      transaction.update(companyRef, {
        status: "active",
        subscriptionEnd: admin.firestore.Timestamp.fromDate(subscriptionEnd),
      });

      return { subscriptionEnd };
    });

    return { success: true, subscriptionEnd: result.subscriptionEnd };
  } catch (error: any) {
    console.error("Transaction failed: ", error);
    return { success: false, error: error.message };
  }
}
