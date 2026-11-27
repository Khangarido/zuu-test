// Where the SERVER talks to Supabase vs where the BROWSER does.
//
// The browser must use the public API URL (NEXT_PUBLIC_SUPABASE_URL). The Next.js server can talk to
// Supabase over the internal network instead (SUPABASE_INTERNAL_URL, e.g. http://supabase-envoy:8000),
// which skips a round trip out to the internet and back through the reverse proxy and TLS for every
// query and login check (measured ~0.2 s -> ~0.006 s per call). Unset => the public URL, as before.
//
// SERVER-ONLY. Do not import from client components.

const PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!

export function supabaseServerUrl(): string {
  return process.env.SUPABASE_INTERNAL_URL || PUBLIC_URL
}

// supabase-js names the auth cookie after the URL's first host label: sb-<label>-auth-token. The
// browser derives it from the PUBLIC url, so the server must use that same name even when it talks
// to a different (internal) host, otherwise login cookies would not be recognised.
export function supabaseAuthCookieName(): string {
  return `sb-${new URL(PUBLIC_URL).hostname.split(".")[0]}-auth-token`
}
