import type { BoosterKey, DailyRewardOutcome } from "./types";

export interface StoredDailyReward {
  reward_date: string;
  streak_day: number;
  coins_awarded: number;
  booster_key: BoosterKey | null;
}

const REWARD_SCHEDULE: Array<{ coins: number; boosterKey: BoosterKey | null; label: string }> = [
  { coins: 35, boosterKey: null, label: "35 coins" },
  { coins: 45, boosterKey: "shuffle", label: "45 coins + Shuffle" },
  { coins: 55, boosterKey: null, label: "55 coins" },
  { coins: 65, boosterKey: "laser", label: "65 coins + Laser" },
  { coins: 80, boosterKey: null, label: "80 coins" },
  { coins: 95, boosterKey: "burst", label: "95 coins + Burst" },
  { coins: 140, boosterKey: "shuffle", label: "140 coins + Shuffle" },
];

export function todayKey(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}

function addDays(dateKey: string, days: number): string {
  const date = new Date(`${dateKey}T00:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return todayKey(date);
}

export function getNextDailyReward(rewards: StoredDailyReward[], now = new Date()): DailyRewardOutcome & { claimedToday: boolean } {
  const today = todayKey(now);
  const sorted = [...rewards].sort((a, b) => b.reward_date.localeCompare(a.reward_date));
  const latest = sorted[0];

  if (latest?.reward_date === today) {
    const schedule = REWARD_SCHEDULE[Math.max(0, latest.streak_day - 1)];
    return {
      rewardDate: today,
      streakDay: latest.streak_day,
      coins: latest.coins_awarded,
      boosterKey: latest.booster_key,
      label: schedule?.label || `${latest.coins_awarded} coins`,
      claimedToday: true,
    };
  }

  const streakDay = latest && addDays(latest.reward_date, 1) === today ? (latest.streak_day % 7) + 1 : 1;
  const schedule = REWARD_SCHEDULE[streakDay - 1];

  return {
    rewardDate: today,
    streakDay,
    coins: schedule.coins,
    boosterKey: schedule.boosterKey,
    label: schedule.label,
    claimedToday: false,
  };
}
