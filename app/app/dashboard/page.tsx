import React from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { BarChart3, Package, DollarSign, ArrowUpRight } from "lucide-react";
import { query } from "@/lib/pg";
import DashboardCharts from "./DashboardCharts";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/index";

// ── Currency detection from Accept-Language header ──────────────────────────
const LOCALE_TO_CURRENCY: Record<string, string> = {
  // West African CFA
  "fr-SN": "XOF", "fr-ML": "XOF", "fr-BJ": "XOF", "fr-NE": "XOF",
  "fr-TG": "XOF", "fr-BF": "XOF", "fr-CI": "XOF", "fr-GW": "XOF",
  // Central African CFA
  "fr-CM": "XAF", "fr-GA": "XAF", "fr-CF": "XAF",
  "fr-CG": "XAF", "fr-TD": "XAF", "fr-GQ": "XAF",
  // North Africa
  "fr-MA": "MAD", "fr-TN": "TND", "fr-DZ": "DZD",
  // Europe
  "fr-FR": "EUR", "fr-BE": "EUR", "fr-LU": "EUR", "fr-CH": "CHF",
  "fr-MC": "EUR", "de-DE": "EUR", "es-ES": "EUR", "it-IT": "EUR",
  "pt-PT": "EUR", "nl-NL": "EUR",
  // Americas
  "en-US": "USD", "es-US": "USD", "fr-CA": "CAD", "en-CA": "CAD",
  "en-GB": "GBP", "en-AU": "AUD", "en-NZ": "NZD",
  // Sub-Saharan Africa
  "en-NG": "NGN", "en-GH": "GHS", "en-KE": "KES", "en-ZA": "ZAR",
  "en-TZ": "TZS", "en-UG": "UGX", "sw-KE": "KES",
  // Arab world
  "ar-MA": "MAD", "ar-TN": "TND", "ar-DZ": "DZD",
  "ar-EG": "EGP", "ar-SA": "SAR", "ar-AE": "AED",
};

function detectCurrency(acceptLanguage: string | null): string {
  return "XOF";
}

