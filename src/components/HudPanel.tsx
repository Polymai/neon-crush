import type { RefObject } from "react";
import { BOOSTER_META, TILE_META } from "../game/tiles";
import type { BoosterKey, LevelDefinition, TileKind } from "../game/types";

interface HudPanelProps {
  level: LevelDefinition;
  score: number;
  movesLeft: number;
  tilesCleared: number;
  bestCombo: number;
  goalsCleared: Partial<Record<TileKind, number>>;
  boosters: Record<BoosterKey, number>;
  coins: number;
  status: string;
  scoreMetricRef: RefObject<HTMLDivElement>;
  onUseBooster: (booster: BoosterKey) => void;
  onBuyBooster: (booster: BoosterKey, cost: number) => void;
  onRestart: () => void;
  onNext: () => void;
}

export function HudPanel({
  level,
  score,
  movesLeft,
  tilesCleared,
  bestCombo,
  goalsCleared,
  boosters,
  coins,
  status,
  scoreMetricRef,
  onUseBooster,
  onBuyBooster,
  onRestart,
  onNext,
}: HudPanelProps) {
  const boosterEntries = Object.entries(BOOSTER_META) as Array<[BoosterKey, (typeof BOOSTER_META)[BoosterKey]]>;
  const goalRows = level.goals.map((goal) => {
    const cleared = goalsCleared[goal.kind] || 0;
    const remaining = Math.max(0, goal.count - cleared);
    return {
      ...goal,
      cleared,
      remaining,
      meta: TILE_META[goal.kind],
      percent: Math.min(100, Math.round((cleared / goal.count) * 100)),
    };
  });
  const firstOpenGoal = goalRows.find((goal) => goal.remaining > 0);
  const scoreRemaining = Math.max(0, level.targetScore - score);

  return (
    <>
      <section className="objective-card" aria-label="Current objective">
        <span className="chip chip-cyan">Need now</span>
        <h3>
          {firstOpenGoal
            ? `${firstOpenGoal.remaining} ${firstOpenGoal.meta.label} tiles`
            : scoreRemaining
              ? `${scoreRemaining.toLocaleString()} more points`
              : "Level target complete"}
        </h3>
        <p>
          {firstOpenGoal
            ? `Drag tiles into horizontal, vertical, or diagonal lines. Five makes a bomb; six makes a diamond.`
            : scoreRemaining
              ? "Tile goal is done. Focus on any matches for points."
              : "Bank the win or continue to the next level."}
        </p>
      </section>
      <div className="hud-strip" aria-label="Run stats">
        <div className="metric metric-score" ref={scoreMetricRef}><span>Score</span><strong>{score.toLocaleString()}</strong></div>
        <div className="metric"><span>Target</span><strong>{level.targetScore.toLocaleString()}</strong></div>
        <div className="metric"><span>Moves</span><strong>{movesLeft}</strong></div>
        <div className="metric"><span>Combo</span><strong>{bestCombo}x</strong></div>
      </div>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Level {level.id}: {level.name}</h2>
            <p className="panel-note">{tilesCleared} tiles cleared this run.</p>
          </div>
          <span className="chip chip-violet">{status}</span>
        </div>
        <ul className="goal-list">
          {goalRows.map((goal) => {
            return (
              <li className="goal-item" key={goal.kind}>
                <span className={`chip chip-${goal.kind}`}>{goal.meta.symbol}</span>
                <span>
                  <strong>{goal.remaining ? `${goal.remaining} ${goal.meta.label} left` : `${goal.meta.label} done`}</strong>
                  <span className="goal-progress" aria-hidden="true"><span style={{ width: `${goal.percent}%` }} /></span>
                </span>
                <strong>{Math.min(goal.cleared, goal.count)} / {goal.count}</strong>
              </li>
            );
          })}
        </ul>
        <div className="row-actions">
          <button className="button button-secondary" type="button" onClick={onRestart}>Restart</button>
          <button className="button button-primary" type="button" onClick={onNext}>Next level</button>
        </div>
      </section>
      <section className="panel">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Boosters</h2>
            <p className="panel-note">{coins.toLocaleString()} coins available.</p>
          </div>
        </div>
        <ul className="reward-list">
          {boosterEntries.map(([key, meta]) => (
            <li className="reward-item" key={key}>
              <span className="chip">{meta.shortLabel}</span>
              <span>
                <strong>{meta.label}</strong>
                <br />
                <span className="subtle">{meta.description}</span>
              </span>
              <span className="row-actions">
                <button className="icon-button" type="button" title={`Use ${meta.label}`} aria-label={`Use ${meta.label}`} onClick={() => onUseBooster(key)} disabled={!boosters[key]}>
                  {boosters[key]}
                </button>
                <button className="icon-button" type="button" title={`Buy ${meta.label}`} aria-label={`Buy ${meta.label} for ${meta.cost} coins`} onClick={() => onBuyBooster(key, meta.cost)} disabled={coins < meta.cost}>
                  +
                </button>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
