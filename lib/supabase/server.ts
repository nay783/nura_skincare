import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-nura.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";

/**
 * Creates a Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Note: Assumes Next.js 15+ environment where cookies() is an asynchronous promise.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // This catch block is standard for Next.js Server Components.
          // In Server Components, writing to cookies is prohibited unless it's a Server Action.
          // The middleware handles session refresh, making this ignore safe.
        }
      },
    },
  });
}