function formatCurrency(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("fr-BJ", {
      style: "currency",
      currency: "XOF",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    return `${amount.toFixed(0)} FCFA`;
  }
}

// ── Data fetching ────────────────────────────────────────────────────────────
async function getDashboardData() {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) redirect("/login");

  let uid = "";
  try {
    const parts = token.split(".");
    if (parts.length === 3) {
      const payload = JSON.parse(
        Buffer.from(
          parts[1].replace(/-/g, "+").replace(/_/g, "/"),
          "base64"
        ).toString()
      );
      uid = payload.sub;
    }
  } catch {
    redirect("/login");
  }

  if (!uid) redirect("/login");

  // Empty/zero baseline — never use mock data
  const emptyResult = {
    company: null as any,
    products: [] as any[],
    sales: [] as any[],
  };

  try {
    const [companyRes, productsRes, salesRes] = await Promise.all([
      query(
        `SELECT id, name, admin_email as "adminEmail", admin_uid as "adminUid", status, 
                trial_start as "trialStart", subscription_end as "subscriptionEnd", created_at as "createdAt" 
         FROM companies WHERE id = $1`,
        [uid]
      ),
      query(
        `SELECT id, name, price, quantity, company_id as "companyId" 
         FROM products WHERE company_id = $1`,
        [uid]
      ),
      query(
        `SELECT id, product_name as "productName", product_id as "productId", quantity, price, amount, 
                client_name as "clientName", company_id as "companyId", created_at as "createdAt" 
         FROM sales WHERE company_id = $1`,
        [uid]
      ),
    ]);

    const company = companyRes.rows.length > 0 ? companyRes.rows[0] : null;
    const products = productsRes.rows;
    const sales = salesRes.rows;

    return { company, products, sales };
  } catch (error: any) {
    console.warn(
      `[Dashboard] Database unavailable (${error?.message}). Showing zeros.`
    );
    return emptyResult;
  }
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default async function DashboardPage() {
  const { company, products, sales } = await getDashboardData();

  // Detect currency from Accept-Language header
  const headerStore = await headers();
  const acceptLang = headerStore.get("accept-language");
  const currency = detectCurrency(acceptLang);

  // Metrics (all zero-safe)
  const totalProducts = products.length;
  const totalSalesCount = sales.length;
  const totalStockValue = products.reduce(
    (sum, p) => sum + (p.quantity || 0) * (p.price || 0),
    0
  );
  const totalCA = sales.reduce((sum, s) => sum + (s.amount || 0), 0);
  const avgBasket = totalSalesCount > 0 ? totalCA / totalSalesCount : 0;

  // Last 7 days chart data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - i);
    return d;
  }).reverse();

  const chartData = last7Days.map((date) => {
    const dateStr = date.toLocaleDateString("fr-FR", {
      day: "2-digit",
      month: "2-digit",
    });
    const amount = sales
      .filter((s) => {
        let sDate: Date;
        if (s.createdAt?.toDate) sDate = s.createdAt.toDate();
        else if (s.createdAt?._seconds) sDate = new Date(s.createdAt._seconds * 1000);
        else sDate = new Date(s.createdAt);
        return sDate.toDateString() === date.toDateString();
      })
      .reduce((sum, s) => sum + (s.amount || 0), 0);
    return { date: dateStr, amount };
  });

  const isDemo = !process.env.DATABASE_URL;

  return (
    <div className="space-y-8 animate-fade-up">
      {/* Demo / config notice */}
      {isDemo && (
        <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-800/40 text-cyan-400 text-xs flex items-start gap-3">
          <span className="text-lg leading-none">⚙️</span>
          <span>
            <strong>Mode hors-ligne</strong> — Configurez votre variable{" "}
            <code className="bg-slate-900 px-1 py-0.5 rounded">DATABASE_URL</code>{" "}
            dans `.env.local` pour connecter PostgreSQL.
          </span>
        </div>
      )}

      {/* Welcome */}
      <div className="flex flex-col space-y-1">
        <h1 className="text-3xl font-extrabold text-white font-grotesk tracking-tight">
          Bienvenue{company?.name ? `, ${company.name}` : ""}
        </h1>
        <p className="text-sm text-slate-400">
          Voici l&apos;état actuel de votre activité et de vos ventes.
        </p>
      </div>

      {/* Stat cards — all zero-safe */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {/* CA */}
        <Card className="animate-count-up" style={{ animationDelay: "0ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Chiffre d&apos;Affaires
              </CardTitle>
              <CardDescription>Revenus totaux</CardDescription>
            </div>
            <DollarSign className="h-5 w-5 text-emerald-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {formatCurrency(totalCA, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5">
              {totalSalesCount === 0
                ? "Aucune vente enregistrée"
                : `${totalSalesCount} transaction${totalSalesCount > 1 ? "s" : ""}`}
            </div>
          </CardContent>
        </Card>

        {/* Stock value */}
        <Card className="animate-count-up" style={{ animationDelay: "80ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Valeur du Stock
              </CardTitle>
              <CardDescription>Valorisation inventaire</CardDescription>
            </div>
            <Package className="h-5 w-5 text-cyan-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {formatCurrency(totalStockValue, currency)}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5">
              {totalProducts === 0
                ? "Aucun article référencé"
                : `Sur ${totalProducts} article${totalProducts > 1 ? "s" : ""}`}
            </div>
          </CardContent>
        </Card>

        {/* Sales volume */}
        <Card className="animate-count-up" style={{ animationDelay: "160ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Volume Ventes
              </CardTitle>
              <CardDescription>Transactions finalisées</CardDescription>
            </div>
            <BarChart3 className="h-5 w-5 text-purple-400 shrink-0" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono text-white">
              {totalSalesCount}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5">
              {avgBasket > 0
                ? `Panier moyen : ${formatCurrency(avgBasket, currency)}`
                : "Aucune vente"}
            </div>
          </CardContent>
        </Card>

        {/* Licence */}
        <Card className="animate-count-up" style={{ animationDelay: "240ms" }}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div className="space-y-0.5">
              <CardTitle className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Statut Licence
              </CardTitle>
              <CardDescription>Abonnement actif</CardDescription>
            </div>
            <div
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                company?.status === "active"
                  ? "bg-emerald-500 animate-ping"
                  : company?.status === "suspended"
                  ? "bg-red-500"
                  : "bg-cyan-500 animate-pulse"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold text-slate-100 uppercase tracking-wide">
              {company?.status === "active"
                ? "Licence Active"
                : company?.status === "suspended"
                ? "Suspendu"
                : "Période d'essai"}
            </div>
            <div className="text-[10px] text-slate-500 mt-1.5">
              {company?.status === "active"
                ? "Renouvellement automatique"
                : company?.status === "suspended"
                ? "Contactez le support"
                : "Clé d'activation requise après essai"}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card className="p-6">
        <div className="flex flex-col space-y-1 mb-6">
          <CardTitle className="text-base">Graphique d&apos;Activité</CardTitle>
          <CardDescription>
            Chiffre d&apos;affaires journalier — 7 derniers jours ({currency})
          </CardDescription>
        </div>
        <DashboardCharts data={chartData} currency={currency} />
      </Card>
    </div>
  );
}
