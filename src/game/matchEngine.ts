import { TILE_KINDS, nextTileId, randomTileKind } from "./tiles";
import type { AvailableMove, Board, MatchGroup, Position, PowerupKind, ResolveResult, Tile, TileKind } from "./types";

const BOARD_SIZE = 8;
const MAX_CASCADES = 14;
const MATCH_DIRECTIONS: Array<{ rowStep: number; colStep: number; orientation: MatchGroup["orientation"] }> = [
  { rowStep: 0, colStep: 1, orientation: "row" },
  { rowStep: 1, colStep: 0, orientation: "column" },
  { rowStep: 1, colStep: 1, orientation: "diagonal" },
  { rowStep: 1, colStep: -1, orientation: "diagonal" },
];

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
  if (row >= 2 && col >= 2 && board[row - 1][col - 1]?.kind === board[row - 2][col - 2]?.kind) {
    excluded.push(board[row - 1][col - 1].kind);
  }
  if (row >= 2 && col + 2 < BOARD_SIZE && board[row - 1][col + 1]?.kind === board[row - 2][col + 2]?.kind) {
    excluded.push(board[row - 1][col + 1].kind);
  }
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
  return !detectMatches(board).length && hasAvailableMove(board) ? board : createBoard(size);
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

  for (const direction of MATCH_DIRECTIONS) {
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        const previous = { row: row - direction.rowStep, col: col - direction.colStep };
        const isStart =
          previous.row < 0 ||
          previous.row >= size ||
          previous.col < 0 ||
          previous.col >= size ||
          board[previous.row][previous.col].kind !== board[row][col].kind;
        if (!isStart) continue;

        const positions: Position[] = [];
        let scanRow = row;
        let scanCol = col;
        while (
          scanRow >= 0 &&
          scanRow < size &&
          scanCol >= 0 &&
          scanCol < size &&
          board[scanRow][scanCol].kind === board[row][col].kind
        ) {
          positions.push({ row: scanRow, col: scanCol });
          scanRow += direction.rowStep;
          scanCol += direction.colStep;
        }

        if (positions.length >= 3) {
          matches.push({
            kind: board[row][col].kind,
            orientation: direction.orientation,
            positions,
          });
        }
      }
    }
  }

  return matches;
}

export function hasAvailableMove(board: Board): boolean {
  return Boolean(findAvailableMove(board));
}

export function findAvailableMove(board: Board): AvailableMove | null {
  const size = board.length;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      const current = { row, col };
      const candidates = [
        { row: row + 1, col: col - 1 },
        { row: row + 1, col },
        { row: row + 1, col: col + 1 },
        { row, col: col + 1 },
      ].filter((position) => position.row < size && position.col >= 0 && position.col < size);

      const matchCandidate = candidates.find((candidate) => detectMatches(swapTiles(board, current, candidate)).length > 0);
      if (matchCandidate) {
        return { from: current, to: matchCandidate };
      }
    }
  }
  return null;
}

function key(position: Position): string {
  return `${position.row}:${position.col}`;
}

function choosePowerup(match: MatchGroup): PowerupKind | null {
  if (match.positions.length >= 7) return "prism";
  if (match.positions.length >= 6) return "diamond";
  if (match.positions.length >= 5) return "bomb";
  if (match.positions.length === 4) return match.orientation === "row" ? "line" : "burst";
  return null;
}

function addBombClearKeys(board: Board, position: Position, clearKeys: Set<string>): void {
  const size = board.length;
  const offsets = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
    [-2, 0],
    [2, 0],
    [0, -2],
    [0, 2],
  ];
  let added = 0;

  for (const [rowOffset, colOffset] of offsets) {
    if (added >= 10) break;
    const row = position.row + rowOffset;
    const col = position.col + colOffset;
    if (row < 0 || row >= size || col < 0 || col >= size) continue;
    const before = clearKeys.size;
    clearKeys.add(`${row}:${col}`);
    if (clearKeys.size > before) added += 1;
  }
}

function sortedBoardPositionsByDistance(board: Board, origin: Position): Position[] {
  const positions: Position[] = [];
  for (let row = 0; row < board.length; row += 1) {
    for (let col = 0; col < board[row].length; col += 1) {
      positions.push({ row, col });
    }
  }
  return positions.sort((a, b) => {
    const aDistance = Math.abs(a.row - origin.row) + Math.abs(a.col - origin.col);
    const bDistance = Math.abs(b.row - origin.row) + Math.abs(b.col - origin.col);
    return aDistance - bDistance || a.row - b.row || a.col - b.col;
  });
}

function addDiamondConversions(
  board: Board,
  position: Position,
  clearKeys: Set<string>,
  conversions: Map<string, TileKind>,
): void {
  const source = board[position.row][position.col];
  let converted = 0;
  for (const candidate of sortedBoardPositionsByDistance(board, position)) {
    if (converted >= 10) break;
    const candidateKey = key(candidate);
    if (candidateKey === key(position) || clearKeys.has(candidateKey)) continue;
    if (board[candidate.row][candidate.col].kind === source.kind) continue;
    conversions.set(candidateKey, source.kind);
    converted += 1;
  }
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

function expandPowerup(
  board: Board,
  position: Position,
  clearKeys: Set<string>,
  conversions: Map<string, TileKind>,
): void {
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

  if (tile.powerup === "bomb") {
    addBombClearKeys(board, position, clearKeys);
  }

  if (tile.powerup === "diamond") {
    addDiamondConversions(board, position, clearKeys, conversions);
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
  const clearedPositions: Position[] = [];
  const clearedByKind: Partial<Record<TileKind, number>> = {};

  while (cascades < MAX_CASCADES) {
    const matches = detectMatches(board);
    if (!matches.length) break;

    cascades += 1;
    bestCombo = Math.max(bestCombo, cascades);

    const clearKeys = new Set<string>();
    const powerupPlacements = new Map<string, PowerupKind>();
    const conversions = new Map<string, TileKind>();
    let matchBonus = 0;

    for (const match of matches) {
      const powerup = choosePowerup(match);
      if (powerup) {
        const anchor = match.positions[Math.floor(match.positions.length / 2)];
        powerupPlacements.set(key(anchor), powerup);
      }
      matchBonus += Math.max(0, match.positions.length - 3) * 160 * cascades;
      for (const position of match.positions) clearKeys.add(key(position));
    }

    for (const positionKey of Array.from(clearKeys)) {
      const [row, col] = positionKey.split(":").map(Number);
      expandPowerup(board, { row, col }, clearKeys, conversions);
    }

    for (const [positionKey, kind] of conversions) {
      if (clearKeys.has(positionKey)) continue;
      const [row, col] = positionKey.split(":").map(Number);
      board[row][col] = { ...board[row][col], id: nextTileId(), kind };
    }

    for (const positionKey of clearKeys) {
      const [row, col] = positionKey.split(":").map(Number);
      clearedPositions.push({ row, col });
      const kind = board[row][col].kind;
      clearedByKind[kind] = (clearedByKind[kind] || 0) + 1;
    }

    tilesCleared += clearKeys.size;
    score += clearKeys.size * 110 * cascades + matchBonus;
    board = collapseBoard(board, clearKeys, powerupPlacements);
  }

  if (!hasAvailableMove(board)) board = createBoard(board.length);

  return {
    board,
    score,
    tilesCleared,
    bestCombo,
    cascades,
    clearedPositions,
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
    clearedPositions: [...positions, ...resolved.clearedPositions],
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
