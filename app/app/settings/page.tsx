"use client";

import React, { useEffect, useState } from "react";
import { Settings, Shield, User, Sun, Moon, Sparkles, AlertTriangle } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Badge,
  Button,
} from "@/components/ui/index";

export default function SettingsPage() {
  const { company, user } = useAuth();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [daysRemaining, setDaysRemaining] = useState(15);
  const [graceRemaining, setGraceRemaining] = useState(15);

  // Initialize theme from html class
  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setTheme(isLight ? "light" : "dark");
  }, []);

  // Compute trial countdowns
  useEffect(() => {
    if (company?.trialStart) {
      let startTime = 0;
      if (company.trialStart.toDate) {
        startTime = company.trialStart.toDate().getTime();
      } else if (company.trialStart._seconds) {
        startTime = company.trialStart._seconds * 1000;
      } else {
        startTime = new Date(company.trialStart).getTime();
      }

      const diffMs = Date.now() - startTime;
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      
      const trialDaysLeft = Math.max(0, 15 - diffDays);
      const graceDaysLeft = Math.max(0, 30 - diffDays);

      setDaysRemaining(trialDaysLeft);
      setGraceRemaining(graceDaysLeft);
    }
  }, [company]);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    setTheme(nextTheme);
    if (nextTheme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
    } else {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    }
  };

  const isActive = company?.status === "active";
  const isSuspended = company?.status === "suspended";

  // Format subscription end date
  const getSubEndString = () => {
    if (!company?.subscriptionEnd) return "Non spécifiée";
    let dateObj: Date;
    if (company.subscriptionEnd.toDate) {
      dateObj = company.subscriptionEnd.toDate();
    } else if (company.subscriptionEnd._seconds) {
      dateObj = new Date(company.subscriptionEnd._seconds * 1000);
    } else {
      dateObj = new Date(company.subscriptionEnd);
    }
    return dateObj.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* LEFT COLUMN: Theme and User info */}
        <div className="md:col-span-1 space-y-6">
          {/* User profile Summary */}
          <Card>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="mx-auto h-20 w-20 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-bold text-2xl shadow-lg shadow-cyan-500/20">
                {user?.displayName ? user.displayName.slice(0, 2).toUpperCase() : "EL"}
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white text-base">{user?.displayName || "Utilisateur"}</h3>
                <p className="text-xs text-slate-500 font-mono truncate">{user?.email}</p>
              </div>
              <Badge variant={isActive ? "success" : isSuspended ? "danger" : "info"} className="mx-auto">
                {isActive ? "Licence Active" : isSuspended ? "Compte Suspendu" : "Période d'essai"}
              </Badge>
            </CardContent>
          </Card>

          {/* Theme setting toggler */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-900/60">
              <CardTitle className="text-sm font-semibold">Préférences d'Affichage</CardTitle>
            </CardHeader>
            <CardContent className="pt-4 flex items-center justify-between">
              <span className="text-xs text-slate-400">Mode Sombre par défaut</span>
              <Button variant="secondary" size="sm" onClick={toggleTheme} className="flex items-center space-x-2">
                {theme === "dark" ? (
                  <>
                    <Moon className="h-4 w-4 text-cyan-400 fill-cyan-400/20" />
                    <span>Sombre</span>
                  </>
                ) : (
                  <>
                    <Sun className="h-4 w-4 text-amber-500" />
                    <span>Clair</span>
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIGHT COLUMN: Company & Subscription settings */}
        <div className="md:col-span-2 space-y-6">
          {/* Company details */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-900/60">
              <CardTitle className="text-sm font-semibold">Informations de l'Entreprise</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Nom commercial</span>
                  <span className="font-semibold text-slate-200">{company?.name || "Non renseigné"}</span>
                </div>
                <div className="flex flex-col space-y-0.5">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider">Email Administrateur</span>
                  <span className="font-semibold text-slate-200 font-mono truncate">{company?.adminEmail || "Non renseigné"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Licensing and trial status */}
          <Card>
            <CardHeader className="pb-3 border-b border-slate-900/60">
              <CardTitle className="text-sm font-semibold">Abonnement & Licence</CardTitle>
            </CardHeader>
            <CardContent className="pt-6 space-y-6">
              {isActive ? (
                // Active subscription UI
                <div className="p-4 rounded-lg bg-emerald-950/20 border border-emerald-800/20 flex flex-col space-y-2">
                  <div className="flex items-center space-x-2 text-emerald-400">
                    <Shield className="h-5 w-5 shrink-0" />
                    <span className="font-bold text-sm">Licence B2B ELENA Activée</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Votre entreprise bénéficie d'un accès complet et illimité. Votre licence actuelle expire le :
                    <span className="text-emerald-400 font-bold"> {getSubEndString()}</span>.
                  </p>
                </div>
              ) : isSuspended ? (
                // Suspended account UI
                <div className="p-4 rounded-lg bg-red-950/20 border border-red-800/20 flex flex-col space-y-2">
                  <div className="flex items-center space-x-2 text-red-400">
                    <AlertTriangle className="h-5 w-5 shrink-0" />
                    <span className="font-bold text-sm">Accès Entreprise Suspendu</span>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Votre compte a été suspendu par un super-administrateur. Veuillez contacter le support ou insérer une nouvelle clé d'activation.
                  </p>
                </div>
              ) : (
                // Trial countdown UI
                <div className="space-y-6">
                  <div className="p-4 rounded-lg bg-cyan-950/20 border border-cyan-800/20 flex flex-col space-y-2">
                    <div className="flex items-center space-x-2 text-cyan-400">
                      <Sparkles className="h-5 w-5 shrink-0" />
                      <span className="font-bold text-sm">Période d'Essai de 15 Jours</span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Vous utilisez la version d'essai gratuite. Pour éviter toute interruption de service après l'essai et la période de grâce de 15 jours additionnelle, activez une clé de licence.
                    </p>
                  </div>

                  {/* Progress bars */}
                  <div className="space-y-4">
                    {/* Trial countdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Jours restants d'essai gratuit :</span>
                        <span className="font-bold text-white font-mono">{daysRemaining} / 15 Jours</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-500"
                          style={{ width: `${(daysRemaining / 15) * 100}%` }}
                        />
                      </div>
                    </div>

                    {/* Grace period countdown */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">Délai avant blocage (essai + grâce) :</span>
                        <span className="font-bold text-amber-500 font-mono">{graceRemaining} / 30 Jours</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-900 overflow-hidden">
                        <div
                          className="h-full bg-amber-500 transition-all duration-500"
                          style={{ width: `${(graceRemaining / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        
      </div>
    </div>
  );
}
