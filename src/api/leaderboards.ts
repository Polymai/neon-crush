import { appSupabase } from "../lib/supabase";

export type LeaderboardPeriod = "global" | "weekly" | "monthly";

export interface LeaderboardEntry {
  rank: number;
  player_id: string;
  display_name: string;
  avatar_color: string;
  total_score: number;
  highest_unlocked_level: number;
  best_combo: number;
  games_played: number;
  last_played_at: string | null;
}

export async function fetchLeaderboard(period_filter: LeaderboardPeriod, limit_count = 20): Promise<LeaderboardEntry[]> {
  const { data, error } = await appSupabase.rpc("get_leaderboard", { period_filter, limit_count });
  if (error) throw error;
  return (data || []) as LeaderboardEntry[];
}
