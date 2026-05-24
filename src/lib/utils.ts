import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * [FIX #7] Échappe les caractères spéciaux de regex dans une chaîne.
 *
 * Sans cet échappement, un utilisateur peut injecter des métacaractères
 * regex (comme `(a+)+$`) dans les paramètres de recherche, provoquant
 * un ReDoS (catastrophic backtracking) sur le serveur MongoDB.
 *
 * Exemple:
 *   escapeRegExp("react+native") → "react\\+native"
 *   escapeRegExp("a(b+)+c")     → "a\\(b\\+\\)\\+c"
 *
 * Cette fonction DOIT être appliquée sur toute entrée utilisateur avant
 * de la passer à l'opérateur MongoDB `$regex`.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * [FIX #13] Échappe les caractères HTML spéciaux pour empêcher l'injection
 * HTML dans les templates d'emails.
 *
 * Sans cet échappement, un pseudo comme `<b>admin</b>` ou
 * `<img src=x onerror=...>` serait injecté tel quel dans le HTML de
 * l'email, permettant du HTML injection voire du XSS dans certains
 * clients mail webmail.
 *
 * @param str - La chaîne à échapper
 * @returns La chaîne avec les caractères HTML remplacés par leurs entités
 */
export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}
