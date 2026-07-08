"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onIdTokenChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db, isClientConfigured } from "./firebase";
import { setSessionCookie, provisionCompanyProfile, checkAdminConfig } from "@/app/actions/auth";

interface CompanyProfile {
  name: string;
  adminEmail: string;
  adminUid: string;
  status: "trial" | "active" | "suspended";
  trialStart: any;
  subscriptionEnd: any;
  createdAt: any;
}

interface AuthContextType {
  user: User | null;
  company: CompanyProfile | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  company: null,
  loading: true,
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // 1. Listen to Auth State changes (resolves loading quickly)
  useEffect(() => {
    if (!auth) {
      // Local/offline sandbox session checking
      const tokenCookie = document.cookie
        .split("; ")
        .find((row) => row.startsWith("token="));
      
      if (tokenCookie) {
        setUser({
          uid: "sandbox-user-123",
          email: "demo@elena.saas",
          displayName: "Société Éléna",
          getIdToken: async () => "mock-token",
          getIdTokenResult: async () => ({
            claims: { role: "admin" },
          }),
        } as any);
        setCompany({
          name: "Société Éléna (Local)",
          adminEmail: "demo@elena.saas",
          adminUid: "sandbox-user-123",
          status: "trial",
          trialStart: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          subscriptionEnd: null,
          createdAt: new Date().toISOString(),
        });
      } else {
        setUser(null);
        setCompany(null);
      }
      setLoading(false);
      return;
    }

    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          const token = await firebaseUser.getIdToken();
          
          // Set client-side cookie synchronously before setting state
          const maxAge = 60 * 60 * 24 * 7;
          document.cookie = `token=${token}; path=/; max-age=${maxAge}; SameSite=Lax; ${
            window.location.protocol === "https:" ? "Secure" : ""
          }`;

          setUser(firebaseUser);

          // Background sync Server Action
          setSessionCookie(token).catch((e) =>
            console.warn("Background cookie sync failed:", e)
          );
        } else {
          setUser(null);
          setCompany(null);
          document.cookie = "token=; path=/; max-age=0; SameSite=Lax";
          setSessionCookie(null).catch(() => {});
        }
      } catch (err) {
        console.error("Auth state change processing error:", err);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Listen to Company Profile in Firestore (runs in background, with fallbacks)
  useEffect(() => {
    if (!user || !db) {
      return;
    }

    let active = true;
    const companyRef = doc(db, "companies", user.uid);

    const unsubCompany = onSnapshot(
      companyRef,
      async (snapshot) => {
        if (!active) return;

        if (snapshot.exists()) {
          setCompany(snapshot.data() as CompanyProfile);
        } else {
          console.log("Company doc does not exist, provisioning profile in background...");
          try {
            const res = await provisionCompanyProfile(
              user.uid,
              user.email || "",
              user.displayName || "Ma Société"
            );
            if (!res.success) {
              console.error("Failed to provision company profile:", res.error);
              if (active) {
                setCompany({
                  name: user.displayName || "Ma Société",
                  adminEmail: user.email || "",
                  adminUid: user.uid,
                  status: "trial",
                  trialStart: new Date().toISOString(),
                  subscriptionEnd: null,
                  createdAt: new Date().toISOString(),
                });
              }
            }
          } catch (err) {
            console.error("Failed to provision company profile with exception:", err);
            if (active) {
              setCompany({
                name: user.displayName || "Ma Société",
                adminEmail: user.email || "",
                adminUid: user.uid,
                status: "trial",
                trialStart: new Date().toISOString(),
                subscriptionEnd: null,
                createdAt: new Date().toISOString(),
              });
            }
          }
        }
      },
      (error) => {
        console.error("Firestore company subscription error:", error);
        if (active) {
          setCompany({
            name: user.displayName || "Ma Société",
            adminEmail: user.email || "",
            adminUid: user.uid,
            status: "trial",
            trialStart: new Date().toISOString(),
            subscriptionEnd: null,
            createdAt: new Date().toISOString(),
          });
        }
      }
    );

    return () => {
      active = false;
      unsubCompany();
    };
  }, [user]);

  const logout = async () => {
    setLoading(true);
    try {
      if (auth) {
        await signOut(auth);
      } else {
        await setSessionCookie(null);
        setUser(null);
        setCompany(null);
      }
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, company, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
