import { createClient } from "@supabase/supabase-js";
import { APP_SCHEMA, supabaseRuntime } from "../config/runtime";

export const supabase = createClient(supabaseRuntime.url, supabaseRuntime.anonKey, {
  auth: {
    storageKey: supabaseRuntime.authStorageKey,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const appSupabase = supabase.schema(APP_SCHEMA);

export function getOnlineError(error: unknown): string {
  if (!error) return "Online save is not ready yet.";
  if (typeof error === "string") return error;
  if (typeof error === "object" && "message" in error && typeof error.message === "string") {
    if (/invalid schema|app685_neoncrush|schema must be one of/i.test(error.message)) {
      return "Online save is waiting for provisioning. You can keep playing as guest.";
    }
    return error.message;
  }
  return "Online save is not ready yet.";
}
