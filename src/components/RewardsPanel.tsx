import { ACHIEVEMENTS } from "../game/achievements";
import type { DailyRewardOutcome } from "../game/types";

interface RewardsPanelProps {
  nextDailyReward: DailyRewardOutcome & { claimedToday: boolean };
  rewardMessage: string;
  achievements: string[];
  gamesPlayed: number;
  onClaim: () => void;
}

export function RewardsPanel({ nextDailyReward, rewardMessage, achievements, gamesPlayed, onClaim }: RewardsPanelProps) {
  return (
    <section className="panel" aria-labelledby="rewards-title">
      <div className="panel-header">
        <div>
          <h2 id="rewards-title" className="panel-title">Daily charge</h2>
          <p className="panel-note">Day {nextDailyReward.streakDay}: {nextDailyReward.label}</p>
        </div>
      </div>
      <button className="button button-primary" type="button" onClick={onClaim} disabled={nextDailyReward.claimedToday}>
        {nextDailyReward.claimedToday ? "Claimed today" : "Claim reward"}
      </button>
      {rewardMessage ? <p className="success-state">{rewardMessage}</p> : null}

      <div className="panel-header panel-header-spaced">
        <div>
          <h2 className="panel-title">Achievements</h2>
          <p className="panel-note">{gamesPlayed} runs played.</p>
        </div>
      </div>
      <ul className="achievement-list">
        {ACHIEVEMENTS.map((achievement) => {
          const unlocked = achievements.includes(achievement.key);
          return (
            <li className="achievement-item" key={achievement.key}>
              <span className={`chip ${unlocked ? "chip-lime" : ""}`}>{unlocked ? "ON" : "--"}</span>
              <span>
                <strong>{achievement.title}</strong>
                <br />
                <span className="subtle">{achievement.description}</span>
              </span>
              <span className="subtle">{unlocked ? "Unlocked" : "Locked"}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
