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