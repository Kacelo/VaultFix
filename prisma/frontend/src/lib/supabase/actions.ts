"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

type RegisterProfileInput = {
  userId: string;
  email: string;
  name: string;
  phone?: string;
  role: "CLIENT" | "ELECTRICIAN";
  ntaUid?: string;
  specialisation?: string;
  serviceArea?: string;
};

/**
 * Writes a freshly signed-up auth user into the relational `users`
 * (and, for electricians, `electrician_profiles`) tables. Runs with
 * the service-role client because this fires before email
 * confirmation, when the caller has no session yet for RLS to check.
 */
export async function syncUserProfile(input: RegisterProfileInput) {
  const supabase = createAdminClient();

  const { error: userError } = await supabase.from("users").upsert({
    id: input.userId,
    email: input.email,
    name: input.name,
    phone: input.phone || null,
    role: input.role,
  });

  if (userError) {
    throw new Error(`Failed to save user profile: ${userError.message}`);
  }

  if (input.role === "ELECTRICIAN") {
    const profileFields = {
      ntaUid: input.ntaUid || null,
      specialisation: input.specialisation || null,
      serviceArea: input.serviceArea || null,
    };

    // Look up first rather than upsert-by-userId: electrician_profiles.id
    // is its own primary key (referenced by jobs/reviews/certificates), so
    // we must never regenerate it for a row that already exists.
    const { data: existing, error: lookupError } = await supabase
      .from("electrician_profiles")
      .select("id")
      .eq("userId", input.userId)
      .maybeSingle();

    if (lookupError) {
      throw new Error(
        `Failed to look up electrician profile: ${lookupError.message}`
      );
    }

    const { error: profileError } = existing
      ? await supabase
          .from("electrician_profiles")
          .update(profileFields)
          .eq("id", existing.id)
      : await supabase.from("electrician_profiles").insert({
          id: crypto.randomUUID(),
          userId: input.userId,
          ...profileFields,
        });

    if (profileError) {
      throw new Error(
        `Failed to save electrician profile: ${profileError.message}`
      );
    }
  }
}

export async function signInWithGoogle() {
  const supabase = await createClient();
  const headersList = await headers();
  const host = headersList.get("host");
  const protocol = process.env.NODE_ENV === "development" ? "http" : "https";

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${protocol}://${host}/auth/callback`,
    },
  });

  if (error || !data.url) {
    redirect("/login?error=google-sign-in-failed");
  }

  redirect(data.url);
}
