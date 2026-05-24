import { useState, useCallback, useRef } from "react";

/**
 * [FIX #8] Reusable hook for async actions with reliable double-click protection.
 *
 * Avant: La protection contre le double-clic utilisait `isLoading` (useState)
 * dans une closure `useCallback`. Entre le premier clic et le re-render React
 * qui met à jour la closure, deux clics rapides dans le même cycle de rendu
 * voyaient tous les deux `isLoading === false`, contournant la protection.
 *
 * Maintenant: Un `useRef` (loadingRef) est utilisé comme verrou immédiat.
 * Le ref se met à jour de manière synchrone, avant même que React ne
 * re-render. Le `useState` (isLoading) est conservé uniquement pour
 * déclencher le re-render de l'UI (bouton désactivé, spinner, etc.).
 */
export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);
  const loadingRef = useRef(false);

  const execute = useCallback(async (action: () => Promise<void>) => {
    // Vérification synchrone via ref — immune aux stale closures
    if (loadingRef.current) return;
    loadingRef.current = true;
    setIsLoading(true);

    try {
      await action();
    } finally {
      loadingRef.current = false;
      setIsLoading(false);
    }
  }, []);

  return { isLoading, execute };
}
