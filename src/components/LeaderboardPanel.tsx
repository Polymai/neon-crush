import type { LeaderboardEntry, LeaderboardPeriod } from "../api/leaderboards";

interface LeaderboardPanelProps {
  entries: LeaderboardEntry[];
  period: LeaderboardPeriod;
  dataError: string;
  onRefresh: (period: LeaderboardPeriod) => void;
}

const PERIODS: LeaderboardPeriod[] = ["global", "weekly", "monthly"];

export function LeaderboardPanel({ entries, period, dataError, onRefresh }: LeaderboardPanelProps) {
  return (
    <section id="leaderboard" className="panel" aria-labelledby="leaderboard-title">
      <div className="panel-header">
        <div>
          <h2 id="leaderboard-title" className="panel-title">Leaderboard</h2>
          <p className="panel-note">Scores appear after online save is provisioned.</p>
        </div>
      </div>
      <div className="tabs" role="tablist" aria-label="Leaderboard period">
        {PERIODS.map((option) => (
          <button
            className={`tab ${period === option ? "tab-active" : ""}`}
            type="button"
            key={option}
            onClick={() => onRefresh(option)}
          >
            {option}
          </button>
        ))}
      </div>
      {dataError ? <p className="error-state">{dataError}</p> : null}
      {!entries.length ? (
        <p className="empty-state">No public scores yet. Finish a signed-in run to seed the board.</p>
      ) : (
        <ol className="leaderboard-list">
          {entries.map((entry) => (
            <li className="leader-row" key={`${entry.player_id}-${entry.rank}`}>
              <span className="chip chip-cyan">#{entry.rank}</span>
              <span>
                <strong>{entry.display_name}</strong>
                <br />
                <span className="subtle">Level {entry.highest_unlocked_level} · best combo {entry.best_combo}x</span>
              </span>
              <strong>{entry.total_score.toLocaleString()}</strong>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
