"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Plus, Search, Phone, Mail, Trash2, Edit3, X,
  TrendingUp, ShoppingBag, CheckCircle,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  address?: string;
  totalSpent: number;
  ordersCount: number;
  createdAt: any;
}

const EMPTY: Omit<Client, "id" | "totalSpent" | "ordersCount" | "createdAt"> = {
  name: "", email: "", phone: "", address: "",
};

export default function ClientsPage() {
  const { user } = useAuth();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Client | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(
      collection(db, "clients"),
      where("companyId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setClients(
        snap.docs.map((d) => ({ id: d.id, ...d.data() } as Client))
      );
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setShowForm(true);
  };

  const openEdit = (c: Client) => {
    setEditing(c);
    setForm({ name: c.name, email: c.email, phone: c.phone, address: c.address || "" });
    setShowForm(true);
  };

  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nom requis");
    if (!user || !db) return;
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "clients", editing.id), {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address?.trim() || "",
        });
        toast.success("Client mis à jour");
      } else {
        await addDoc(collection(db, "clients"), {
          companyId: user.uid,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          address: form.address?.trim() || "",
          totalSpent: 0,
          ordersCount: 0,
          createdAt: serverTimestamp(),
        });
        toast.success("Client ajouté !");
      }
      closeForm();
    } catch (e) {
      console.error(e);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!db) return;
    setDeleting(id);
    try {
      await deleteDoc(doc(db, "clients", id));
      toast.success("Client supprimé");
    } catch {
      toast.error("Erreur suppression");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.email.toLowerCase().includes(search.toLowerCase()) ||
    c.phone.includes(search)
  );

  const totalCA = clients.reduce((s, c) => s + c.totalSpent, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center">
            <Users className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-grotesk">Clients</h1>
            <p className="text-xs text-slate-500">{clients.length} client{clients.length !== 1 ? "s" : ""} enregistrés</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 font-bold text-sm hover:opacity-90 transition shadow-lg shadow-blue-500/20"
        >
          <Plus className="h-4 w-4" />
          Nouveau client
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total clients", value: clients.length, icon: Users, color: "blue" },
          { label: "CA total clients", value: `${totalCA.toFixed(0)} €`, icon: TrendingUp, color: "emerald" },
          { label: "Total commandes", value: clients.reduce((s, c) => s + c.ordersCount, 0), icon: ShoppingBag, color: "purple" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl bg-slate-900/60 border border-slate-800/50 p-4 backdrop-blur-md"
          >
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un client..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 text-white text-sm focus:outline-none focus:border-blue-500/60 transition"
        />
      </div>

      {/* Clients list */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-md overflow-hidden">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-500 text-sm">
            Chargement...
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
            <Users className="h-10 w-10 text-slate-700" />
            <p className="text-sm">{search ? "Aucun résultat" : "Aucun client encore"}</p>
            {!search && (
              <button onClick={openCreate} className="text-xs text-blue-400 hover:underline">
                Ajouter le premier client →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/50">
              <span>Client</span>
              <span>Contact</span>
              <span>CA Total</span>
              <span>Commandes</span>
              <span />
            </div>
            <AnimatePresence>
              {filtered.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ delay: i * 0.04 }}
                  className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-4 px-5 py-4 items-center hover:bg-slate-800/20 transition group"
                >
                  {/* Name */}
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-sm">{c.name}</p>
                      {c.address && <p className="text-xs text-slate-500 truncate max-w-[140px]">{c.address}</p>}
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="space-y-0.5">
                    {c.email && <div className="flex items-center gap-1 text-xs text-slate-400"><Mail className="h-3 w-3" /><span className="truncate">{c.email}</span></div>}
                    {c.phone && <div className="flex items-center gap-1 text-xs text-slate-400"><Phone className="h-3 w-3" /><span>{c.phone}</span></div>}
                  </div>

                  {/* CA */}
                  <p className="font-mono font-bold text-emerald-400 text-sm">{c.totalSpent.toFixed(2)} €</p>

                  {/* Orders */}
                  <div className="flex items-center gap-1.5 text-sm text-slate-300">
                    <CheckCircle className="h-3.5 w-3.5 text-slate-500" />
                    {c.ordersCount}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                    <button
                      onClick={() => openEdit(c)}
                      className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-cyan-400 transition"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="p-1.5 rounded-lg hover:bg-red-950/30 text-slate-400 hover:text-red-400 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && closeForm()}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.92, y: 24 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 24 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-700/60 shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">
                  {editing ? "Modifier le client" : "Nouveau client"}
                </h3>
                <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { key: "name", label: "Nom *", placeholder: "Jean Dupont", type: "text" },
                  { key: "email", label: "Email", placeholder: "jean@example.com", type: "email" },
                  { key: "phone", label: "Téléphone", placeholder: "+33 6 00 00 00 00", type: "tel" },
                  { key: "address", label: "Adresse", placeholder: "1 rue de la Paix, Paris", type: "text" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:border-blue-500/60 transition"
                    />
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <button
                  onClick={closeForm}
                  className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 hover:text-white hover:border-slate-600 text-sm font-medium transition"
                >
                  Annuler
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
                >
                  {saving ? "Sauvegarde…" : editing ? "Mettre à jour" : "Ajouter"}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
