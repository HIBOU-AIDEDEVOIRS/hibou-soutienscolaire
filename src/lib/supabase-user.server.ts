import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/** Builds a Supabase client acting as the caller (RLS applies) from the bearer token. */
export async function getUserClient(request: Request) {
  const url = process.env["SUPABASE_URL"]!;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"]!;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || token.split(".").length !== 3) return null;
  const supabase = createClient<Database>(url, key, {
    global: {
      headers: { Authorization: `Bearer ${token}` },
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        return fetch(input, { ...init, headers });
      },
    },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return { supabase, userId: data.claims.sub as string };
}
