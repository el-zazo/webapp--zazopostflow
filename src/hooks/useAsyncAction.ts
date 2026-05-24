import { useState, useCallback } from "react";

/**
 * Reusable hook for async actions with built-in double-click protection.
 * - `isLoading` tracks whether an action is in progress
 * - `execute` wraps an async function, guarding against concurrent calls
 * - The `finally` block always resets loading, even on errors
 */
export function useAsyncAction() {
  const [isLoading, setIsLoading] = useState(false);

  const execute = useCallback(async (action: () => Promise<void>) => {
    if (isLoading) return; // Double-click protection
    setIsLoading(true);
    try {
      await action();
    } finally {
      setIsLoading(false);
    }
  }, [isLoading]);

  return { isLoading, execute };
}
