/**
 * Where the "forgot password" e-mail link should land. Always built from the
 * current origin so the same code works in preview, published and on a custom
 * domain.
 */
export function resetRedirectUrl(origin: string): string {
  return `${origin.replace(/\/+$/, "")}/reset-password`;
}

/**
 * A password-reset link arrives in one of two shapes:
 *  - `#access_token=…&type=recovery` (token flow)
 *  - `?code=…` (PKCE flow, exchanged by the Supabase client)
 * Anything else — a signup confirmation link, a plain visit — is not a reset.
 */
export function isRecoveryUrl(href: string): boolean {
  try {
    const url = new URL(href);
    if (url.searchParams.has("code")) return true;
    const hash = url.hash.startsWith("#") ? url.hash.slice(1) : url.hash;
    return new URLSearchParams(hash).get("type") === "recovery";
  } catch {
    return false;
  }
}
