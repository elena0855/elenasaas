"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, LogOut, Key } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { activateLicenseKey } from "@/app/actions/auth";
import Logo from "@/components/Logo";
import { Button, Card, CardHeader, CardTitle, CardDescription, CardContent, Input } from "@/components/ui/index";

export default function ActivationPage() {
  const router = useRouter();
  const { user, company, logout } = useAuth();
  const [activationKey, setActivationKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const res = await activateLicenseKey(user.uid, activationKey.toUpperCase(), user.email || "");
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/app/dashboard");
        }, 2000);
      } else {
        setError(res.error || "Une erreur est survenue lors de l'activation.");
      }
    } catch (err: any) {
      setError(err.message || "Erreur réseau.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const isSuspended = company?.status === "suspended";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6 relative">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[20%] right-[30%] w-[40%] h-[40%] rounded-full bg-cyan-900/10 blur-[130px]" />
      </div>

      <div className="w-full max-w-md relative z-10">
        <div className="flex justify-between items-center mb-8">
          <Logo size="sm" />
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-400 hover:text-white" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span>Déconnexion</span>
          </Button>
        </div>

        <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl">
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center mb-4">
              <Key className="h-6 w-6 text-cyan-400" />
            </div>
            <CardTitle className="text-2xl font-extrabold tracking-tight font-grotesk">
              {isSuspended ? "Espace Suspendu" : "Activation Requise"}
            </CardTitle>
            <CardDescription className="text-slate-400">
              {isSuspended 
                ? "L'accès à votre entreprise a été suspendu par un administrateur." 
                : "Votre période d'essai de 15 jours (et ses 15 jours de grâce) est terminée."}
              <br />Veuillez insérer une clé de licence valide pour débloquer votre accès.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 text-xs bg-red-950/40 border border-red-800/40 text-red-400 rounded-lg">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 text-xs bg-emerald-950/40 border border-emerald-800/40 text-emerald-400 rounded-lg flex items-center space-x-2">
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span>Licence activée ! Redirection en cours...</span>
              </div>
            )}

            <form onSubmit={handleActivate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Clé d'activation (Format: ELN-XXXX-XXXX)
                </label>
                <Input
                  placeholder="ELN-ABCD-1234"
                  value={activationKey}
                  onChange={(e) => setActivationKey(e.target.value)}
                  className="font-mono text-center tracking-widest text-lg uppercase"
                  disabled={loading || success}
                  required
                />
              </div>

              <Button
                variant="gradient"
                type="submit"
                className="w-full py-6 flex items-center justify-center space-x-2 text-slate-950 font-bold"
                disabled={loading || success}
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>Activer la Licence</span>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
