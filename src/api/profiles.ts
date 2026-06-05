import type { User } from "@supabase/supabase-js";
import { appSupabase } from "../lib/supabase";

export interface PlayerProfile {
  id: string;
  display_name: string;
  avatar_color: string;
  created_at?: string;
  updated_at?: string;
  last_seen_at?: string | null;
}

export interface PlayerProgressRow {
  id?: string;
  user_id: string;
  current_level: number;
  highest_unlocked_level: number;
  total_score: number;
  coins: number;
  best_combo: number;
  games_played: number;
  last_played_at?: string | null;
}

export const DEFAULT_PROGRESS: Omit<PlayerProgressRow, "user_id"> = {
  current_level: 1,
  highest_unlocked_level: 1,
  total_score: 0,
  coins: 60,
  best_combo: 0,
  games_played: 0,
  last_played_at: null,
};

export function normalizeDisplayName(user: User, fallback?: string): string {
  const fromFallback = String(fallback || "").trim();
  if (fromFallback) return fromFallback.slice(0, 32);
  const emailName = user.email ? user.email.split("@")[0] : "";
  return (emailName || "Neon player").slice(0, 32);
}

export async function fetchProfile(userId: string): Promise<PlayerProfile | null> {
  const { data, error } = await appSupabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

export async function ensurePlayerProfile(user: User, displayName?: string): Promise<PlayerProfile> {
  const profile: PlayerProfile = {
    id: user.id,
    display_name: normalizeDisplayName(user, displayName),
    avatar_color: "cyan",
    last_seen_at: new Date().toISOString(),
  };

  const { data, error } = await appSupabase
    .from("profiles")
    .upsert(profile, { onConflict: "id" })
    .select("*")
    .single();

  if (error) throw error;

  const { error: progressError } = await appSupabase.from("progress").upsert(
    {
      user_id: user.id,
      ...DEFAULT_PROGRESS,
    },
    { onConflict: "user_id", ignoreDuplicates: true },
  );

  if (progressError) throw progressError;
  return data;
}

export async function updateProfileName(userId: string, displayName: string): Promise<PlayerProfile> {
  const { data, error } = await appSupabase
    .from("profiles")
    .update({ display_name: displayName.trim().slice(0, 32), last_seen_at: new Date().toISOString() })
    .eq("id", userId)
    .select("*")
    .single();

  if (error) throw error;
  return data;
}
