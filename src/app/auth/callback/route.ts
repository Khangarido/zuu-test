import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect after the user clicks the email confirmation link
// (or after we run verifyOtp on the client which sets cookies).
// We exchange the code (PKCE flow) and send them to /dashboard.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // fallback: send them to login
  return NextResponse.redirect(`${origin}/login`);
}
