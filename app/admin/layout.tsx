"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert, Users, LogOut, Award } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import Logo from "@/components/Logo";
import { Button, Badge } from "@/components/ui/index";

import { checkSuperAdmin } from "@/app/actions/admin";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.replace("/login");
      } else {
        checkSuperAdmin(user.uid, user.email || "").then((isSuperAdmin) => {
          setIsAdmin(isSuperAdmin);
          if (!isSuperAdmin) {
            console.warn("Access denied. User is not a super_admin.");
            router.replace("/app/dashboard");
          }
        }).catch(() => {
          setIsAdmin(false);
          router.replace("/app/dashboard");
        });
      }
    }
  }, [user, loading]);

  if (loading || isAdmin === null) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center space-y-4">
        <div className="h-8 w-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs text-slate-400 font-mono tracking-wider uppercase">Vérification des droits Admin...</span>
      </div>
    );
  }

  if (!user || !isAdmin) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    router.replace("/login");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row relative">
      {/* Background glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[5%] right-[5%] w-[40%] h-[40%] rounded-full bg-red-950/5 blur-[120px]" />
      </div>

      {/* Sidebar Navigation */}
      <aside className="relative z-10 w-full md:w-64 border-b md:border-b-0 md:border-r border-slate-900 bg-slate-950/40 backdrop-blur-md flex flex-col p-6 shrink-0">
        <div className="mb-8 flex items-center justify-between md:justify-start">
          <Logo size="sm" />
          <span title="Super Admin Dashboard"><Award className="h-5 w-5 text-red-500 ml-2" /></span>
        </div>

        <div className="p-3.5 mb-6 rounded-lg bg-red-950/15 border border-red-900/25 flex flex-col space-y-1">
          <span className="text-[10px] text-red-400 font-bold uppercase tracking-wider flex items-center">
            <ShieldAlert className="h-3 w-3 mr-1 shrink-0" />
            Super Administrateur
          </span>
          <span className="text-xs text-slate-400 font-mono truncate">{user.email}</span>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 space-y-1.5">
          <div className="flex items-center space-x-3 px-3.5 py-2.5 rounded-lg text-sm font-medium bg-slate-900 border border-slate-800 text-red-400 font-bold">
            <Users className="h-4.5 w-4.5 text-red-400" />
            <span>Entreprises SaaS</span>
          </div>
        </nav>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-900 mt-6">
          <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-slate-500 hover:text-red-400 justify-start w-full" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            <span>Se Déconnecter</span>
          </Button>
        </div>
      </aside>

      {/* Main body */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="relative z-10 h-16 border-b border-slate-900 bg-slate-950/20 backdrop-blur-sm px-8 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white font-grotesk tracking-wide">
            Console de Contrôle
          </h2>
          <Badge variant="danger" className="font-mono">
            CONSOLE SUPER_ADMIN
          </Badge>
        </header>

        <main className="flex-1 p-8 overflow-y-auto relative z-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
