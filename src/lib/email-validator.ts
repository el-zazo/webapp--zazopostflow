/**
 * Advanced Email Validator - Multi-step verification
 * Inspired by python email_verifier project
 * Uses 4 free keyless APIs + DNS check + static blocklist
 */

// ─── Cache de la blocklist (chargée une fois) ───────────────────────────────
let cachedBlocklist: Set<string> | null = null;
let blocklistLoadedAt: number | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

// Fallback si GitHub inaccessible
const FALLBACK_BLOCKLIST = new Set([
  "mailinator.com", "mailinator2.com", "guerrillamail.com", "guerrillamail.net",
  "guerrillamail.org", "guerrillamail.biz", "guerrillamail.de", "guerrillamail.info",
  "temp-mail.org", "temp-mail.io", "tempmail.com", "tempmail.net", "tempmail.org",
  "yopmail.com", "yopmail.fr", "trashmail.com", "trashmail.de", "trashmail.net",
  "trashmail.org", "trashmail.at", "trashmail.me", "trashmail.io",
  "10minutemail.com", "10minutemail.net", "10minutemail.org", "10minemail.com",
  "fakeinbox.com", "fakemailgenerator.com", "maildrop.cc", "mailnull.com",
  "throwaway.email", "throwam.com", "dispostable.com", "discardmail.com",
  "sharklasers.com", "spamgourmet.com", "tempr.email", "tempinbox.com",
  "mohmal.com", "emailondeck.com", "spam4.me", "grr.la",
  "test.com", "test.net", "test.org", "test.test",
  "example.com", "example.net", "example.org",
  "mailnesia.com", "mailexpire.com", "spamspot.com",
  "rcpt.at", "recode.me", "tmailinator.com",
  "trbvm.com", "objectmail.com", "pookmail.com",
  "wetrainbayarea.org", "zippymail.info", "zoemail.org",
]);

// Domaines majeurs de confiance (toujours acceptés)
const MAJOR_PROVIDERS = new Set([
  "gmail.com", "googlemail.com",
  "outlook.com", "hotmail.com", "live.com", "msn.com",
  "yahoo.com", "yahoo.fr", "yahoo.co.uk", "yahoo.es",
  "icloud.com", "me.com", "mac.com",
  "aol.com", "protonmail.com", "proton.me",
  "zoho.com", "fastmail.com",
]);

// TLDs invalides
const INVALID_TLDS = new Set([
  "test", "invalid", "localhost", "example", "local", "internal", "fake", "temp",
]);

// ─── Types ──────────────────────────────────────────────────────────────────
interface ValidationResult {
  valid: boolean;
  reason: string;
  step?: string;
}

interface ApiCheckResult {
  api: string;
  disposable: boolean;
  available: boolean;
  error?: string;
}

// ─── Step 1: Syntaxe ────────────────────────────────────────────────────────
function checkSyntax(email: string): ValidationResult {
  const trimmed = email.trim().toLowerCase();

  if (!trimmed) {
    return { valid: false, reason: "Email is required", step: "syntax" };
  }

  // Format de base strict
  const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return { valid: false, reason: "Invalid email format", step: "syntax" };
  }

  const [localPart, domain] = trimmed.split("@");

  // Longueur partie locale
  if (localPart.length < 1 || localPart.length > 64) {
    return { valid: false, reason: "Invalid email format", step: "syntax" };
  }

  // Domaine valide
  const domainParts = domain.split(".");
  if (domainParts.length < 2) {
    return { valid: false, reason: "Invalid email domain", step: "syntax" };
  }

  const tld = domainParts[domainParts.length - 1].toLowerCase();

  // TLD minimum 2 caractères
  if (tld.length < 2) {
    return { valid: false, reason: "Invalid email domain", step: "syntax" };
  }

  // TLD invalides
  if (INVALID_TLDS.has(tld)) {
    return {
      valid: false,
      reason: "This email domain is not accepted",
      step: "syntax",
    };
  }

  return { valid: true, reason: "valid_syntax", step: "syntax" };
}

