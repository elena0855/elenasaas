import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "@/lib/auth-context";
import PWARegistration from "@/components/PWARegistration";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "ELENA — SaaS B2B Point de Vente & Assistant Vocal",
  description: "Solution SaaS de point de vente, contrôle d'inventaire et comptabilité par assistant vocal intelligent.",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body
        className={`${inter.variable} ${spaceGrotesk.variable} antialiased bg-slate-950 text-slate-100 font-sans`}
      >
        <AuthProvider>
          {children}
          <PWARegistration />
          <Toaster
            position="top-right"
            toastOptions={{
              style: {
                background: "#1e293b",
                color: "#e2e8f0",
                border: "1px solid rgba(6,182,212,0.3)",
              },
            }}
          />
        </AuthProvider>
      </body>
    </html>
  );
}

