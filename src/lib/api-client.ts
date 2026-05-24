/**
 * Wrapper fetch that automatically handles 401 responses.
 * If the server returns 401 → auto-disconnect and redirect to login.
 *
 * Usage: Replace `fetch(url, options)` with `apiFetch(url, options)`
 * in all protected API calls from client components.
 */

async function handleUnauthorized() {
  console.warn("[ApiClient] Received 401 - clearing session");

  // Clear cookies on client side
  document.cookie = "postflow_token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "auth-token=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  document.cookie = "session=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";

  // Call logout API to clear httpOnly cookies
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {
    // Ignore if the route doesn't exist
  }

  // Redirect to login with reason
  window.location.href = "/login?reason=session_expired";
}

export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const response = await fetch(url, options);

  // 401 = session invalid (user deleted, token expired, etc.)
  if (response.status === 401) {
    await handleUnauthorized();
    // Return the response anyway to avoid errors in calling code
    return response;
  }

  return response;
}