// ─── Step 2: Blocklist statique (3 sources GitHub) ──────────────────────────
async function loadBlocklist(): Promise<Set<string>> {
  // Utiliser cache si valide
  if (
    cachedBlocklist &&
    blocklistLoadedAt &&
    Date.now() - blocklistLoadedAt < CACHE_TTL_MS
  ) {
    return cachedBlocklist;
  }

  const sources = [
    {
      url: "https://raw.githubusercontent.com/disposable-email-domains/disposable-email-domains/master/disposable_email_blocklist.conf",
      format: "txt",
    },
    {
      url: "https://raw.githubusercontent.com/disposable/disposable-email-domains/master/domains.txt",
      format: "txt",
    },
    {
      url: "https://raw.githubusercontent.com/ivolo/disposable-email-domains/master/index.json",
      format: "json",
    },
  ];

  const merged = new Set<string>();

  const fetchSource = async (source: { url: string; format: string }) => {
    try {
      const res = await fetch(source.url, {
        signal: AbortSignal.timeout(8000), // 8s timeout
      });

      if (!res.ok) return new Set<string>();

      if (source.format === "json") {
        const data: unknown[] = await res.json();
        return new Set<string>(
          data.filter((d): d is string => typeof d === "string").map((d) => d.trim().toLowerCase())
        );
      } else {
        const text = await res.text();
        return new Set<string>(
          text
            .split("\n")
            .map((l) => l.trim().toLowerCase())
            .filter((l) => l && !l.startsWith("#"))
        );
      }
    } catch {
      return new Set<string>();
    }
  };

  // Charger les 3 sources en parallèle
  const results = await Promise.allSettled(sources.map(fetchSource));

  for (const result of results) {
    if (result.status === "fulfilled") {
      result.value.forEach((d) => merged.add(d));
    }
  }

  if (merged.size > 0) {
    cachedBlocklist = merged;
    blocklistLoadedAt = Date.now();
    console.log(`[EmailValidator] Blocklist loaded: ${merged.size} domains`);
    return merged;
  }

  // Fallback si toutes les sources échouent
  console.log("[EmailValidator] Using fallback blocklist");
  return FALLBACK_BLOCKLIST;
}

async function checkBlocklist(domain: string): Promise<ValidationResult> {
  const blocklist = await loadBlocklist();

  if (blocklist.has(domain.toLowerCase())) {
    return {
      valid: false,
      reason: "Disposable email addresses are not allowed. Please use a real email address.",
      step: "blocklist",
    };
  }

  return { valid: true, reason: "not_in_blocklist", step: "blocklist" };
}

// ─── Step 3: DNS/MX Check ───────────────────────────────────────────────────
async function checkDNS(domain: string): Promise<ValidationResult & { isMajorProvider?: boolean }> {
  // Domaines majeurs: skip DNS (on leur fait confiance)
  if (MAJOR_PROVIDERS.has(domain.toLowerCase())) {
    return {
      valid: true,
      reason: "major_provider_trusted",
      step: "dns",
      isMajorProvider: true,
    };
  }

  try {
    // Utiliser l'API DNS publique de Google (pas besoin de bibliothèque)
    const res = await fetch(
      `https://dns.google/resolve?name=${encodeURIComponent(domain)}&type=MX`,
      { signal: AbortSignal.timeout(5000) }
    );

    if (!res.ok) {
      // En cas d'erreur DNS API → accepter (benefit of doubt)
      return { valid: true, reason: "dns_api_unavailable", step: "dns" };
    }

    const data = await res.json();

    // Status 0 = NOERROR, Status 3 = NXDOMAIN (domaine inexistant)
    if (data.Status === 3) {
      return {
        valid: false,
        reason: "Email domain does not exist",
        step: "dns",
      };
    }

    // Vérifier si des enregistrements MX existent
    const hasMX = data.Answer && data.Answer.length > 0;
    if (!hasMX && data.Status === 0) {
      // Pas de MX → domaine existe mais ne reçoit pas d'emails
      return {
        valid: false,
        reason: "This email domain cannot receive emails",
        step: "dns",
      };
    }

    return { valid: true, reason: "mx_found", step: "dns" };
  } catch {
    // Timeout ou erreur réseau → accepter (benefit of doubt)
    return { valid: true, reason: "dns_check_skipped", step: "dns" };
  }
}

