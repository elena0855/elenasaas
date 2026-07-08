"use client";

import { useEffect } from "react";

export default function PWARegistration() {
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").then((reg) => {
        console.log("Service Worker registered successfully with scope:", reg.scope);
      }).catch((err) => {
        console.warn("Service worker registration failed:", err);
      });
    }
  }, []);

  return null;
}
