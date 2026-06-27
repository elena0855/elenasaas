import * as admin from "firebase-admin";

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  if (privateKey.startsWith('"') && privateKey.endsWith('"')) {
    privateKey = privateKey.substring(1, privateKey.length - 1);
  }
  privateKey = privateKey.replace(/\\n/g, "\n");
}

const isValidKey = privateKey && privateKey.includes("-----BEGIN PRIVATE KEY-----") && !privateKey.includes("YOUR_PRIVATE_KEY_HERE");

if (!admin.apps.length) {
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && isValidKey) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: privateKey,
        }),
      });
    } catch (e) {
      console.warn("Firebase Admin failed to initialize with credentials, falling back to default/emulator:", e);
      admin.initializeApp({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "elena-saas",
      });
    }
  } else {
    // In local emulator or environment with default credentials
    admin.initializeApp({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "elena-saas",
    });
  }
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export { admin };
