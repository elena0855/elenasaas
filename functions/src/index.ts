import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import * as path from "path";

admin.initializeApp();

// Firestore trigger: auto-create company profile when user signs up
export const onUserCreate = functions.auth.user().onCreate(async (user: any) => {
  const uid = user.uid;
  const email = user.email || "";
  const displayName = user.displayName || "Ma Société";

  const companyRef = admin.firestore().collection("companies").doc(uid);

  const companyData = {
    name: displayName,
    adminEmail: email,
    adminUid: uid,
    status: "trial",
    trialStart: admin.firestore.FieldValue.serverTimestamp(),
    subscriptionEnd: null,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  };

  try {
    await companyRef.set(companyData);
    console.log(`Successfully created company profile for user: ${uid}`);
  } catch (error) {
    console.error("Error creating company document:", error);
  }
});


