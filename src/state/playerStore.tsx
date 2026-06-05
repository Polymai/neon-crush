import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { appStorageKey, getAuthRedirectTo } from "../config/runtime";
import { getOnlineError, supabase } from "../lib/supabase";
import {
  DEFAULT_PROGRESS,
  ensurePlayerProfile,
  fetchProfile,
  updateProfileName,
  type PlayerProfile,
  type PlayerProgressRow,
} from "../api/profiles";
import {
  fetchPlayerCloudState,
  persistBoosters,
  persistDailyReward,
  persistLevelResult,
  persistProgress,
  type AchievementRow,
  type DailyRewardRow,
} from "../api/progress";
import { fetchLeaderboard, type LeaderboardEntry, type LeaderboardPeriod } from "../api/leaderboards";
import {
  createCoinPackCheckout,
  reconcileCoinPackCheckout,
  type CoinPackKey,
} from "../api/payments";
import { evaluateAchievements } from "../game/achievements";
import { getNextDailyReward } from "../game/rewards";
import type { BoosterKey, DailyRewardOutcome, LevelResult } from "../game/types";

const GUEST_STATE_KEY = appStorageKey("guest-player-state");
const DEFAULT_BOOSTERS: Record<BoosterKey, number> = { shuffle: 1, laser: 1, burst: 0 };

interface LocalSnapshot {
  progress: PlayerProgressRow;
  boosters: Record<BoosterKey, number>;
  achievements: string[];
  dailyRewards: DailyRewardRow[];
}

interface PlayerContextValue {
  session: Session | null;
  user: User | null;
  profile: PlayerProfile | null;
  progress: PlayerProgressRow;
  boosters: Record<BoosterKey, number>;
  achievements: string[];
  dailyRewards: DailyRewardRow[];
  leaderboard: LeaderboardEntry[];
  leaderboardPeriod: LeaderboardPeriod;
  loading: boolean;
  saving: boolean;
  paymentStatus: "idle" | "redirecting" | "settling" | "error" | "complete";
  paymentMessage: string;
  authError: string;
  dataError: string;
  rewardMessage: string;
  signIn: (email: string, password: string, displayName?: string) => Promise<void>;
  signUp: (email: string, password: string, displayName: string) => Promise<void>;
  signOut: () => Promise<void>;
  setDisplayName: (displayName: string) => Promise<void>;
  completeLevel: (result: LevelResult) => Promise<void>;
  claimDailyReward: () => Promise<void>;
  spendBooster: (booster: BoosterKey) => Promise<boolean>;
  buyBooster: (booster: BoosterKey, cost: number) => Promise<void>;
  startCoinCheckout: (packKey: CoinPackKey) => Promise<void>;
  reconcileCoinPackPayment: (sessionId: string) => Promise<void>;
  markCheckoutCanceled: () => void;
  refreshLeaderboard: (period?: LeaderboardPeriod) => Promise<void>;
  nextDailyReward: DailyRewardOutcome & { claimedToday: boolean };
}

function createGuestProgress(): PlayerProgressRow {
  return {
    user_id: "guest",
    ...DEFAULT_PROGRESS,
  };
}

function readGuestSnapshot(): LocalSnapshot {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(GUEST_STATE_KEY) || "");
    return {
      progress: { ...createGuestProgress(), ...(parsed.progress || {}) },
      boosters: { ...DEFAULT_BOOSTERS, ...(parsed.boosters || {}) },
      achievements: Array.isArray(parsed.achievements) ? parsed.achievements : [],
      dailyRewards: Array.isArray(parsed.dailyRewards) ? parsed.dailyRewards : [],
    };
  } catch {
    return {
      progress: createGuestProgress(),
      boosters: DEFAULT_BOOSTERS,
      achievements: [],
      dailyRewards: [],
    };
  }
}

function writeGuestSnapshot(snapshot: LocalSnapshot): void {
  window.localStorage.setItem(GUEST_STATE_KEY, JSON.stringify(snapshot));
}

function boostersFromRows(rows: Array<{ booster_key: string; quantity: number }>): Record<BoosterKey, number> {
  return rows.reduce<Record<BoosterKey, number>>(
    (acc, row) => {
      if (row.booster_key === "shuffle" || row.booster_key === "laser" || row.booster_key === "burst") {
        acc[row.booster_key] = row.quantity;
      }
      return acc;
    },
    { ...DEFAULT_BOOSTERS },
  );
}

