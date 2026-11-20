import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ensureCurrentUserProfile } from "@/lib/supabase/actions";

/**
 * OAuth and magic-link landing point: exchanges the code for a session, then
 * makes sure the relational profile exists.
 *
 * That second step is the fix for sign-ins that never pass through the register
 * form. Without it Google produced a valid session with no `users` row, leaving
 * an account that could not do anything — and the dashboard asking a signed-in
 * user to sign in.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("redirectTo") ?? "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing-code`);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=google-sign-in-failed`);
  }

  try {
    // Create-only, and it reads the identity from the freshly minted session
    // rather than from the URL.
    await ensureCurrentUserProfile();
  } catch {
    // The session is valid but there is no usable profile behind it. Failing
    // loudly beats dropping the user onto a dashboard that cannot load.
    return NextResponse.redirect(`${origin}/login?error=profile-setup-failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
