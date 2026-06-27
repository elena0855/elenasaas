"use client";

import { useState } from "react";
import { db } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import toast from "react-hot-toast";
import { jsPDF } from "jspdf";

interface Item {
  description: string;
  qty: number;
  price: number;
}

export default function InvoiceForm({ onCreated }: { onCreated?: () => void }) {
  const [clientName, setClientName] = useState("");
  const [items, setItems] = useState<Item[]>([{ description: "", qty: 1, price: 0 }]);
  const [loading, setLoading] = useState(false);

  const handleItemChange = (index: number, field: keyof Item, value: string) => {
    setItems((prev) =>
      prev.map((it, i) =>
        i === index
          ? { ...it, [field]: field === "description" ? value : Number(value) }
          : it
      )
    );
  };

  const addItem = () => setItems((p) => [...p, { description: "", qty: 1, price: 0 }]);
  const removeItem = (i: number) => setItems((p) => p.filter((_, idx) => idx !== i));
  const total = () => items.reduce((s, it) => s + it.qty * it.price, 0);

  const downloadPDF = (invoiceId: string) => {
    const doc = new jsPDF();
    doc.setFontSize(22);
    doc.setTextColor(6, 182, 212);
    doc.text("FACTURE", 105, 20, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(50, 50, 50);
    doc.text(`Client : ${clientName}`, 20, 36);
    doc.text(`ID     : ${invoiceId}`, 20, 43);
    doc.text(`Date   : ${new Date().toLocaleDateString("fr-FR")}`, 20, 50);
    doc.setDrawColor(6, 182, 212);
    doc.line(20, 55, 190, 55);
    let y = 63;
    doc.setFont("helvetica", "bold");
    doc.text("Description", 20, y);
    doc.text("Qté", 110, y, { align: "right" });
    doc.text("Prix", 145, y, { align: "right" });
    doc.text("Total", 185, y, { align: "right" });
    doc.setFont("helvetica", "normal");
    y += 7;
    items.forEach((it) => {
      doc.text(it.description, 20, y);
      doc.text(String(it.qty), 110, y, { align: "right" });
      doc.text(`${it.price.toFixed(2)} €`, 145, y, { align: "right" });
      doc.text(`${(it.qty * it.price).toFixed(2)} €`, 185, y, { align: "right" });
      y += 7;
    });
    doc.line(20, y, 190, y);
    y += 8;
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL : ${total().toFixed(2)} €`, 185, y, { align: "right" });
    doc.save(`facture_${invoiceId}.pdf`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return void toast.error("Nom du client requis");
    setLoading(true);
    try {
      const ref = await addDoc(collection(db, "invoices"), {
        clientName,
        items,
        total: total(),
        createdAt: serverTimestamp(),
      });
      toast.success("Facture enregistrée !");
      downloadPDF(ref.id);
      setClientName("");
      setItems([{ description: "", qty: 1, price: 0 }]);
      onCreated?.();
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors de l'enregistrement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-slate-900/80 border border-cyan-800/30 p-6 space-y-5 backdrop-blur-md shadow-2xl"
    >
      <h2 className="text-xl font-semibold text-cyan-300">Nouvelle facture</h2>

      {/* Client name */}
      <input
        type="text"
        placeholder="Nom du client"
        value={clientName}
        onChange={(e) => setClientName(e.target.value)}
        className="w-full rounded-xl bg-slate-800/60 border border-slate-700/50 text-white px-4 py-2.5 text-sm focus:outline-none focus:border-cyan-500 transition"
        required
      />

      {/* Line items */}
      <div className="space-y-2">
        {items.map((it, i) => (
          <div key={i} className="grid grid-cols-[1fr_80px_100px_auto] gap-2 items-center">
            <input
              type="text"
              placeholder="Description"
              value={it.description}
              onChange={(e) => handleItemChange(i, "description", e.target.value)}
              className="rounded-xl bg-slate-800/60 border border-slate-700/50 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition"
              required
            />
            <input
              type="number"
              min="1"
              placeholder="Qté"
              value={it.qty}
              onChange={(e) => handleItemChange(i, "qty", e.target.value)}
              className="rounded-xl bg-slate-800/60 border border-slate-700/50 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition"
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Prix (€)"
              value={it.price}
              onChange={(e) => handleItemChange(i, "price", e.target.value)}
              className="rounded-xl bg-slate-800/60 border border-slate-700/50 text-white px-3 py-2 text-sm focus:outline-none focus:border-cyan-500 transition"
            />
            {items.length > 1 ? (
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="text-red-400 hover:text-red-300 text-xs font-medium"
              >
                ✕
              </button>
            ) : (
              <span />
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={addItem}
          className="text-sm text-cyan-400 hover:text-cyan-300 transition"
        >
          + Ajouter un article
        </button>
      </div>

      <div className="flex justify-between items-center pt-2 border-t border-slate-800/60">
        <span className="text-cyan-200 font-semibold">
          Total : {total().toFixed(2)} €
        </span>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-sm hover:opacity-90 active:scale-95 transition disabled:opacity-50"
        >
          {loading ? "Enregistrement…" : "Enregistrer & PDF"}
        </button>
      </div>
    </form>
  );
}
