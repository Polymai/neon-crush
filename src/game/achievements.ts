import type { LevelResult } from "./types";
import type { PlayerProgressRow } from "../api/profiles";

export interface AchievementDefinition {
  key: string;
  title: string;
  description: string;
}

export const ACHIEVEMENTS: AchievementDefinition[] = [
  { key: "first_crush", title: "First Crush", description: "Win a level." },
  { key: "five_stars", title: "Signal Streak", description: "Play five runs." },
  { key: "combo_5", title: "Combo Current", description: "Reach a 5-cascade combo." },
  { key: "score_25000", title: "Neon Skyline", description: "Bank 25,000 total points." },
  { key: "level_6", title: "Midnight Line", description: "Unlock level 6." },
  { key: "coin_500", title: "Arcade Vault", description: "Hold 500 coins." },
];

export function evaluateAchievements(
  progress: PlayerProgressRow,
  result: LevelResult,
  unlockedKeys: string[],
): string[] {
  const unlocked = new Set(unlockedKeys);
  const next: string[] = [];
  const add = (key: string, condition: boolean) => {
    if (condition && !unlocked.has(key)) next.push(key);
  };

  add("first_crush", result.won);
  add("five_stars", progress.games_played >= 5);
  add("combo_5", Math.max(progress.best_combo, result.bestCombo) >= 5);
  add("score_25000", progress.total_score >= 25000);
  add("level_6", progress.highest_unlocked_level >= 6);
  add("coin_500", progress.coins >= 500);

  return next;
}
