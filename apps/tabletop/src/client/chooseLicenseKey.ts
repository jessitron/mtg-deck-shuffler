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
