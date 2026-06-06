import type { BoosterKey, PowerupKind, TileKind } from "./types";

export const TILE_KINDS: TileKind[] = ["cyan", "magenta", "lime", "amber", "violet", "coral"];

export const TILE_META: Record<TileKind, { label: string; symbol: string; cssClass: string }> = {
  cyan: { label: "Pulse", symbol: "P", cssClass: "tile-cyan" },
  magenta: { label: "Nova", symbol: "N", cssClass: "tile-magenta" },
  lime: { label: "Volt", symbol: "V", cssClass: "tile-lime" },
  amber: { label: "Flare", symbol: "F", cssClass: "tile-amber" },
  violet: { label: "Echo", symbol: "E", cssClass: "tile-violet" },
  coral: { label: "Rush", symbol: "R", cssClass: "tile-coral" },
};

export const POWERUP_META: Record<PowerupKind, { label: string; symbol: string; description: string }> = {
  line: { label: "Line charge", symbol: "L", description: "Clears a full row." },
  burst: { label: "Burst charge", symbol: "B", description: "Clears a 3 by 3 area." },
  bomb: { label: "Bomb charge", symbol: "X", description: "Explodes about 10 tiles around it." },
  diamond: { label: "Diamond charge", symbol: "D", description: "Turns 10 nearby tiles into its color." },
  prism: { label: "Prism charge", symbol: "P", description: "Clears one color." },
};

export const BOOSTER_META: Record<BoosterKey, { label: string; shortLabel: string; description: string; cost: number }> = {
  shuffle: { label: "Shuffle", shortLabel: "SH", description: "Refresh the board without losing a move.", cost: 35 },
  laser: { label: "Laser", shortLabel: "LR", description: "Clear the selected row.", cost: 45 },
  burst: { label: "Burst", shortLabel: "BR", description: "Clear a small cluster around the selected tile.", cost: 55 },
};

let tileId = 0;

export function nextTileId(): string {
  tileId += 1;
  return `tile-${Date.now().toString(36)}-${tileId.toString(36)}`;
}

export function randomTileKind(excluded: TileKind[] = []): TileKind {
  const pool = TILE_KINDS.filter((kind) => !excluded.includes(kind));
  return pool[Math.floor(Math.random() * pool.length)] || TILE_KINDS[0];
}
