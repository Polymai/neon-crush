import { TILE_KINDS, nextTileId, randomTileKind } from "./tiles";
import type { Board, MatchGroup, Position, PowerupKind, ResolveResult, Tile, TileKind } from "./types";

const BOARD_SIZE = 8;
const MAX_CASCADES = 14;

function createTile(kind = randomTileKind()): Tile {
  return { id: nextTileId(), kind };
}

function cloneBoard(board: Board): Board {
  return board.map((row) => row.map((tile) => ({ ...tile })));
}

function getExcludedKinds(board: Board, row: number, col: number): TileKind[] {
  const excluded: TileKind[] = [];
  if (col >= 2 && board[row][col - 1]?.kind === board[row][col - 2]?.kind) excluded.push(board[row][col - 1].kind);
  if (row >= 2 && board[row - 1][col]?.kind === board[row - 2][col]?.kind) excluded.push(board[row - 1][col].kind);
  return excluded;
}

export function createBoard(size = BOARD_SIZE): Board {
  const board: Board = [];
  for (let row = 0; row < size; row += 1) {
    board[row] = [];
    for (let col = 0; col < size; col += 1) {
      board[row][col] = createTile(randomTileKind(getExcludedKinds(board, row, col)));
    }
  }
  return hasAvailableMove(board) ? board : createBoard(size);
}

export function swapTiles(board: Board, a: Position, b: Position): Board {
  const next = cloneBoard(board);
  const temp = next[a.row][a.col];
  next[a.row][a.col] = next[b.row][b.col];
  next[b.row][b.col] = temp;
  return next;
}

export function detectMatches(board: Board): MatchGroup[] {
  const matches: MatchGroup[] = [];
  const size = board.length;

  for (let row = 0; row < size; row += 1) {
    let start = 0;
    for (let col = 1; col <= size; col += 1) {
      if (col < size && board[row][col].kind === board[row][start].kind) continue;
      if (col - start >= 3) {
        matches.push({
          kind: board[row][start].kind,
          orientation: "row",
          positions: Array.from({ length: col - start }, (_, index) => ({ row, col: start + index })),
        });
      }
      start = col;
    }
  }

  for (let col = 0; col < size; col += 1) {
    let start = 0;
    for (let row = 1; row <= size; row += 1) {
      if (row < size && board[row][col].kind === board[start][col].kind) continue;
      if (row - start >= 3) {
        matches.push({
          kind: board[start][col].kind,
          orientation: "column",
          positions: Array.from({ length: row - start }, (_, index) => ({ row: start + index, col })),
        });
      }
      start = row;
    }
  }

  return matches;
}

export function hasAvailableMove(board: Board): boolean {
  const size = board.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const current = { row, col };
      const candidates = [
        { row: row + 1, col },
        { row, col: col + 1 },
      ].filter((position) => position.row < size && position.col < size);

      if (candidates.some((candidate) => detectMatches(swapTiles(board, current, candidate)).length > 0)) {
        return true;
      }
    }
  }
  return false;
}

function key(position: Position): string {
  return `${position.row}:${position.col}`;
}

function choosePowerup(match: MatchGroup): PowerupKind | null {
  if (match.positions.length >= 5) return "prism";
  if (match.positions.length === 4) return match.orientation === "row" ? "line" : "burst";
  return null;
}

function collapseBoard(board: Board, clearKeys: Set<string>, powerupPlacements: Map<string, PowerupKind>): Board {
  const size = board.length;
  const next: Board = Array.from({ length: size }, () => Array<Tile>(size));

  for (let col = 0; col < size; col += 1) {
    const kept: Tile[] = [];
    for (let row = size - 1; row >= 0; row -= 1) {
      if (!clearKeys.has(`${row}:${col}`)) kept.push(board[row][col]);
    }

    for (let row = size - 1; row >= 0; row -= 1) {
      const existing = kept.shift();
      next[row][col] = existing || createTile();
      const placement = powerupPlacements.get(`${row}:${col}`);
      if (placement) next[row][col].powerup = placement;
    }
  }

  return next;
}

