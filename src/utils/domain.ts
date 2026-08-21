/** Domains where typing is never captured (banking / health / auth sites).
 * These are only suggestions, surfaced in settings; users can add their own
 * exact-match exclusions on top of these. */
export const SUGGESTED_EXCLUSIONS: string[] = [
  "accounts.google.com",
  "login.microsoftonline.com",
  "appleid.apple.com",
  "paypal.com",
  "stripe.com",
  "chase.com",
  "bankofamerica.com",
  "wellsfargo.com",
  "usbank.com",
  "medicare.gov",
  "myhealthrecord.com",
  "myhealthchart.org",
  "lastpass.com",
  "1password.com"
];

/** Normalizes a hostname for exclusion matching (drops "www.", lowercases). */
export function normalizeDomain(host: string): string {
  return host.replace(/^www\./, "").toLowerCase();
}

/** Extracts and normalizes the domain (hostname) from a full URL. */
export function extractDomain(url: string): string {
  try {
    return normalizeDomain(new URL(url).hostname);
  } catch {
    return normalizeDomain(url);
  }
}

/** True when the normalized domain is an exact match in the exclusion list. */
export function isExcluded(domain: string, excludedDomains: string[]): boolean {
  const normalized = normalizeDomain(domain);
  return excludedDomains.some((d) => normalizeDomain(d) === normalized);
}