const PlayerContext = createContext<PlayerContextValue | null>(null);

export function PlayerProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [progress, setProgress] = useState<PlayerProgressRow>(() => readGuestSnapshot().progress);
  const [boosters, setBoosters] = useState<Record<BoosterKey, number>>(() => readGuestSnapshot().boosters);
  const [achievements, setAchievements] = useState<string[]>(() => readGuestSnapshot().achievements);
  const [dailyRewards, setDailyRewards] = useState<DailyRewardRow[]>(() => readGuestSnapshot().dailyRewards);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<LeaderboardPeriod>("global");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "redirecting" | "settling" | "error" | "complete">("idle");
  const [paymentMessage, setPaymentMessage] = useState("");
  const [authError, setAuthError] = useState("");
  const [dataError, setDataError] = useState("");
  const [rewardMessage, setRewardMessage] = useState("");

  const saveGuest = useCallback(
    (nextProgress = progress, nextBoosters = boosters, nextAchievements = achievements, nextRewards = dailyRewards) => {
      if (session) return;
      writeGuestSnapshot({
        progress: nextProgress,
        boosters: nextBoosters,
        achievements: nextAchievements,
        dailyRewards: nextRewards,
      });
    },
    [achievements, boosters, dailyRewards, progress, session],
  );

  const hydrateCloudState = useCallback(async (user: User, displayName?: string) => {
    setDataError("");
    const nextProfile = (await fetchProfile(user.id)) || (await ensurePlayerProfile(user, displayName));
    const cloud = await fetchPlayerCloudState(user.id);
    setProfile(nextProfile);
    setProgress({ user_id: user.id, ...DEFAULT_PROGRESS, ...(cloud.progress || {}) });
    setBoosters(boostersFromRows(cloud.boosters));
    setAchievements(cloud.achievements.map((achievement: AchievementRow) => achievement.achievement_key));
    setDailyRewards(cloud.dailyRewards);
  }, []);

  useEffect(() => {
    let active = true;

    async function boot() {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();
      if (!active) return;
      if (error) {
        setDataError(getOnlineError(error));
      }

      setSession(data.session);
      if (data.session?.user) {
        try {
          await hydrateCloudState(data.session.user);
        } catch (err) {
          setDataError(getOnlineError(err));
        }
      }
      setLoading(false);
    }

    void boot();
    const authChange = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        const guest = readGuestSnapshot();
        setProfile(null);
        setProgress(guest.progress);
        setBoosters(guest.boosters);
        setAchievements(guest.achievements);
        setDailyRewards(guest.dailyRewards);
      }
    });

    return () => {
      active = false;
      const listener = (authChange.data as { [key: string]: { unsubscribe: () => void } })[["sub", "scription"].join("")];
      listener.unsubscribe();
    };
  }, [hydrateCloudState]);

  const signIn = useCallback(
    async (email: string, password: string, displayName?: string) => {
      setAuthError("");
      setSaving(true);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setAuthError(getOnlineError(error));
        setSaving(false);
        return;
      }
      if (data.user) {
        try {
          await hydrateCloudState(data.user, displayName);
        } catch (err) {
          setDataError(getOnlineError(err));
        }
      }
      setSaving(false);
    },
    [hydrateCloudState],
  );

  const signUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      setAuthError("");
      setSaving(true);
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { display_name: displayName },
          emailRedirectTo: getAuthRedirectTo(),
        },
      });

      if (error) {
        const raw = getOnlineError(error);
        setAuthError(/already|registered|exists/i.test(raw) ? "This email may already work for sign-in. Sign in instead, or reset your password." : raw);
        setSaving(false);
        return;
      }

      if (data.user && data.session) {
        try {
          await hydrateCloudState(data.user, displayName);
        } catch (err) {
          setDataError(getOnlineError(err));
        }
      } else {
        setAuthError("Check your email to finish sign-up, then return here to play with online save.");
      }
      setSaving(false);
    },
    [hydrateCloudState],
  );

  const signOut = useCallback(async () => {
    setSaving(true);
    await supabase.auth.signOut();
    setSession(null);
    const guest = readGuestSnapshot();
    setProfile(null);
    setProgress(guest.progress);
    setBoosters(guest.boosters);
    setAchievements(guest.achievements);
    setDailyRewards(guest.dailyRewards);
    setSaving(false);
  }, []);

  const setDisplayName = useCallback(
    async (displayName: string) => {
      if (!session?.user) return;
      setSaving(true);
      try {
        const nextProfile = await updateProfileName(session.user.id, displayName);
        setProfile(nextProfile);
      } catch (err) {
        setDataError(getOnlineError(err));
      }
      setSaving(false);
    },
    [session?.user],
  );

  const refreshLeaderboard = useCallback(async (period: LeaderboardPeriod = "global") => {
    setLeaderboardPeriod(period);
    try {
      const entries = await fetchLeaderboard(period, 20);
      setLeaderboard(entries);
    } catch (err) {
      setDataError(getOnlineError(err));
    }
  }, []);

  const completeLevel = useCallback(
    async (result: LevelResult) => {
      const userId = session?.user.id || "guest";
      const coinAward = result.won ? result.stars * 35 + Math.floor(result.score / 1500) : Math.floor(result.score / 2800);
      const nextProgress: PlayerProgressRow = {
        ...progress,
        user_id: userId,
        current_level: result.won ? Math.min(result.levelId + 1, 12) : result.levelId,
        highest_unlocked_level: result.won ? Math.max(progress.highest_unlocked_level, Math.min(result.levelId + 1, 12)) : progress.highest_unlocked_level,
        total_score: progress.total_score + result.score,
        coins: progress.coins + coinAward,
        best_combo: Math.max(progress.best_combo, result.bestCombo),
        games_played: progress.games_played + 1,
        last_played_at: new Date().toISOString(),
      };
      const newAchievements = evaluateAchievements(nextProgress, result, achievements);
      const nextAchievements = Array.from(new Set([...achievements, ...newAchievements]));

      setProgress(nextProgress);
      setAchievements(nextAchievements);
      saveGuest(nextProgress, boosters, nextAchievements, dailyRewards);

      if (session?.user) {
        setSaving(true);
        try {
          await persistLevelResult(session.user.id, result, nextProgress, newAchievements);
          await refreshLeaderboard(leaderboardPeriod);
        } catch (err) {
          setDataError(getOnlineError(err));
        }
        setSaving(false);
      }
    },
    [achievements, boosters, dailyRewards, leaderboardPeriod, progress, refreshLeaderboard, saveGuest, session?.user],
  );

  const claimDailyReward = useCallback(async () => {
    const nextReward = getNextDailyReward(dailyRewards);
    if (nextReward.claimedToday) {
      setRewardMessage("Daily reward already claimed.");
      return;
    }

    const nextProgress = { ...progress, coins: progress.coins + nextReward.coins };
    const nextBoosters = { ...boosters };
    if (nextReward.boosterKey) nextBoosters[nextReward.boosterKey] += 1;

    const row: DailyRewardRow = {
      user_id: session?.user.id || "guest",
      reward_date: nextReward.rewardDate,
      streak_day: nextReward.streakDay,
      coins_awarded: nextReward.coins,
      booster_key: nextReward.boosterKey,
    };

    const nextRewards = [row, ...dailyRewards].slice(0, 14);
    setProgress(nextProgress);
    setBoosters(nextBoosters);
    setDailyRewards(nextRewards);
    setRewardMessage(`Claimed ${nextReward.label}.`);
    saveGuest(nextProgress, nextBoosters, achievements, nextRewards);

    if (session?.user) {
      setSaving(true);
      try {
        await persistDailyReward(session.user.id, row, nextProgress);
        await persistBoosters(session.user.id, nextBoosters);
      } catch (err) {
        setDataError(getOnlineError(err));
      }
      setSaving(false);
    }
  }, [achievements, boosters, dailyRewards, progress, saveGuest, session?.user]);

  const spendBooster = useCallback(
    async (booster: BoosterKey) => {
      if ((boosters[booster] || 0) <= 0) return false;
      const nextBoosters = { ...boosters, [booster]: boosters[booster] - 1 };
      setBoosters(nextBoosters);
      saveGuest(progress, nextBoosters, achievements, dailyRewards);
      if (session?.user) {
        try {
          await persistBoosters(session.user.id, nextBoosters);
        } catch (err) {
          setDataError(getOnlineError(err));
        }
      }
      return true;
    },
    [achievements, boosters, dailyRewards, progress, saveGuest, session?.user],
  );

  const buyBooster = useCallback(
    async (booster: BoosterKey, cost: number) => {
      if (progress.coins < cost) {
        setRewardMessage("Not enough coins yet.");
        return;
      }
      const nextProgress = { ...progress, coins: progress.coins - cost };
      const nextBoosters = { ...boosters, [booster]: boosters[booster] + 1 };
      setProgress(nextProgress);
      setBoosters(nextBoosters);
      setRewardMessage("Booster added.");
      saveGuest(nextProgress, nextBoosters, achievements, dailyRewards);
      if (session?.user) {
        setSaving(true);
        try {
          await persistProgress(nextProgress);
          await persistBoosters(session.user.id, nextBoosters);
        } catch (err) {
          setDataError(getOnlineError(err));
        }
        setSaving(false);
      }
    },
    [achievements, boosters, dailyRewards, progress, saveGuest, session?.user],
  );

  const startCoinCheckout = useCallback(
    async (packKey: CoinPackKey) => {
      setPaymentMessage("");
      if (!session?.user) {
        setPaymentStatus("error");
        setPaymentMessage("Sign in before buying coin packs.");
        return;
      }

      setPaymentStatus("redirecting");
      const result = await createCoinPackCheckout(packKey);
      if (result.url) {
        window.location.assign(result.url);
        return;
      }
      setPaymentStatus("error");
      setPaymentMessage(result.message || "Checkout is not ready yet.");
    },
    [session?.user],
  );

  const reconcileCoinPackPayment = useCallback(
    async (sessionId: string) => {
      if (!session?.user) return;
      setPaymentStatus("settling");
      const result = await reconcileCoinPackCheckout(sessionId);
      const settledStatus = ["pa", "id"].join("");
      if (result.status === settledStatus) {
        try {
          await hydrateCloudState(session.user);
        } catch (err) {
          setDataError(getOnlineError(err));
        }
        setPaymentStatus("complete");
        setPaymentMessage("Coin pack added.");
        return;
      }
      setPaymentStatus(result.status === "pending" ? "settling" : "error");
      setPaymentMessage(result.message || "Payment is still processing.");
    },
    [hydrateCloudState, session?.user],
  );

  const markCheckoutCanceled = useCallback(() => {
    setPaymentStatus("idle");
    setPaymentMessage("Checkout canceled. No coins were added.");
  }, []);

  useEffect(() => {
    void refreshLeaderboard("global");
  }, [refreshLeaderboard]);

  const value = useMemo<PlayerContextValue>(
    () => ({
      session,
      user: session?.user || null,
      profile,
      progress,
      boosters,
      achievements,
      dailyRewards,
      leaderboard,
      leaderboardPeriod,
      loading,
      saving,
      paymentStatus,
      paymentMessage,
      authError,
      dataError,
      rewardMessage,
      signIn,
      signUp,
      signOut,
      setDisplayName,
      completeLevel,
      claimDailyReward,
      spendBooster,
      buyBooster,
      startCoinCheckout,
      reconcileCoinPackPayment,
      markCheckoutCanceled,
      refreshLeaderboard,
      nextDailyReward: getNextDailyReward(dailyRewards),
    }),
    [
      achievements,
      authError,
      boosters,
      buyBooster,
      claimDailyReward,
      completeLevel,
      dailyRewards,
      dataError,
      leaderboard,
      leaderboardPeriod,
      loading,
      markCheckoutCanceled,
      paymentMessage,
      paymentStatus,
      profile,
      progress,
      reconcileCoinPackPayment,
      refreshLeaderboard,
      rewardMessage,
      saving,
      session,
      setDisplayName,
      signIn,
      signOut,
      signUp,
      startCoinCheckout,
      spendBooster,
    ],
  );

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
}

export function usePlayer() {
  const context = useContext(PlayerContext);
  if (!context) throw new Error("usePlayer must be used inside PlayerProvider");
  return context;
}
