"use client";

import React, { useEffect, useState } from "react";
import { Key, ShieldAlert, ShieldCheck, RefreshCw, Copy, Check } from "lucide-react";
import {
  getAllCompanies,
  createActivationKey,
  suspendCompany,
  reactivateCompany,
} from "@/app/actions/admin";
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  Badge,
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/index";

interface Company {
  id: string;
  name: string;
  adminEmail: string;
  adminUid: string;
  status: "trial" | "active" | "suspended";
  trialStart: string | null;
  subscriptionEnd: string | null;
  createdAt: string | null;
}

export default function AdminCompaniesPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Key Generation state
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);

  const loadCompanies = async () => {
    setLoading(true);
    const data = await getAllCompanies();
    setCompanies(data);
    setLoading(false);
  };

  useEffect(() => {
    loadCompanies();
  }, []);

  const handleGenerateKey = async () => {
    setActionLoading("generate_key");
    const res = await createActivationKey();
    if (res.success && res.key) {
      setGeneratedKey(res.key);
      setIsCopied(false);
      setIsKeyModalOpen(true);
    } else {
      alert("Erreur lors de la génération de la clé.");
    }
    setActionLoading(null);
  };

  const handleCopyKey = () => {
    if (!generatedKey) return;
    navigator.clipboard.writeText(generatedKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSuspend = async (companyId: string) => {
    if (!confirm("Suspendre cette entreprise ? Elle sera immédiatement redirigée vers la page d'activation.")) return;
    setActionLoading(companyId);
    const res = await suspendCompany(companyId);
    if (res.success) {
      setCompanies((prev) =>
        prev.map((c) => (c.id === companyId ? { ...c, status: "suspended" } : c))
      );
    } else {
      alert("Erreur de suspension.");
    }
    setActionLoading(null);
  };

  const handleReactivate = async (companyId: string) => {
    setActionLoading(companyId);
    const res = await reactivateCompany(companyId);
    if (res.success && res.subscriptionEnd) {
      setCompanies((prev) =>
        prev.map((c) =>
          c.id === companyId
            ? {
                ...c,
                status: "active",
                subscriptionEnd: res.subscriptionEnd!.toISOString(),
              }
            : c
        )
      );
    } else {
      alert("Erreur de réactivation.");
    }
    setActionLoading(null);
  };

  // Helper to compute trial status
  const getTrialStatusString = (company: Company) => {
    if (company.status === "active") {
      if (!company.subscriptionEnd) return "Active (Illimitée)";
      const expiry = new Date(company.subscriptionEnd).toLocaleDateString("fr-FR");
      return `Expire le ${expiry}`;
    }

    if (company.status === "suspended") {
      return "Suspendu";
    }

    // Trial countdown
    if (company.trialStart) {
      const trialStart = new Date(company.trialStart).getTime();
      const diffMs = Date.now() - trialStart;
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));
      
      const trialDaysLeft = Math.max(0, 15 - diffDays);
      const graceDaysLeft = Math.max(0, 30 - diffDays);

      if (trialDaysLeft > 0) {
        return `${trialDaysLeft}j restants`;
      } else if (graceDaysLeft > 0) {
        return `${graceDaysLeft}j de grâce`;
      } else {
        return "Essai Terminé";
      }
    }

    return "Aucune info d'essai";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-grotesk tracking-tight text-white">
            Gestion des Entreprises
          </h1>
          <p className="text-xs text-slate-400">
            Supervisez les clients SaaS, suspendez les comptes ou générez des codes d'activation.
          </p>
        </div>

        <div className="flex space-x-2">
          {/* Refresh button */}
          <Button
            variant="outline"
            size="icon"
            onClick={loadCompanies}
            disabled={loading}
            title="Rafraîchir la liste"
          >
            <RefreshCw className={`h-4 w-4 text-slate-400 ${loading ? "animate-spin" : ""}`} />
          </Button>

          {/* Key generation button */}
          <Button
            variant="gradient"
            className="flex items-center space-x-2 font-bold"
            onClick={handleGenerateKey}
            disabled={actionLoading === "generate_key"}
          >
            <Key className="h-4 w-4 text-slate-950 stroke-[3]" />
            <span>Générer Clé d'Activation</span>
          </Button>
        </div>
      </div>

      <Card className="border-slate-800 bg-slate-900/20 backdrop-blur-sm">
        <CardContent className="p-0">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center space-y-3">
              <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs text-slate-500">Chargement de la base clients...</span>
            </div>
          ) : companies.length === 0 ? (
            <div className="py-12 text-center text-slate-500">
              Aucune entreprise enregistrée dans la base de données.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom de l'Entreprise</TableHead>
                  <TableHead>Email Administrateur</TableHead>
                  <TableHead>Date d'Inscription</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead>Temps Restant</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((c) => {
                  const isSuspended = c.status === "suspended";
                  const isActionBusy = actionLoading === c.id;

                  return (
                    <TableRow key={c.id}>
                      <TableCell className="font-bold text-slate-200">{c.name}</TableCell>
                      <TableCell className="font-mono text-slate-400 text-xs">{c.adminEmail}</TableCell>
                      <TableCell className="text-slate-400 text-xs">
                        {c.createdAt ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "-"}
                      </TableCell>
                      <TableCell>
                        {c.status === "active" ? (
                          <Badge variant="success">Active</Badge>
                        ) : c.status === "suspended" ? (
                          <Badge variant="danger">Suspendu</Badge>
                        ) : (
                          <Badge variant="info">Essai</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-slate-300 font-medium">
                        {getTrialStatusString(c)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          {isSuspended ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs border-emerald-800 hover:bg-emerald-950/20 text-emerald-400"
                              onClick={() => handleReactivate(c.id)}
                              disabled={isActionBusy}
                            >
                              <ShieldCheck className="h-3.5 w-3.5 mr-1" />
                              Réactiver
                            </Button>
                          ) : (
                            <div className="flex items-center space-x-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs text-slate-400 hover:text-white"
                                onClick={() => handleReactivate(c.id)}
                                disabled={isActionBusy}
                                title="Prolonge la licence de 30 jours"
                              >
                                +30 Jours
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() => handleSuspend(c.id)}
                                disabled={isActionBusy}
                              >
                                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                                Suspendre
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* ========================================== */}
      {/* KEY GENERATION DIALOG */}
      {/* ========================================== */}
      <Dialog isOpen={isKeyModalOpen} onClose={() => setIsKeyModalOpen(false)}>
        <DialogHeader>
          <DialogTitle>Clé d'Activation Générée</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 pt-2 text-center">
          <p className="text-xs text-slate-400 leading-relaxed">
            Cette clé d'activation est à usage unique et expire dans 30 jours.<br />
            Partagez-la avec l'entreprise cliente pour débloquer ou prolonger son accès.
          </p>

          <div className="flex items-center justify-between p-4 rounded-lg bg-slate-950 border border-slate-800 max-w-sm mx-auto">
            <span className="font-mono text-xl font-bold text-cyan-400 tracking-wider">
              {generatedKey}
            </span>
            <Button variant="ghost" size="icon" className="hover:bg-slate-900" onClick={handleCopyKey}>
              {isCopied ? (
                <Check className="h-5 w-5 text-emerald-400" />
              ) : (
                <Copy className="h-5 w-5 text-slate-400 hover:text-white" />
              )}
            </Button>
          </div>

          <div className="flex justify-center pt-2">
            <Button variant="gradient" size="sm" className="font-bold" onClick={() => setIsKeyModalOpen(false)}>
              Fermer la fenêtre
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
