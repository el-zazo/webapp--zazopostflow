"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
// [FIX #14] Utilisation de apiFetch au lieu de fetch natif.
// Avant: `fetch("/api/auth/me")` ne gérait pas les 401 correctement.
// Quand un JWT expiré existait dans le cookie, le flux était:
// / → fetch 401 → router.push("/login") → middleware voit le cookie →
// /dashboard → 401 → clear cookie → /login?reason=session_expired
// (3 redirections + flash du dashboard).
// Maintenant: apiFetch intercepte le 401, efface le cookie immédiatement
// et redirige directement vers /login?reason=session_expired en une seule étape.
import { apiFetch } from "@/lib/api-client";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Check if user is authenticated and redirect accordingly
    const checkAuth = async () => {
      try {
        const res = await apiFetch("/api/auth/me");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            router.push("/dashboard");
            return;
          }
        }
      } catch {
        // Not authenticated — apiFetch already handles 401 redirect
        return;
      }
      // Only push to /login if apiFetch didn't already redirect (e.g. non-401 error)
      router.push("/login");
    };
    checkAuth();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
