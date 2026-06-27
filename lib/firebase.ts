import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, getRedirectResult } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from "firebase/firestore";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const isClientConfigured = 
  !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
  process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "YOUR_API_KEY" &&
  !process.env.NEXT_PUBLIC_FIREBASE_API_KEY.includes("PLACEHOLDER");

let app: any = null;
let auth: any = null;
let db: any = null;

if (isClientConfigured) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    auth = getAuth(app);
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({tabManager: persistentMultipleTabManager()})
    });
  } catch (error) {
    console.error("Firebase SDK initialization failed:", error);
  }
}

const googleProvider = new GoogleAuthProvider();
if (auth) {
  googleProvider.setCustomParameters({ prompt: "select_account" });
}

export const signInWithGoogle = async () => {
  if (!auth) {
    throw new Error("Firebase Auth n'est pas configuré.");
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result;
  } catch (error: any) {
    // Ignore popup closed by user
    if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
      return null;
    }
    console.error("Error signing in with Google:", error);
    throw error;
  }
};

// Handle pending redirect result (fallback for redirect-based flows)
export const handleRedirectResult = async () => {
  if (!auth) return null;
  try {
    const result = await getRedirectResult(auth);
    return result;
  } catch (error) {
    console.error("Redirect result error:", error);
    return null;
  }
};

export { app, auth, db, isClientConfigured };
