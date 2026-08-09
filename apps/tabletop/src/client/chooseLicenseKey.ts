/**
 * Which tldraw licenseKey to pass, decided by origin.
 *
 * tldraw >= 4 HIDES THE WHOLE EDITOR 5 SECONDS AFTER LOAD when it decides it's
 * an unlicensed production deployment — the canvas is replaced by a hidden
 * <div data-testid="tl-license-expired">, i.e. a blank white page. "Production"
 * is decided by URL alone: an HTTPS non-loopback origin. Plain http and
 * loopback hosts are exempt — which is why prod serves http:// on purpose
 * (see README → Licensing). See @tldraw/editor/src/lib/license/LicenseProvider.tsx.
 *
 * The gate's dev exemption only covers MISSING or unparseable keys: a parseable
 * but EXPIRED key returns 'expired' from getLicenseState unconditionally and
 * blanks the canvas even where no key is needed. So where the gate cannot fire,
 * withhold the key — then the table works no matter what state the key is in.
 *
 * Withholding means EMPTY STRING, not undefined: when the prop is undefined,
 * LicenseProvider falls back to reading the key from the environment itself —
 * including import.meta.env.VITE_TLDRAW_LICENSE_KEY, which vite's `define`
 * rewrote to the key literal inside tldraw's own bundled code. "" defeats the
 * fallback and still takes the no-key path in getLicenseFromKey.
 */
export function chooseLicenseKey(
  protocol: string,
  hostname: string,
  bakedKey: string | undefined,
): string | undefined {
  const gateCanFire = protocol === "https:" && !isLoopbackHost(hostname);
  return gateCanFire ? bakedKey : "";
}

// Mirrors tldraw's own isLoopbackHost.
function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  return host === "localhost" || host === "::1" || /^127(?:\.\d{1,3}){3}$/.test(host);
}
