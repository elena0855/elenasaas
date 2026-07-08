"use client";

import { useState, useEffect, useCallback } from "react";
import InvoiceForm from "@/components/InvoiceForm";
import { fetchInvoices, generateInvoicePDF, Invoice } from "@/lib/invoice";
import { FileText, Download, RefreshCw } from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchInvoices();
      setInvoices(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 space-y-8">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileText className="h-7 w-7 text-cyan-400" />
            <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent">
              Factures
            </h1>
          </div>
          <button
            onClick={load}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 hover:text-cyan-400 text-sm transition"
          >
            <RefreshCw className="h-4 w-4" />
            Actualiser
          </button>
        </div>

        {/* Create form */}
        <InvoiceForm onCreated={load} />

        {/* Invoice list */}
        <div className="rounded-2xl bg-slate-900/80 border border-cyan-800/30 backdrop-blur-md shadow-2xl overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-800/60">
            <h2 className="font-semibold text-slate-200">
              Historique des factures
              <span className="ml-2 text-xs text-slate-500">({invoices.length})</span>
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16 text-slate-500">
              <RefreshCw className="h-5 w-5 animate-spin mr-2" />
              Chargement…
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500 space-y-2">
              <FileText className="h-10 w-10 text-slate-700" />
              <p className="text-sm">Aucune facture enregistrée</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-800/40">
              {invoices.map((inv) => (
                <div
                  key={inv.id}
                  className="px-6 py-4 flex items-center justify-between hover:bg-slate-800/30 transition"
                >
                  <div className="space-y-0.5">
                    <p className="font-medium text-slate-200">{inv.clientName}</p>
                    <p className="text-xs text-slate-500">
                      {inv.createdAt?.toDate
                        ? inv.createdAt.toDate().toLocaleDateString("fr-FR")
                        : "—"}
                      {" · "}
                      <span className="font-mono text-slate-400">{inv.id.slice(0, 8)}…</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-cyan-300 font-mono">
                      {inv.total.toFixed(0)} FCFA
                    </span>
                    <button
                      onClick={() => generateInvoicePDF(inv)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 text-xs font-medium transition"
                    >
                      <Download className="h-3.5 w-3.5" />
                      PDF
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
