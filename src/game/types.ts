export type TileKind = "cyan" | "magenta" | "lime" | "amber" | "violet" | "coral";
export type PowerupKind = "line" | "burst" | "prism";
export type BoosterKey = "shuffle" | "laser" | "burst";
export type GameStatus = "playing" | "won" | "lost";

export interface Position {
  row: number;
  col: number;
}

export interface Tile {
  id: string;
  kind: TileKind;
  powerup?: PowerupKind;
}

export type Board = Tile[][];

export interface MatchGroup {
  kind: TileKind;
  positions: Position[];
  orientation: "row" | "column";
}

export interface LevelGoal {
  kind: TileKind;
  count: number;
}

export interface LevelDefinition {
  id: number;
  name: string;
  moves: number;
  targetScore: number;
  goals: LevelGoal[];
}

export interface ResolveResult {
  board: Board;
  score: number;
  tilesCleared: number;
  bestCombo: number;
  cascades: number;
  clearedByKind: Partial<Record<TileKind, number>>;
  message: string;
}

export interface LevelResult {
  resultId: string;
  levelId: number;
  score: number;
  stars: number;
  movesLeft: number;
  tilesCleared: number;
  bestCombo: number;
  won: boolean;
  durationSeconds: number;
}

export interface DailyRewardOutcome {
  rewardDate: string;
  streakDay: number;
  coins: number;
  boosterKey: BoosterKey | null;
  label: string;
}
