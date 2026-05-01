// src/hooks/useTheme.js
import { useState, useEffect } from "react";

export const DARK = {
  bg: "#070B14", bgCard: "#0F1629", bgCard2: "#151E35",
  nav: "rgba(7,11,20,0.96)", border: "rgba(255,255,255,0.07)",
  text: "#F1F5F9", muted: "#8892A4", gold: "#F59E0B",
  saffron: "#F97316", green: "#10B981", accent: "#6366F1",
  accentBg: "rgba(99,102,241,0.12)", red: "#EF4444",
  shadow: "rgba(0,0,0,0.4)",
};

export const LIGHT = {
  bg: "#F8FAFF", bgCard: "#FFFFFF", bgCard2: "#EEF2FF",
  nav: "rgba(248,250,255,0.96)", border: "rgba(0,0,0,0.08)",
  text: "#0F172A", muted: "#64748B", gold: "#D97706",
  saffron: "#EA580C", green: "#059669", accent: "#4F46E5",
  accentBg: "rgba(79,70,229,0.08)", red: "#DC2626",
  shadow: "rgba(15,23,42,0.12)",
};

export default function useTheme() {
  // 1. Check localStorage first, then system preference
  const getInitial = () => {
    try {
      const saved = localStorage.getItem("dg-theme");
      if (saved !== null) return saved === "dark";
    } catch {}
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  };

  const [dark, setDark] = useState(getInitial);

  // 2. Save to localStorage on change
  useEffect(() => {
    try { localStorage.setItem("dg-theme", dark ? "dark" : "light"); } catch {}
    // Also set data-theme on html for any CSS that needs it
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
  }, [dark]);

  // 3. Listen to system changes (only if user hasn't manually set)
  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e) => {
      try {
        if (!localStorage.getItem("dg-theme")) setDark(e.matches);
      } catch { setDark(e.matches); }
    };
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const t = dark ? DARK : LIGHT;
  const toggleTheme = () => setDark(d => !d);

  return { dark, t, toggleTheme };
}