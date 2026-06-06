import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { getLevel, getNextLevelId } from "../game/levels";
import { clearPositions, createBoard, detectMatches, positionsForBooster, resolveBoard, swapTiles } from "../game/matchEngine";
import type {
  Board,
  BoardEffectEvent,
  BoosterKey,
  GameStatus,
  LevelDefinition,
  LevelResult,
  Position,
  ResolveResult,
  TileKind,
} from "../game/types";
import { isAdjacentPosition, isSamePosition } from "../game/input";
import { neonAudio } from "../game/audio";

interface GameState {
  board: Board;
  level: LevelDefinition;
  selected: Position | null;
  score: number;
  movesLeft: number;
  tilesCleared: number;
  bestCombo: number;
  goalsCleared: Partial<Record<TileKind, number>>;
  status: GameStatus;
  message: string;
  startedAt: number;
  lastResult: LevelResult | null;
  effect: BoardEffectEvent | null;
}

interface GameContextValue extends GameState {
  startLevel: (levelId: number) => void;
  restartLevel: () => void;
  nextLevel: () => void;
  selectTile: (position: Position) => void;
  swapPositions: (a: Position, b: Position) => void;
  useBoardBooster: (booster: BoosterKey) => boolean;
  acknowledgeResult: () => void;
}

function createInitialState(levelId = 1): GameState {
  const level = getLevel(levelId);
  return {
    board: createBoard(),
    level,
    selected: null,
    score: 0,
    movesLeft: level.moves,
    tilesCleared: 0,
    bestCombo: 0,
    goalsCleared: {},
    status: "playing",
    message: "Drag one tile onto a neighbor to swap. Match 3+ in any line.",
    startedAt: Date.now(),
    lastResult: null,
    effect: null,
  };
}

