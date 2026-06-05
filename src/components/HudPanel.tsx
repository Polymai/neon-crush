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

  return (
    <>
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
          {level.goals.map((goal) => {
            const count = goalsCleared[goal.kind] || 0;
            const meta = TILE_META[goal.kind];
            return (
              <li className="goal-item" key={goal.kind}>
                <span className={`chip chip-${goal.kind}`}>{meta.symbol}</span>
                <span>{meta.label}</span>
                <strong>{Math.min(count, goal.count)} / {goal.count}</strong>
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
