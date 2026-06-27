"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Mic,
  ShoppingCart,
  BarChart3,
  Zap,
  Shield,
  Globe,
} from "lucide-react";
import Logo from "@/components/Logo";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/index";

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const match = document.cookie.match(/(^| )token=([^;]+)/);
    setIsAuthenticated(!!match);
    setLoading(false);
    // trigger entrance animation
    setTimeout(() => setVisible(true), 50);
  }, []);

  const features = [
    {
      icon: Mic,
      color: "cyan",
      title: "Assistant Vocal ELENA",
      description: "Gérez vos stocks et enregistrez des ventes en parlant naturellement. \"Ajouter 10 riz au stock\", \"Vendre 3 bières client Jean\" — Elena comprend et exécute.",
    },
    {
      icon: ShoppingCart,
      color: "emerald",
      title: "Caisse Point de Vente",
      description: "Interface caisse à double colonne : composez vos paniers, encaissez et synchronisez votre inventaire en temps réel via des transactions atomiques.",
    },
    {
      icon: BarChart3,
      color: "purple",
      title: "Rapports & Analytics",
      description: "Suivez votre chiffre d'affaires quotidien, vos ventes par produit et l'évolution de votre activité via des graphiques dynamiques interactifs.",
    },
  ];

  const stats = [
    { value: "< 1s", label: "Temps de réponse vocal" },
    { value: "99.9%", label: "Disponibilité garantie" },
    { value: "100%", label: "Données chiffrées" },
    { value: "24/7", label: "Support entreprise" },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex flex-col selection:bg-cyan-500/30 selection:text-white overflow-x-hidden">
      {/* ===== BACKGROUND GLOWS ===== */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[30%] -left-[20%] w-[80%] h-[80%] rounded-full bg-cyan-900/8 blur-[180px]" />
        <div className="absolute top-[30%] -right-[20%] w-[60%] h-[70%] rounded-full bg-emerald-900/8 blur-[160px]" />
        <div className="absolute bottom-0 left-[30%] w-[40%] h-[40%] rounded-full bg-purple-900/5 blur-[140px]" />
      </div>

      {/* ===== NAVBAR ===== */}
      <header className="relative z-20 w-full max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-slate-900/60 bg-slate-950/10 backdrop-blur-sm">
        <Logo size="md" />
        <div>
          {loading ? (
            <div className="h-9 w-28 rounded-lg bg-slate-900/60 shimmer" />
          ) : isAuthenticated ? (
            <Link href="/app/dashboard">
              <Button variant="gradient" size="sm" className="font-semibold">
                Tableau de bord
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button variant="outline" size="sm" className="font-semibold">
                Se Connecter
              </Button>
            </Link>
          )}
        </div>
      </header>

      {/* ===== HERO ===== */}
      <main className="relative z-10 flex-1 flex flex-col">
        <section className="flex flex-col items-center text-center px-6 pt-24 pb-20 max-w-6xl mx-auto w-full">
          {/* Pill badge */}
          <div
            className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-800/40 text-xs font-semibold text-cyan-400 mb-10 tracking-wide uppercase transition-all duration-700 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
            }`}
          >
            <Mic className="h-3.5 w-3.5 animate-pulse text-emerald-400" />
            <span>Contrôle Vocal Révolutionnaire · Nouvelle Génération</span>
          </div>

          {/* Main headline */}
          <h1
            className={`text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight font-grotesk leading-[1.05] mb-8 transition-all duration-700 delay-100 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Pilotez votre commerce
            <br />
            <span className="text-gradient-cyan">à la voix</span>
            <br />
            <span className="text-slate-300">avec l&apos;agent ELENA</span>
          </h1>

          {/* Sub-headline */}
          <p
            className={`text-lg md:text-xl text-slate-400 max-w-2xl leading-relaxed mb-12 transition-all duration-700 delay-200 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            Le SaaS B2B nouvelle génération : gérez vos stocks, enregistrez vos
            ventes et suivez vos finances simplement en parlant. Sans friction,
            conçu pour le terrain.
          </p>

          {/* CTA Buttons */}
          <div
            className={`flex flex-col sm:flex-row gap-4 mb-24 transition-all duration-700 delay-300 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {isAuthenticated ? (
              <Link href="/app/dashboard">
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full sm:w-auto min-w-[220px]"
                >
                  <span>Aller au Tableau de Bord</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button
                  variant="gradient"
                  size="lg"
                  className="w-full sm:w-auto min-w-[220px]"
                >
                  <span>Commencer l&apos;Essai Gratuit</span>
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            )}
            <Link href="#features">
              <Button
                variant="outline"
                size="lg"
                className="w-full sm:w-auto min-w-[200px]"
              >
                Découvrir les fonctionnalités
              </Button>
            </Link>
          </div>

          {/* Stats row */}
          <div
            className={`grid grid-cols-2 md:grid-cols-4 gap-6 w-full max-w-3xl mb-4 transition-all duration-700 delay-400 ${
              visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-6"
            }`}
          >
            {stats.map((s) => (
              <div key={s.label} className="flex flex-col items-center space-y-1">
                <span className="text-2xl md:text-3xl font-extrabold font-grotesk text-gradient-cyan">
                  {s.value}
                </span>
                <span className="text-[11px] text-slate-500 text-center leading-tight">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ===== FEATURES ===== */}
        <section
          id="features"
          className="px-6 pb-24 max-w-7xl mx-auto w-full"
        >
          <div className="text-center mb-16">
            <p className="text-xs font-semibold text-cyan-400 uppercase tracking-widest mb-3">
              Fonctionnalités
            </p>
            <h2 className="text-3xl md:text-4xl font-extrabold font-grotesk text-white">
              Tout ce dont votre commerce a besoin
            </h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto text-sm">
              Une suite complète intégrée dans une interface claire, pilotable à
              la voix depuis n'importe quel appareil.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {features.map((f, i) => {
              const Icon = f.icon;
              const colorMap: Record<
                string,
                { bg: string; border: string; icon: string }
              > = {
                cyan: {
                  bg: "bg-cyan-950/50",
                  border: "border-cyan-800/40",
                  icon: "text-cyan-400",
                },
                emerald: {
                  bg: "bg-emerald-950/50",
                  border: "border-emerald-800/40",
                  icon: "text-emerald-400",
                },
                purple: {
                  bg: "bg-purple-950/50",
                  border: "border-purple-800/40",
                  icon: "text-purple-400",
                },
              };
              const c = colorMap[f.color];
              return (
                <Card
                  key={f.title}
                  className="hover:-translate-y-2 hover:shadow-2xl transition-all duration-300 group"
                  style={{ animationDelay: `${i * 100}ms` }}
                >
                  <CardHeader>
                    <div
                      className={`h-12 w-12 rounded-xl ${c.bg} border ${c.border} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}
                    >
                      <Icon className={`h-6 w-6 ${c.icon}`} />
                    </div>
                    <CardTitle>{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      {f.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* ===== TRUST BADGES ===== */}
        <section className="px-6 pb-24 max-w-7xl mx-auto w-full">
          <div className="rounded-2xl border border-slate-800/60 bg-slate-900/30 backdrop-blur-md p-8 md:p-12 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h3 className="text-2xl md:text-3xl font-extrabold font-grotesk text-white mb-2">
                Prêt à révolutionner votre gestion ?
              </h3>
              <p className="text-slate-400 text-sm">
                15 jours d'essai gratuit. Aucune carte bancaire requise.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 shrink-0">
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Shield className="h-4 w-4 text-emerald-400" />
                <span>Données chiffrées</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Zap className="h-4 w-4 text-cyan-400" />
                <span>Mise en route en 2 min</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-400">
                <Globe className="h-4 w-4 text-purple-400" />
                <span>Accès partout</span>
              </div>
            </div>
            {!isAuthenticated && (
              <Link href="/login">
                <Button variant="gradient" size="lg" className="shrink-0">
                  Démarrer maintenant
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
            )}
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="relative z-10 w-full border-t border-slate-900/60 py-8">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© 2026 ELENA Inc. Tous droits réservés.</p>
          <div className="flex space-x-6">
            <span className="hover:text-slate-300 transition-colors cursor-pointer">
              Conditions d&apos;utilisation
            </span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">
              Confidentialité
            </span>
            <span className="hover:text-slate-300 transition-colors cursor-pointer">
              B2B SaaS
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
