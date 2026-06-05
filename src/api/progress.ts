import { appSupabase } from "../lib/supabase";
import type { BoosterKey, LevelResult } from "../game/types";
import type { PlayerProgressRow } from "./profiles";

export interface BoosterRow {
  id?: string;
  user_id: string;
  booster_key: BoosterKey;
  quantity: number;
}

export interface AchievementRow {
  id?: string;
  user_id: string;
  achievement_key: string;
  metadata?: Record<string, unknown>;
  unlocked_at?: string;
}

export interface DailyRewardRow {
  id?: string;
  user_id: string;
  reward_date: string;
  streak_day: number;
  coins_awarded: number;
  booster_key: BoosterKey | null;
  claimed_at?: string;
}

export interface PlayerCloudState {
  progress: PlayerProgressRow | null;
  boosters: BoosterRow[];
  achievements: AchievementRow[];
  dailyRewards: DailyRewardRow[];
}

export async function fetchPlayerCloudState(userId: string): Promise<PlayerCloudState> {
  const [progressResult, boostersResult, achievementsResult, rewardsResult] = await Promise.all([
    appSupabase.from("progress").select("*").eq("user_id", userId).maybeSingle(),
    appSupabase.from("boosters").select("*").eq("user_id", userId),
    appSupabase.from("achievements").select("*").eq("user_id", userId).order("unlocked_at", { ascending: false }),
    appSupabase.from("daily_rewards").select("*").eq("user_id", userId).order("reward_date", { ascending: false }).limit(14),
  ]);

  if (progressResult.error) throw progressResult.error;
  if (boostersResult.error) throw boostersResult.error;
  if (achievementsResult.error) throw achievementsResult.error;
  if (rewardsResult.error) throw rewardsResult.error;

  return {
    progress: progressResult.data,
    boosters: boostersResult.data || [],
    achievements: achievementsResult.data || [],
    dailyRewards: rewardsResult.data || [],
  };
}

export async function persistLevelResult(
  userId: string,
  result: LevelResult,
  progress: PlayerProgressRow,
  achievementKeys: string[],
): Promise<void> {
  const { error: resultError } = await appSupabase.from("level_results").insert({
    user_id: userId,
    level_id: result.levelId,
    score: result.score,
    stars: result.stars,
    moves_left: result.movesLeft,
    tiles_cleared: result.tilesCleared,
    best_combo: result.bestCombo,
    won: result.won,
    duration_seconds: result.durationSeconds,
  });

  if (resultError) throw resultError;

  const { error: progressError } = await appSupabase.from("progress").upsert(
    {
      user_id: userId,
      current_level: progress.current_level,
      highest_unlocked_level: progress.highest_unlocked_level,
      total_score: progress.total_score,
      coins: progress.coins,
      best_combo: progress.best_combo,
      games_played: progress.games_played,
      last_played_at: progress.last_played_at,
    },
    { onConflict: "user_id" },
  );

  if (progressError) throw progressError;

  if (achievementKeys.length) {
    const rows = achievementKeys.map((achievement_key) => ({
      user_id: userId,
      achievement_key,
      metadata: { source: "level_result", levelId: result.levelId },
    }));
    const { error: achievementError } = await appSupabase
      .from("achievements")
      .upsert(rows, { onConflict: "user_id,achievement_key", ignoreDuplicates: true });
    if (achievementError) throw achievementError;
  }
}

export async function persistDailyReward(userId: string, reward: DailyRewardRow, progress: PlayerProgressRow): Promise<void> {
  const { error: rewardError } = await appSupabase.from("daily_rewards").insert({
    user_id: userId,
    reward_date: reward.reward_date,
    streak_day: reward.streak_day,
    coins_awarded: reward.coins_awarded,
    booster_key: reward.booster_key,
  });

  if (rewardError) throw rewardError;

  const { error: progressError } = await appSupabase.from("progress").upsert(
    {
      user_id: userId,
      current_level: progress.current_level,
      highest_unlocked_level: progress.highest_unlocked_level,
      total_score: progress.total_score,
      coins: progress.coins,
      best_combo: progress.best_combo,
      games_played: progress.games_played,
      last_played_at: progress.last_played_at,
    },
    { onConflict: "user_id" },
  );

  if (progressError) throw progressError;
}

export async function persistProgress(progress: PlayerProgressRow): Promise<void> {
  const { error } = await appSupabase.from("progress").upsert(
    {
      user_id: progress.user_id,
      current_level: progress.current_level,
      highest_unlocked_level: progress.highest_unlocked_level,
      total_score: progress.total_score,
      coins: progress.coins,
      best_combo: progress.best_combo,
      games_played: progress.games_played,
      last_played_at: progress.last_played_at,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

export async function persistBoosters(userId: string, boosters: Record<BoosterKey, number>): Promise<void> {
  const rows = Object.entries(boosters).map(([booster_key, quantity]) => ({
    user_id: userId,
    booster_key: booster_key as BoosterKey,
    quantity,
  }));
  const { error } = await appSupabase.from("boosters").upsert(rows, { onConflict: "user_id,booster_key" });
  if (error) throw error;
}