function expandPowerup(board: Board, position: Position, clearKeys: Set<string>): void {
  const tile = board[position.row][position.col];
  if (!tile.powerup) return;
  const size = board.length;

  if (tile.powerup === "line") {
    for (let col = 0; col < size; col += 1) clearKeys.add(`${position.row}:${col}`);
  }

  if (tile.powerup === "burst") {
    for (let row = Math.max(0, position.row - 1); row <= Math.min(size - 1, position.row + 1); row += 1) {
      for (let col = Math.max(0, position.col - 1); col <= Math.min(size - 1, position.col + 1); col += 1) {
        clearKeys.add(`${row}:${col}`);
      }
    }
  }

  if (tile.powerup === "prism") {
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (board[row][col].kind === tile.kind) clearKeys.add(`${row}:${col}`);
      }
    }
  }
}

export function resolveBoard(startBoard: Board): ResolveResult {
  let board = cloneBoard(startBoard);
  let cascades = 0;
  let score = 0;
  let tilesCleared = 0;
  let bestCombo = 0;
  const clearedByKind: Partial<Record<TileKind, number>> = {};

  while (cascades < MAX_CASCADES) {
    const matches = detectMatches(board);
    if (!matches.length) break;

    cascades += 1;
    bestCombo = Math.max(bestCombo, cascades);

    const clearKeys = new Set<string>();
    const powerupPlacements = new Map<string, PowerupKind>();

    for (const match of matches) {
      const powerup = choosePowerup(match);
      if (powerup) {
        const anchor = match.positions[Math.floor(match.positions.length / 2)];
        powerupPlacements.set(key(anchor), powerup);
      }
      for (const position of match.positions) clearKeys.add(key(position));
    }

    for (const positionKey of Array.from(clearKeys)) {
      const [row, col] = positionKey.split(":").map(Number);
      expandPowerup(board, { row, col }, clearKeys);
    }

    for (const positionKey of clearKeys) {
      const [row, col] = positionKey.split(":").map(Number);
      const kind = board[row][col].kind;
      clearedByKind[kind] = (clearedByKind[kind] || 0) + 1;
    }

    tilesCleared += clearKeys.size;
    score += clearKeys.size * 110 * cascades;
    board = collapseBoard(board, clearKeys, powerupPlacements);
  }

  if (!hasAvailableMove(board)) board = createBoard(board.length);

  return {
    board,
    score,
    tilesCleared,
    bestCombo,
    cascades,
    clearedByKind,
    message: cascades > 1 ? `${cascades} cascade combo` : tilesCleared ? `${tilesCleared} tiles cleared` : "No matches",
  };
}

export function clearPositions(board: Board, positions: Position[]): ResolveResult {
  const clearKeys = new Set(positions.map(key));
  const clearedByKind: Partial<Record<TileKind, number>> = {};
  for (const position of positions) {
    const kind = board[position.row]?.[position.col]?.kind;
    if (kind) clearedByKind[kind] = (clearedByKind[kind] || 0) + 1;
  }
  const collapsed = collapseBoard(cloneBoard(board), clearKeys, new Map());
  const resolved = resolveBoard(collapsed);
  return {
    ...resolved,
    score: resolved.score + clearKeys.size * 85,
    tilesCleared: resolved.tilesCleared + clearKeys.size,
    clearedByKind: TILE_KINDS.reduce<Partial<Record<TileKind, number>>>((acc, kind) => {
      const value = (clearedByKind[kind] || 0) + (resolved.clearedByKind[kind] || 0);
      if (value) acc[kind] = value;
      return acc;
    }, {}),
    message: `Booster cleared ${clearKeys.size} tiles`,
  };
}

export function positionsForBooster(board: Board, booster: "laser" | "burst", selected: Position | null): Position[] {
  const size = board.length;
  const center = selected || { row: Math.floor(size / 2), col: Math.floor(size / 2) };

  if (booster === "laser") {
    return Array.from({ length: size }, (_, col) => ({ row: center.row, col }));
  }

  const positions: Position[] = [];
  for (let row = Math.max(0, center.row - 1); row <= Math.min(size - 1, center.row + 1); row += 1) {
    for (let col = Math.max(0, center.col - 1); col <= Math.min(size - 1, center.col + 1); col += 1) {
      positions.push({ row, col });
    }
  }
  return positions;
}
