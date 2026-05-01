// src/hooks/usePWA.js — PWA install prompt + SW registration
import { useState, useEffect } from "react";

export default function usePWA() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [isInstalled, setIsInstalled]     = useState(false);
  const [swReady, setSwReady]             = useState(false);

  useEffect(() => {
    // Service Worker register karo
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => {
          console.log("[PWA] SW registered:", reg.scope);
          setSwReady(true);
        })
        .catch((err) => console.error("[PWA] SW failed:", err));
    }

    // Already installed check
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsInstalled(true);
    }

    // Install prompt capture karo
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Installed event
    window.addEventListener("appinstalled", () => {
      setIsInstalled(true);
      setInstallPrompt(null);
    });

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setIsInstalled(true);
    setInstallPrompt(null);
  };

  return { installPrompt, isInstalled, swReady, install };
}