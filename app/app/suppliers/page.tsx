"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Truck, Plus, Search, Phone, Mail, Trash2, Edit3, X,
  Globe, Package, Star,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, onSnapshot, query, where, orderBy, serverTimestamp,
} from "firebase/firestore";
import toast from "react-hot-toast";

interface Supplier {
  id: string;
  name: string;
  email: string;
  phone: string;
  website?: string;
  category?: string;
  productsCount: number;
  rating: number;
  createdAt: any;
}

const EMPTY = { name: "", email: "", phone: "", website: "", category: "" };

const CATEGORIES = ["Alimentaire", "Boissons", "Électronique", "Vêtements", "Cosmétiques", "Autre"];

export default function SuppliersPage() {
  const { user } = useAuth();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(
      collection(db, "suppliers"),
      where("companyId", "==", user.uid),
      orderBy("createdAt", "desc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setSuppliers(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Supplier)));
      setLoading(false);
    });
    return () => unsub();
  }, [user]);

  const openCreate = () => { setEditing(null); setForm(EMPTY); setShowForm(true); };
  const openEdit = (s: Supplier) => {
    setEditing(s);
    setForm({ name: s.name, email: s.email, phone: s.phone, website: s.website || "", category: s.category || "" });
    setShowForm(true);
  };
  const closeForm = () => { setShowForm(false); setEditing(null); };

  const handleSave = async () => {
    if (!form.name.trim()) return toast.error("Nom requis");
    if (!user || !db) return;
    setSaving(true);
    try {
      if (editing) {
        await updateDoc(doc(db, "suppliers", editing.id), {
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          website: form.website?.trim() || "",
          category: form.category || "",
        });
        toast.success("Fournisseur mis à jour");
      } else {
        await addDoc(collection(db, "suppliers"), {
          companyId: user.uid,
          name: form.name.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          website: form.website?.trim() || "",
          category: form.category || "Autre",
          productsCount: 0,
          rating: 5,
          createdAt: serverTimestamp(),
        });
        toast.success("Fournisseur ajouté !");
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
      await deleteDoc(doc(db, "suppliers", id));
      toast.success("Fournisseur supprimé");
    } catch {
      toast.error("Erreur suppression");
    } finally {
      setDeleting(null);
    }
  };

  const filtered = suppliers.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.category?.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
            <Truck className="h-5 w-5 text-orange-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-grotesk">Fournisseurs</h1>
            <p className="text-xs text-slate-500">{suppliers.length} fournisseur{suppliers.length !== 1 ? "s" : ""} référencés</p>
          </div>
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-sm hover:opacity-90 transition shadow-lg shadow-orange-500/20"
        >
          <Plus className="h-4 w-4" />
          Nouveau fournisseur
        </motion.button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Fournisseurs actifs", value: suppliers.length, color: "orange" },
          { label: "Catégories couvertes", value: new Set(suppliers.map((s) => s.category)).size, color: "amber" },
          { label: "Produits liés", value: suppliers.reduce((s, f) => s + f.productsCount, 0), color: "yellow" },
        ].map((s, i) => (
          <motion.div
            key={s.label}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="rounded-2xl bg-slate-900/60 border border-slate-800/50 p-4"
          >
            <p className="text-xs text-slate-500 font-medium">{s.label}</p>
            <p className="text-2xl font-bold text-white mt-1 font-mono">{s.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un fournisseur ou catégorie..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/50 text-white text-sm focus:outline-none focus:border-orange-500/60 transition"
        />
      </div>

      {/* List */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/50 overflow-hidden backdrop-blur-md">
        {loading ? (
          <div className="py-16 flex items-center justify-center text-slate-500 text-sm">Chargement...</div>
        ) : filtered.length === 0 ? (
          <div className="py-16 flex flex-col items-center gap-3 text-slate-500">
            <Truck className="h-10 w-10 text-slate-700" />
            <p className="text-sm">{search ? "Aucun résultat" : "Aucun fournisseur encore"}</p>
            {!search && (
              <button onClick={openCreate} className="text-xs text-orange-400 hover:underline">
                Ajouter le premier fournisseur →
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800/40">
            <AnimatePresence>
              {filtered.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, x: -16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 16 }}
                  transition={{ delay: i * 0.04 }}
                  className="px-5 py-4 flex items-center justify-between hover:bg-slate-800/20 transition group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Avatar */}
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-500 flex items-center justify-center text-slate-950 font-bold text-sm shrink-0">
                      {s.name.slice(0, 2).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-white text-sm">{s.name}</p>
                        {s.category && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-[10px] font-semibold">
                            {s.category}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        {s.email && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Mail className="h-3 w-3" />
                            <span className="truncate max-w-[160px]">{s.email}</span>
                          </div>
                        )}
                        {s.phone && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <Phone className="h-3 w-3" />
                            <span>{s.phone}</span>
                          </div>
                        )}
                        {s.website && (
                          <a href={s.website} target="_blank" rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400">
                            <Globe className="h-3 w-3" />
                            Site web
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 shrink-0">
                    <div className="flex items-center gap-1 text-xs text-slate-400">
                      <Package className="h-3 w-3" />
                      <span>{s.productsCount} produits</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-3 w-3 ${j < s.rating ? "text-amber-400 fill-amber-400" : "text-slate-700"}`} />
                      ))}
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                      <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg hover:bg-slate-700/50 text-slate-400 hover:text-cyan-400 transition">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(s.id)} disabled={deleting === s.id} className="p-1.5 rounded-lg hover:bg-red-950/30 text-slate-400 hover:text-red-400 transition">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Modal */}
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
                  {editing ? "Modifier le fournisseur" : "Nouveau fournisseur"}
                </h3>
                <button onClick={closeForm} className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-3">
                {[
                  { key: "name", label: "Nom *", placeholder: "Société Martin", type: "text" },
                  { key: "email", label: "Email", placeholder: "contact@martin.fr", type: "email" },
                  { key: "phone", label: "Téléphone", placeholder: "+33 1 00 00 00 00", type: "tel" },
                  { key: "website", label: "Site web", placeholder: "https://martin.fr", type: "url" },
                ].map((f) => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">{f.label}</label>
                    <input
                      type={f.type}
                      placeholder={f.placeholder}
                      value={(form as any)[f.key]}
                      onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:border-orange-500/60 transition"
                    />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Catégorie</label>
                  <select
                    value={form.category}
                    onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-800/60 border border-slate-700/50 text-white text-sm focus:outline-none focus:border-orange-500/60 transition"
                  >
                    <option value="">Sélectionner...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={closeForm} className="flex-1 py-2.5 rounded-xl border border-slate-700/50 text-slate-400 text-sm font-medium hover:border-slate-600 hover:text-white transition">
                  Annuler
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 font-bold text-sm hover:opacity-90 transition disabled:opacity-50"
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
