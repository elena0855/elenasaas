"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  TrendingUp, DollarSign, ShoppingCart, Package,
  Calendar, Download, BarChart3,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import {
  collection, query, where, getDocs, orderBy,
} from "firebase/firestore";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { jsPDF } from "jspdf";
import toast from "react-hot-toast";

type Period = "7d" | "30d" | "90d";

interface Sale {
  id: string;
  amount: number;
  createdAt: any;
  items?: { name: string; qty: number; price: number }[];
}

interface Product {
  id: string;
  name: string;
  quantity: number;
  price: number;
}

export default function ReportsPage() {
  const { user } = useAuth();
  const [period, setPeriod] = useState<Period>("30d");
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user || !db) return;
    const load = async () => {
      setLoading(true);
      try {
        const [salesSnap, productsSnap] = await Promise.all([
          getDocs(query(collection(db, "sales"), where("companyId", "==", user.uid), orderBy("createdAt", "desc"))),
          getDocs(query(collection(db, "products"), where("companyId", "==", user.uid))),
        ]);
        setSales(salesSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Sale)));
        setProducts(productsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Product)));
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [user]);

  // Filter sales by period
  const getDaysBack = () => ({ "7d": 7, "30d": 30, "90d": 90 }[period]);

  const filteredSales = sales.filter((s) => {
    const date = s.createdAt?.toDate?.() || new Date(s.createdAt?._seconds * 1000) || new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - getDaysBack());
    return date >= cutoff;
  });

  // Time-series data
  const chartData = Array.from({ length: getDaysBack() }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (getDaysBack() - 1 - i));
    const label = d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
    const amount = filteredSales
      .filter((s) => {
        const sd = s.createdAt?.toDate?.() || new Date(s.createdAt?._seconds * 1000);
        return sd?.toDateString() === d.toDateString();
      })
      .reduce((acc, s) => acc + (s.amount || 0), 0);
    return { date: label, amount };
  });

  // Top products by revenue
  const productRevenue: Record<string, { name: string; revenue: number; qty: number }> = {};
  filteredSales.forEach((s) => {
    (s.items || []).forEach((item) => {
      if (!productRevenue[item.name]) productRevenue[item.name] = { name: item.name, revenue: 0, qty: 0 };
      productRevenue[item.name].revenue += item.price * item.qty;
      productRevenue[item.name].qty += item.qty;
    });
  });
  const topProducts = Object.values(productRevenue)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

  // Stock distribution for pie chart
  const stockPie = products
    .filter((p) => p.quantity > 0)
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 6)
    .map((p) => ({ name: p.name, value: p.quantity }));

  // KPIs
  const totalCA = filteredSales.reduce((s, sale) => s + (sale.amount || 0), 0);
  const totalTransactions = filteredSales.length;
  const avgBasket = totalTransactions > 0 ? totalCA / totalTransactions : 0;
  const stockValue = products.reduce((s, p) => s + p.quantity * p.price, 0);

  const PIE_COLORS = ["#06B6D4", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#6366F1"];

  const downloadReport = () => {
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.setTextColor(6, 182, 212);
    doc.text("RAPPORT ELENA", 105, 20, { align: "center" });
    doc.setFontSize(11);
    doc.setTextColor(80, 80, 80);
    doc.text(`Période : ${period === "7d" ? "7 jours" : period === "30d" ? "30 jours" : "90 jours"}`, 20, 35);
    doc.text(`Généré le : ${new Date().toLocaleDateString("fr-FR")}`, 20, 42);
    doc.setDrawColor(6, 182, 212);
    doc.line(20, 48, 190, 48);
    let y = 58;
    doc.setFont("helvetica", "bold");
    doc.text("Indicateurs clés", 20, y);
    y += 8;
    doc.setFont("helvetica", "normal");
    doc.text(`CA total : ${totalCA.toFixed(2)} €`, 20, y); y += 7;
    doc.text(`Transactions : ${totalTransactions}`, 20, y); y += 7;
    doc.text(`Panier moyen : ${avgBasket.toFixed(2)} €`, 20, y); y += 7;
    doc.text(`Valeur stock : ${stockValue.toFixed(2)} €`, 20, y);
    doc.save(`rapport-elena-${period}.pdf`);
    toast.success("Rapport PDF téléchargé !");
  };

  const PERIOD_LABELS: Record<Period, string> = {
    "7d": "7 derniers jours",
    "30d": "30 derniers jours",
    "90d": "90 derniers jours",
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-slate-900 border border-slate-700/60 rounded-xl px-3 py-2 shadow-xl text-xs">
          <p className="text-slate-400 mb-1">{label}</p>
          <p className="text-cyan-400 font-bold">{payload[0].value.toFixed(2)} €</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center">
            <TrendingUp className="h-5 w-5 text-pink-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white font-grotesk">Rapports & Analytiques</h1>
            <p className="text-xs text-slate-500">{PERIOD_LABELS[period]}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-xl overflow-hidden border border-slate-800/60">
            {(["7d", "30d", "90d"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-2 text-xs font-semibold transition ${
                  period === p
                    ? "bg-pink-500/20 text-pink-400"
                    : "bg-slate-900/50 text-slate-500 hover:text-slate-300"
                }`}
              >
                {p}
              </button>
            ))}
          </div>

          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={downloadReport}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/40 text-slate-300 hover:text-white text-sm font-medium transition"
          >
            <Download className="h-4 w-4" />
            PDF
          </motion.button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Chiffre d'affaires", value: `${totalCA.toFixed(2)} €`, icon: DollarSign, color: "emerald", sub: `${totalTransactions} transactions` },
          { label: "Panier moyen", value: `${avgBasket.toFixed(2)} €`, icon: ShoppingCart, color: "cyan", sub: "Par transaction" },
          { label: "Transactions", value: totalTransactions, icon: BarChart3, color: "purple", sub: PERIOD_LABELS[period] },
          { label: "Valeur stock", value: `${stockValue.toFixed(0)} €`, icon: Package, color: "amber", sub: `${products.length} produits` },
        ].map((kpi, i) => {
          const Icon = kpi.icon;
          const colorMap: Record<string, { icon: string; bg: string }> = {
            emerald: { icon: "text-emerald-400", bg: "bg-emerald-500/10" },
            cyan:    { icon: "text-cyan-400",    bg: "bg-cyan-500/10" },
            purple:  { icon: "text-purple-400",  bg: "bg-purple-500/10" },
            amber:   { icon: "text-amber-400",   bg: "bg-amber-500/10" },
          };
          const c = colorMap[kpi.color];
          return (
            <motion.div
              key={kpi.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              className="rounded-2xl bg-slate-900/60 border border-slate-800/50 p-5 backdrop-blur-md"
            >
              <div className="flex items-start justify-between mb-3">
                <p className="text-xs text-slate-500 font-medium">{kpi.label}</p>
                <div className={`h-8 w-8 rounded-lg ${c.bg} flex items-center justify-center`}>
                  <Icon className={`h-4 w-4 ${c.icon}`} />
                </div>
              </div>
              <p className="text-2xl font-bold text-white font-mono">{kpi.value}</p>
              <p className="text-[10px] text-slate-500 mt-1">{kpi.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {loading ? (
        <div className="py-24 flex items-center justify-center text-slate-500">
          <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mr-3" />
          Chargement des données...
        </div>
      ) : (
        <>
          {/* Area chart — CA over time */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-md p-6"
          >
            <div className="flex items-center gap-2 mb-6">
              <TrendingUp className="h-4 w-4 text-cyan-400" />
              <h3 className="font-semibold text-slate-200 text-sm">Évolution du chiffre d'affaires</h3>
            </div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#06B6D4" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#06B6D4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(51,65,85,0.3)" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone" dataKey="amount" stroke="#06B6D4" strokeWidth={2}
                  fill="url(#caGrad)" dot={false} activeDot={{ r: 4, fill: "#06B6D4" }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Bottom row: top products + stock pie */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top products bar chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="rounded-2xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-md p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <BarChart3 className="h-4 w-4 text-purple-400" />
                <h3 className="font-semibold text-slate-200 text-sm">Top produits vendus</h3>
              </div>
              {topProducts.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-500">
                  <BarChart3 className="h-8 w-8 text-slate-700" />
                  <p className="text-xs">Aucune vente avec détail produits</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 8, right: 8 }}>
                    <defs>
                      <linearGradient id="barGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                    <XAxis type="number" tick={{ fontSize: 10, fill: "#64748b" }} tickLine={false} axisLine={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#94a3b8" }} tickLine={false} axisLine={false} width={80} />
                    <Tooltip
                      formatter={(v: any) => [`${Number(v).toFixed(2)} €`, "CA"]}
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(51,65,85,0.6)", borderRadius: 12, fontSize: 11 }}
                    />
                    <Bar dataKey="revenue" fill="url(#barGrad)" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </motion.div>

            {/* Stock pie chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="rounded-2xl bg-slate-900/60 border border-slate-800/50 backdrop-blur-md p-6"
            >
              <div className="flex items-center gap-2 mb-6">
                <Package className="h-4 w-4 text-emerald-400" />
                <h3 className="font-semibold text-slate-200 text-sm">Répartition du stock</h3>
              </div>
              {stockPie.length === 0 ? (
                <div className="py-12 flex flex-col items-center gap-2 text-slate-500">
                  <Package className="h-8 w-8 text-slate-700" />
                  <p className="text-xs">Aucun produit en stock</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={stockPie}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {stockPie.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: any, n: any, p: any) => [`${v} unités`, p.payload.name]}
                      contentStyle={{ background: "#0f172a", border: "1px solid rgba(51,65,85,0.6)", borderRadius: 12, fontSize: 11 }}
                    />
                    <Legend
                      formatter={(v) => <span style={{ color: "#94a3b8", fontSize: 11 }}>{v}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </motion.div>
          </div>
        </>
      )}
    </div>
  );
}