function createEffectId(kind: BoardEffectEvent["kind"]): string {
  return `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function midpoint(a: Position, b: Position): Position {
  return {
    row: (a.row + b.row) / 2,
    col: (a.col + b.col) / 2,
  };
}

function effectFromResolve(kind: "match" | "booster", origin: Position, resolved: ResolveResult): BoardEffectEvent {
  return {
    id: createEffectId(kind),
    kind,
    origin,
    positions: resolved.clearedPositions,
    score: resolved.score,
    tilesCleared: resolved.tilesCleared,
    cascades: resolved.cascades,
  };
}

function mergeCleared(
  existing: Partial<Record<TileKind, number>>,
  incoming: Partial<Record<TileKind, number>>,
): Partial<Record<TileKind, number>> {
  const next = { ...existing };
  for (const [kind, count] of Object.entries(incoming) as Array<[TileKind, number]>) {
    next[kind] = (next[kind] || 0) + count;
  }
  return next;
}

function goalsComplete(level: LevelDefinition, cleared: Partial<Record<TileKind, number>>): boolean {
  return level.goals.every((goal) => (cleared[goal.kind] || 0) >= goal.count);
}

function calculateStars(level: LevelDefinition, score: number, movesLeft: number): number {
  if (score >= level.targetScore * 1.45 && movesLeft >= Math.ceil(level.moves * 0.2)) return 3;
  if (score >= level.targetScore * 1.15) return 2;
  if (score >= level.targetScore) return 1;
  return 0;
}

function resultFromState(state: GameState, won: boolean): LevelResult {
  return {
    resultId: `${state.level.id}-${Date.now()}`,
    levelId: state.level.id,
    score: state.score,
    stars: won ? Math.max(1, calculateStars(state.level, state.score, state.movesLeft)) : 0,
    movesLeft: state.movesLeft,
    tilesCleared: state.tilesCleared,
    bestCombo: state.bestCombo,
    won,
    durationSeconds: Math.max(1, Math.round((Date.now() - state.startedAt) / 1000)),
  };
}

function settleState(state: GameState, patch: Partial<GameState>): GameState {
  const next: GameState = { ...state, ...patch };
  const didWin = next.score >= next.level.targetScore && goalsComplete(next.level, next.goalsCleared);
  const didLose = !didWin && next.movesLeft <= 0;

  if (didWin) {
    neonAudio.blip("win");
    return {
      ...next,
      selected: null,
      status: "won",
      message: "Level clear. Bank the score or push into the next run.",
      lastResult: resultFromState(next, true),
    };
  }

  if (didLose) {
    neonAudio.blip("lose");
    return {
      ...next,
      selected: null,
      status: "lost",
      message: "Out of moves. Restart the level or spend a booster.",
      lastResult: resultFromState(next, false),
    };
  }

  return next;
}

const GameContext = createContext<GameContextValue | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GameState>(() => createInitialState());

  const startLevel = useCallback((levelId: number) => {
    setState(createInitialState(levelId));
  }, []);

  const restartLevel = useCallback(() => {
    setState((current) => createInitialState(current.level.id));
  }, []);

  const nextLevel = useCallback(() => {
    setState((current) => createInitialState(getNextLevelId(current.level.id)));
  }, []);

  const resolveSwap = useCallback((current: GameState, a: Position, b: Position): GameState => {
    if (current.status !== "playing" || !isAdjacentPosition(a, b)) return current;
    const swapped = swapTiles(current.board, a, b);
    if (!detectMatches(swapped).length) {
      neonAudio.blip("swap");
      return {
        ...current,
        selected: null,
        message: "That drag made no match. Pause for a glowing hint.",
        effect: {
          id: createEffectId("miss"),
          kind: "miss",
          origin: midpoint(a, b),
          positions: [a, b],
          score: 0,
          tilesCleared: 0,
          cascades: 0,
        },
      };
    }

    const resolved = resolveBoard(swapped);
    neonAudio.blip("match");
    return settleState(current, {
      board: resolved.board,
      selected: null,
      score: current.score + resolved.score,
      movesLeft: current.movesLeft - 1,
      tilesCleared: current.tilesCleared + resolved.tilesCleared,
      bestCombo: Math.max(current.bestCombo, resolved.bestCombo),
      goalsCleared: mergeCleared(current.goalsCleared, resolved.clearedByKind),
      message: resolved.message,
      effect: effectFromResolve("match", midpoint(a, b), resolved),
    });
  }, []);

  const selectTile = useCallback(
    (position: Position) => {
      setState((current) => {
        if (current.status !== "playing") return current;
        if (!current.selected) return { ...current, selected: position, message: "Drag this tile onto a neighboring tile." };
        if (isSamePosition(current.selected, position)) return { ...current, selected: null, message: "Selection cleared." };
        if (!isAdjacentPosition(current.selected, position)) return { ...current, selected: position, message: "Choose a tile next to this one." };
        return resolveSwap(current, current.selected, position);
      });
      neonAudio.start();
    },
    [resolveSwap],
  );

  const swapPositions = useCallback(
    (a: Position, b: Position) => {
      setState((current) => resolveSwap(current, a, b));
      neonAudio.start();
    },
    [resolveSwap],
  );

  const useBoardBooster = useCallback((booster: BoosterKey) => {
    let used = false;
    setState((current) => {
      if (current.status !== "playing") return current;
      used = true;

      if (booster === "shuffle") {
        neonAudio.blip("swap");
        return { ...current, board: createBoard(), selected: null, message: "Board shuffled." };
      }

      const positions = positionsForBooster(current.board, booster, current.selected);
      const resolved = clearPositions(current.board, positions);
      neonAudio.blip("match");
      return settleState(current, {
        board: resolved.board,
        selected: null,
        score: current.score + resolved.score,
        tilesCleared: current.tilesCleared + resolved.tilesCleared,
        bestCombo: Math.max(current.bestCombo, resolved.bestCombo),
        goalsCleared: mergeCleared(current.goalsCleared, resolved.clearedByKind),
        message: resolved.message,
        effect: effectFromResolve("booster", current.selected || positions[0] || { row: 3.5, col: 3.5 }, resolved),
      });
    });
    neonAudio.start();
    return used;
  }, []);

  const acknowledgeResult = useCallback(() => {
    setState((current) => ({ ...current, lastResult: null }));
  }, []);

  const value = useMemo<GameContextValue>(
    () => ({
      ...state,
      startLevel,
      restartLevel,
      nextLevel,
      selectTile,
      swapPositions,
      useBoardBooster,
      acknowledgeResult,
    }),
    [acknowledgeResult, nextLevel, restartLevel, selectTile, startLevel, state, swapPositions, useBoardBooster],
  );

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGame() {
  const context = useContext(GameContext);
  if (!context) throw new Error("useGame must be used inside GameProvider");
  return context;
}
