import { BOOSTER_META } from "../game/tiles";
import type { BoosterKey } from "../game/types";

interface QuickHelpersProps {
  boosters: Record<BoosterKey, number>;
  coins: number;
  disabled: boolean;
  onUseBooster: (booster: BoosterKey) => void;
  onBuyBooster: (booster: BoosterKey, cost: number) => void;
}

const QUICK_HELPER_LABELS: Record<BoosterKey, { label: string; shortLabel: string }> = {
  shuffle: { label: "Shuffle", shortLabel: "SH" },
  laser: { label: "Laser", shortLabel: "LR" },
  burst: { label: "Bomb", shortLabel: "BM" },
};

export function QuickHelpers({ boosters, coins, disabled, onUseBooster, onBuyBooster }: QuickHelpersProps) {
  const helperEntries = Object.entries(BOOSTER_META) as Array<[BoosterKey, (typeof BOOSTER_META)[BoosterKey]]>;

  return (
    <section className="quick-helpers" aria-label="Board helpers">
      <div className="quick-helpers-header">
        <h3>Helpers</h3>
        <span>{coins.toLocaleString()} coins</span>
      </div>
      <div className="quick-helper-menu">
        {helperEntries.map(([key, meta]) => {
          const count = boosters[key] || 0;
          const canBuy = coins >= meta.cost;
          const helperLabel = QUICK_HELPER_LABELS[key];
          const actionLabel = count ? `Use ${helperLabel.label}` : canBuy ? `Buy ${helperLabel.label}` : "Need coins";

          return (
            <article className="quick-helper-card" key={key}>
              <button
                className="quick-helper-use"
                type="button"
                onClick={() => (count ? onUseBooster(key) : onBuyBooster(key, meta.cost))}
                disabled={disabled || (!count && !canBuy)}
                aria-label={`${actionLabel}. ${meta.description}`}
              >
                <span className={`helper-icon helper-icon-${key}`} aria-hidden="true">{helperLabel.shortLabel}</span>
                <span>
                  <strong>{helperLabel.label}</strong>
                  <small>{count ? `${count} ready` : `${meta.cost} coins`}</small>
                </span>
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}
