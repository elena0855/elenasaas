"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Package,
  ShoppingCart,
  Settings,
  LogOut,
  AlertTriangle,
  Users,
  Truck,
  TrendingUp,
  FileText,
  ChevronRight,
  Bell,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import VoiceAgent from "@/components/VoiceAgent";
import { Button, Badge, ToastContainer } from "@/components/ui/index";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

const PAGE_TITLES: Record<string, string> = {
  dashboard: "Tableau de Bord",
  products: "Catalogue Produits",
  sales: "Caisse Point de Vente",
  settings: "Paramètres de Compte",
  clients: "Gestion Clients",
  suppliers: "Fournisseurs",
  reports: "Rapports & Analytiques",
  invoices: "Factures",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, company, loading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [lowStockCount, setLowStockCount] = useState(0);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading]);

  // Real-time low stock watcher
  useEffect(() => {
    if (!user || !db) return;
    const q = query(collection(db, "products"), where("companyId", "==", user.uid));
    const unsub = onSnapshot(q, (snap) => {
      const low = snap.docs.filter((d) => (d.data().quantity || 0) < 5).length;
      setLowStockCount(low);
    });
    return () => unsub();
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0f1e] flex flex-col items-center justify-center space-y-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full"
        />
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-slate-400 font-mono tracking-wider uppercase"
        >
          Chargement de votre espace...
        </motion.span>
      </div>
    );
  }

  if (!user) return null;

  const navGroups = [
    {
      label: "Principal",
      links: [
        { href: "/app/dashboard", label: "Tableau de Bord", icon: BarChart3, color: "cyan" },
        {
          href: "/app/products",
          label: "Produits",
          icon: Package,
          color: "emerald",
          badge: lowStockCount > 0 ? lowStockCount : null,
        },
        { href: "/app/sales", label: "Caisse de Vente", icon: ShoppingCart, color: "purple" },
      ],
    },
    {
      label: "Gestion",
      links: [
        { href: "/app/clients", label: "Clients", icon: Users, color: "blue" },
        { href: "/app/suppliers", label: "Fournisseurs", icon: Truck, color: "orange" },
        { href: "/app/reports", label: "Rapports", icon: TrendingUp, color: "pink" },
        { href: "/invoices", label: "Factures", icon: FileText, color: "yellow" },
      ],
    },
    {
      label: "Compte",
      links: [
        { href: "/app/settings", label: "Paramètres", icon: Settings, color: "slate" },
      ],
    },
  ];

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  const isTrial = company?.status === "trial";
  const currentPage = pathname.split("/").pop() || "dashboard";
  const pageTitle = PAGE_TITLES[currentPage] || "ELENA";

  const colorMap: Record<string, { icon: string; bg: string; glow: string }> = {
    cyan:    { icon: "text-cyan-400",    bg: "bg-cyan-500/10",    glow: "shadow-cyan-500/20" },
    emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10", glow: "shadow-emerald-500/20" },
    purple:  { icon: "text-purple-400",  bg: "bg-purple-500/10",  glow: "shadow-purple-500/20" },
    blue:    { icon: "text-blue-400",    bg: "bg-blue-500/10",    glow: "shadow-blue-500/20" },
    orange:  { icon: "text-orange-400",  bg: "bg-orange-500/10",  glow: "shadow-orange-500/20" },
    pink:    { icon: "text-pink-400",    bg: "bg-pink-500/10",    glow: "shadow-pink-500/20" },
    yellow:  { icon: "text-yellow-400",  bg: "bg-yellow-500/10",  glow: "shadow-yellow-500/20" },
    slate:   { icon: "text-slate-400",   bg: "bg-slate-500/10",   glow: "shadow-slate-500/20" },
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-slate-100 flex relative overflow-hidden">
      {/* Background glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] left-[15%] w-[55%] h-[55%] rounded-full bg-cyan-950/8 blur-[150px]" />
        <div className="absolute bottom-[10%] right-[10%] w-[35%] h-[35%] rounded-full bg-emerald-950/8 blur-[120px]" />
        <div className="absolute top-[50%] left-[40%] w-[30%] h-[30%] rounded-full bg-purple-950/5 blur-[130px]" />
      </div>

      {/* ===== SIDEBAR ===== */}
      <motion.aside
        animate={{ width: sidebarCollapsed ? 72 : 240 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        className="relative z-20 shrink-0 border-r border-slate-800/50 bg-slate-950/80 backdrop-blur-xl flex flex-col overflow-hidden hidden md:flex"
      >
        {/* Logo row */}
        <div className="h-16 flex items-center px-4 border-b border-slate-800/50 shrink-0">
          <AnimatePresence mode="wait">
            {!sidebarCollapsed ? (
              <motion.div
                key="full"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center gap-2 min-w-0"
              >
                <Logo size="sm" />
                {isTrial && (
                  <Badge variant="info" className="text-[9px] animate-pulse shrink-0">
                    Essai
                  </Badge>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="icon"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-sm"
              >
                E
              </motion.div>
            )}
          </AnimatePresence>

          {/* Collapse toggle */}
          <motion.button
            className="ml-auto p-1 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-colors"
            onClick={() => setSidebarCollapsed((p) => !p)}
            whileTap={{ scale: 0.9 }}
          >
            <motion.div animate={{ rotate: sidebarCollapsed ? 0 : 180 }} transition={{ duration: 0.3 }}>
              <ChevronRight className="h-4 w-4" />
            </motion.div>
          </motion.button>
        </div>

        {/* Company card */}
        <AnimatePresence>
          {!sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mx-3 mt-4 mb-2 p-3 rounded-xl bg-gradient-to-br from-slate-900/80 to-slate-800/40 border border-slate-700/40 overflow-hidden"
            >
              <p className="text-[9px] text-slate-500 uppercase font-bold tracking-wider mb-0.5">
                Entreprise
              </p>
              <p className="text-sm font-bold text-white truncate">
                {company?.name || "Ma Société"}
              </p>
              <div className="flex items-center gap-1.5 mt-1.5">
                <div className={`h-1.5 w-1.5 rounded-full ${
                  company?.status === "active" ? "bg-emerald-400 animate-pulse" :
                  company?.status === "suspended" ? "bg-red-400" : "bg-cyan-400 animate-pulse"
                }`} />
                <span className="text-[10px] text-slate-400 capitalize">
                  {company?.status === "active" ? "Actif" :
                   company?.status === "suspended" ? "Suspendu" : "Période d'essai"}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Low stock alert */}
        <AnimatePresence>
          {lowStockCount > 0 && !sidebarCollapsed && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="mx-3 mb-3 px-3 py-2 rounded-lg bg-amber-950/30 border border-amber-800/40 flex items-center gap-2 text-xs text-amber-400"
            >
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              <span>{lowStockCount} article{lowStockCount > 1 ? "s" : ""} en rupture</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Nav groups */}
        <nav className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
          {navGroups.map((group) => (
            <div key={group.label}>
              <AnimatePresence>
                {!sidebarCollapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-slate-600"
                  >
                    {group.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {group.links.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  const c = colorMap[link.color];
                  return (
                    <Link key={link.href} href={link.href}>
                      <motion.div
                        whileHover={{ x: sidebarCollapsed ? 0 : 3 }}
                        whileTap={{ scale: 0.97 }}
                        className={`relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 group ${
                          isActive
                            ? `${c.bg} text-white border border-slate-700/60`
                            : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
                        }`}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <motion.div
                            layoutId="activeBar"
                            className={`absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-[60%] rounded-r-full bg-gradient-to-b from-cyan-400 to-emerald-400`}
                            style={{ boxShadow: "0 0 8px rgba(6,182,212,0.6)" }}
                          />
                        )}

                        <div className={`relative shrink-0 flex items-center justify-center h-8 w-8 rounded-lg transition-all ${
                          isActive ? `${c.bg} shadow-lg ${c.glow}` : "group-hover:bg-slate-800/60"
                        }`}>
                          <Icon className={`h-4 w-4 ${isActive ? c.icon : "text-slate-500 group-hover:text-slate-300"}`} />
                        </div>

                        <AnimatePresence>
                          {!sidebarCollapsed && (
                            <motion.span
                              initial={{ opacity: 0, width: 0 }}
                              animate={{ opacity: 1, width: "auto" }}
                              exit={{ opacity: 0, width: 0 }}
                              className="truncate flex-1"
                            >
                              {link.label}
                            </motion.span>
                          )}
                        </AnimatePresence>

                        {link.badge && !sidebarCollapsed && (
                          <motion.span
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="shrink-0 h-5 min-w-[20px] px-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-400 text-[10px] font-bold flex items-center justify-center"
                          >
                            {link.badge}
                          </motion.span>
                        )}

                        {/* Collapsed badge dot */}
                        {link.badge && sidebarCollapsed && (
                          <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400" />
                        )}
                      </motion.div>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Sidebar footer */}
        <div className="p-3 border-t border-slate-800/50 shrink-0">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/20 transition-all duration-150 text-sm font-medium"
          >
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
              <LogOut className="h-4 w-4" />
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  Déconnexion
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      </motion.aside>

      {/* ===== MAIN CONTENT ===== */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header bar */}
        <header className="relative z-10 h-16 border-b border-slate-800/50 bg-slate-950/60 backdrop-blur-xl px-6 flex items-center justify-between shrink-0">
          <motion.div
            key={pageTitle}
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-3"
          >
            <h2 className="text-base font-bold text-white font-grotesk tracking-wide">
              {pageTitle}
            </h2>
          </motion.div>

          <div className="flex items-center gap-3">
            {/* Notification bell */}
            {lowStockCount > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="relative"
              >
                <button className="p-2 rounded-lg bg-slate-900/50 border border-slate-800/50 text-amber-400 hover:bg-amber-950/30 transition-colors">
                  <Bell className="h-4 w-4" />
                  <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-amber-500 text-slate-950 text-[9px] font-bold flex items-center justify-center">
                    {lowStockCount}
                  </span>
                </button>
              </motion.div>
            )}

            <span className="text-xs text-slate-500 font-mono hidden lg:inline">
              {user?.email}
            </span>
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-cyan-500 to-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs shadow-lg shadow-cyan-500/20">
              {user?.displayName
                ? user.displayName.slice(0, 2).toUpperCase()
                : "EL"}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto relative z-10">
          <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
            <motion.div
              key={pathname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
            >
              {children}
            </motion.div>
          </div>
        </main>
      </div>

      <ToastContainer />
      <VoiceAgent />
    </div>
  );
}