// ─── Step 4: APIs gratuites sans clé ────────────────────────────────────────
async function checkDisify(email: string): Promise<ApiCheckResult> {
  try {
    const res = await fetch(`https://www.disify.com/api/email/${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { api: "Disify", disposable: false, available: false };
    const data = await res.json();
    return {
      api: "Disify",
      disposable: Boolean(data.disposable),
      available: true,
    };
  } catch (e) {
    return { api: "Disify", disposable: false, available: false, error: String(e) };
  }
}

async function checkKickbox(domain: string): Promise<ApiCheckResult> {
  try {
    const res = await fetch(`https://open.kickbox.com/v1/disposable/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { api: "Kickbox", disposable: false, available: false };
    const data = await res.json();
    return {
      api: "Kickbox",
      disposable: Boolean(data.disposable),
      available: true,
    };
  } catch (e) {
    return { api: "Kickbox", disposable: false, available: false, error: String(e) };
  }
}

async function checkDeBounce(email: string): Promise<ApiCheckResult> {
  try {
    const res = await fetch(`https://disposable.debounce.io/?email=${encodeURIComponent(email)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return { api: "DeBounce", disposable: false, available: false };
    const data = await res.json();
    const isDisposable = String(data.disposable).toLowerCase() === "true";
    return {
      api: "DeBounce",
      disposable: isDisposable,
      available: true,
    };
  } catch (e) {
    return { api: "DeBounce", disposable: false, available: false, error: String(e) };
  }
}

async function checkValidatorPizza(domain: string): Promise<ApiCheckResult> {
  try {
    const res = await fetch(`https://www.validator.pizza/domain/${encodeURIComponent(domain)}`, {
      signal: AbortSignal.timeout(5000),
    });
    // 429 = rate limit (120 req/h) → skip gracefully
    if (res.status === 429) {
      return { api: "ValidatorPizza", disposable: false, available: false, error: "rate_limit" };
    }
    if (!res.ok) return { api: "ValidatorPizza", disposable: false, available: false };
    const data = await res.json();
    return {
      api: "ValidatorPizza",
      disposable: Boolean(data.disposable),
      available: true,
    };
  } catch (e) {
    return { api: "ValidatorPizza", disposable: false, available: false, error: String(e) };
  }
}

async function checkExternalAPIs(
  email: string,
  domain: string
): Promise<ValidationResult> {
  // Lancer les 4 APIs en parallèle
  const [disify, kickbox, debounce, validatorPizza] = await Promise.all([
    checkDisify(email),
    checkKickbox(domain),
    checkDeBounce(email),
    checkValidatorPizza(domain),
  ]);

  const results = [disify, kickbox, debounce, validatorPizza];
  const availableResults = results.filter((r) => r.available);

  // Log pour debug
  for (const r of results) {
    if (r.available) {
      console.log(`[EmailValidator] ${r.api}: disposable=${r.disposable}`);
    } else {
      console.log(`[EmailValidator] ${r.api}: unavailable (${r.error || "timeout"})`);
    }
  }

  // Si au moins 1 API disponible flag comme disposable → rejeter
  const flaggedBy = availableResults.filter((r) => r.disposable);
  if (flaggedBy.length > 0) {
    return {
      valid: false,
      reason: "Disposable email addresses are not allowed. Please use a real email address.",
      step: "api_checks",
    };
  }

  // Si aucune API disponible → benefit of doubt (accepter)
  if (availableResults.length === 0) {
    return {
      valid: true,
      reason: "all_apis_unavailable_trusted",
      step: "api_checks",
    };
  }

  return {
    valid: true,
    reason: `not_disposable_${availableResults.length}_apis_checked`,
    step: "api_checks",
  };
}

// ─── Fonction principale ─────────────────────────────────────────────────────
export async function validateEmailAdvanced(email: string): Promise<{
  valid: boolean;
  reason: string;
  userMessage?: string;
}> {
  const normalized = email.trim().toLowerCase();

  // Step 1: Syntaxe
  const syntaxResult = checkSyntax(normalized);
  if (!syntaxResult.valid) {
    return {
      valid: false,
      reason: syntaxResult.reason,
      userMessage: syntaxResult.reason,
    };
  }

  const domain = normalized.split("@")[1];

  // Step 2: Blocklist statique
  const blocklistResult = await checkBlocklist(domain);
  if (!blocklistResult.valid) {
    return {
      valid: false,
      reason: blocklistResult.reason,
      userMessage: blocklistResult.reason,
    };
  }

  // Step 3: DNS/MX
  const dnsResult = await checkDNS(domain);
  if (!dnsResult.valid) {
    return {
      valid: false,
      reason: dnsResult.reason,
      userMessage: dnsResult.reason,
    };
  }

  // Domaines majeurs → skip APIs (confiance totale)
  if (dnsResult.isMajorProvider || MAJOR_PROVIDERS.has(domain)) {
    return { valid: true, reason: "major_provider_trusted" };
  }

  // Step 4: APIs externes
  const apiResult = await checkExternalAPIs(normalized, domain);
  if (!apiResult.valid) {
    return {
      valid: false,
      reason: apiResult.reason,
      userMessage: apiResult.reason,
    };
  }

  return { valid: true, reason: "all_checks_passed" };
}

// Export pour compatibilité avec l'ancien code
export function validateEmail(email: string): { valid: boolean; reason?: string } {
  // Version synchrone simplifiée (syntaxe + TLD seulement)
  // Pour la validation complète async → utiliser validateEmailAdvanced
  return checkSyntax(email.trim().toLowerCase());
}
