/**
 * Public origin (scheme + host) the browser used to reach the app.
 *
 * `new URL(request.url).origin` is only right on platforms that rewrite the
 * request URL for you (Vercel). With `next start` / the standalone server
 * behind a reverse proxy it is the bind address (e.g. https://localhost:3000),
 * so redirects built from it send users to the wrong place. The proxy forwards
 * the real host and scheme, so prefer those and fall back to request.url.
 */
export function getRequestOrigin(request: Request): string {
  const fallback = new URL(request.url)
  const headers = request.headers

  const host = (headers.get("x-forwarded-host") ?? headers.get("host") ?? "")
    .split(",")[0]
    .trim()
  const proto = (headers.get("x-forwarded-proto") ?? "")
    .split(",")[0]
    .trim()
    .toLowerCase()

  // Only trust a plausible hostname[:port]; anything else falls back.
  if (!/^[a-z0-9.-]+(:\d{1,5})?$/i.test(host)) return fallback.origin

  const scheme = proto === "http" || proto === "https" ? proto : fallback.protocol.replace(":", "")
  return `${scheme}://${host}`
}
