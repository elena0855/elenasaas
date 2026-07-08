"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { LogIn, Sparkles } from "lucide-react";
import {
  signInWithGoogle,
  handleRedirectResult,
  auth,
  isClientConfigured,
} from "@/lib/firebase";
import { setSessionCookie } from "@/app/actions/auth";
import { checkSuperAdmin } from "@/app/actions/admin";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/index";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  // Entrance animation
  useEffect(() => {
    setTimeout(() => setVisible(true), 50);
  }, []);

  // Handle pending redirect result (for any legacy redirect flows)
  useEffect(() => {
    handleRedirectResult().catch(() => {});
  }, []);

  // Redirect authenticated users
  useEffect(() => {
    if (!authLoading && user) {
      doRedirect();
    }
  }, [user, authLoading]);

  const doRedirect = async () => {
    try {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        const isSuperAdmin = await checkSuperAdmin(currentUser.uid, currentUser.email || "");
        if (isSuperAdmin) {
          router.replace("/admin/companies");
          return;
        }
      }
      router.replace("/app/dashboard");
    } catch {
      router.replace("/app/dashboard");
    }
  };

  // Demo mode login (no Firebase)
  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const mockHeader = btoa(
        JSON.stringify({ alg: "HS256", typ: "JWT" })
      ).replace(/=/g, "");
      const mockPayload = btoa(
        JSON.stringify({
          sub: "sandbox-user-123",
          email: "demo@elena.saas",
          role: "admin",
        })
      ).replace(/=/g, "");
      const mockToken = `${mockHeader}.${mockPayload}.signature`;
      await setSessionCookie(mockToken);
      // Use window.location for a hard navigation after cookie is set
      window.location.href = "/app/dashboard";
    } catch (err: any) {
      setError("Erreur lors de la connexion démo.");
      setLoading(false);
    }
  };

  // Google Popup login (avoids redirect timing issues)
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithGoogle();

      if (!result) {
        // Popup was closed by user
        setLoading(false);
        return;
      }

      // Get the token from the signed-in user
      const token = await result.user.getIdToken();

      // Set the session cookie BEFORE navigating
      await setSessionCookie(token);

      // Now navigate — cookie is guaranteed to exist
      const isSuperAdmin = await checkSuperAdmin(result.user.uid, result.user.email || "");

      if (isSuperAdmin) {
        window.location.href = "/admin/companies";
      } else {
        window.location.href = "/app/dashboard";
      }
    } catch (err: any) {
      console.error("Login failed:", err);
      const msg =
        err?.code === "auth/popup-blocked"
          ? "Le popup de connexion a été bloqué. Autorisez les popups pour ce site et réessayez."
          : err.message || "Une erreur est survenue lors de la connexion.";
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex items-center justify-center p-6 relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] left-[20%] w-[60%] h-[60%] rounded-full bg-cyan-900/10 blur-[140px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[40%] h-[40%] rounded-full bg-emerald-900/8 blur-[120px]" />
      </div>

      <div
        className={`w-full max-w-md relative z-10 transition-all duration-700 ${
          visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
        }`}
      >
        {/* Logo */}
        <div className="flex justify-center mb-10">
          <Logo size="lg" />
        </div>

        <Card className="border-slate-800/70 bg-slate-900/50 backdrop-blur-2xl shadow-2xl">
          <CardHeader className="space-y-2 text-center pb-2">
            <div className="mx-auto h-12 w-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border border-cyan-800/40 flex items-center justify-center mb-2">
              <Sparkles className="h-6 w-6 text-cyan-400" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight font-grotesk">
              Connexion Espace SaaS
            </CardTitle>
            <CardDescription className="text-slate-400">
              Accédez à vos outils de gestion de stocks et de caisse
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4 pt-6">
            {/* Error banner */}
            {error && (
              <div className="p-3.5 text-xs bg-red-950/40 border border-red-800/40 text-red-300 rounded-xl leading-relaxed">
                {error}
              </div>
            )}

            {authLoading ? (
              <div className="py-10 flex flex-col items-center justify-center space-y-3">
                <div className="h-7 w-7 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs text-slate-400">
                  Vérification de session...
                </span>
              </div>
            ) : isClientConfigured ? (
              <>
                <Button
                  variant="gradient"
                  className="w-full h-12 flex items-center justify-center space-x-3 text-slate-950 font-bold text-sm"
                  onClick={handleGoogleLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      {/* Google logo SVG */}
                      <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      <span>Se connecter avec Google</span>
                    </>
                  )}
                </Button>

                <p className="text-[11px] text-slate-500 text-center">
                  Autorisez les popups sur ce site si votre navigateur les bloque.
                </p>
              </>
            ) : (
              <>
                <Button
                  variant="gradient"
                  className="w-full h-12 flex items-center justify-center space-x-2 text-slate-950 font-bold text-sm"
                  onClick={handleDemoLogin}
                  disabled={loading}
                >
                  {loading ? (
                    <div className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <LogIn className="h-5 w-5" />
                      <span>Accéder en Mode Démo</span>
                    </>
                  )}
                </Button>

                <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-800/30 text-[11px] text-cyan-400 text-center">
                  Mode sans Firebase — données stockées localement
                </div>
              </>
            )}

            <div className="text-center pt-1 text-[10px] text-slate-600">
              En vous connectant, vous acceptez nos CGU et Politique de
              Confidentialité.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
