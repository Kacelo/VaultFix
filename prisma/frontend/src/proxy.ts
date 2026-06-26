import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * VaultFix Proxy (Next.js 16 "middleware" replacement).
 * - Refreshes Supabase session on every request.
 * - Protects /dashboard and /admin routes.
 * - Gracefully passes through when Supabase is not yet configured.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";

  // Pass through if Supabase is not yet configured (local dev without credentials)
  if (!supabaseUrl || supabaseUrl.includes("YOUR_PROJECT_ID")) {
    return NextResponse.next({ request });
  }

  let proxyResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        proxyResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          proxyResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // IMPORTANT: do not add logic between createServerClient and getUser
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const protectedPaths = ["/dashboard", "/admin"];

  if (protectedPaths.some((p) => pathname.startsWith(p)) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return proxyResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
