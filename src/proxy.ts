import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    // api/health and api/byl/webhook never need a session; skipping them avoids
    // an auth.getUser() round-trip to Supabase on every container healthcheck
    // and every payment webhook.
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/health|api/byl/webhook|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
