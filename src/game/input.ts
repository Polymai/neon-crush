import type { Position } from "./types";

export function isSamePosition(a: Position | null, b: Position | null): boolean {
  return !!a && !!b && a.row === b.row && a.col === b.col;
}

export function isAdjacentPosition(a: Position, b: Position): boolean {
  const rowDelta = Math.abs(a.row - b.row);
  const colDelta = Math.abs(a.col - b.col);
  return rowDelta <= 1 && colDelta <= 1 && rowDelta + colDelta > 0;
}

export function positionKey(position: Position): string {
  return `${position.row}:${position.col}`;
}

export function resolvePointerPosition(target: HTMLElement, clientX: number, clientY: number, rows: number, cols: number): Position | null {
  const rect = target.getBoundingClientRect();
  if (clientX < rect.left || clientX > rect.right || clientY < rect.top || clientY > rect.bottom) return null;
  const col = Math.min(cols - 1, Math.max(0, Math.floor(((clientX - rect.left) / rect.width) * cols)));
  const row = Math.min(rows - 1, Math.max(0, Math.floor(((clientY - rect.top) / rect.height) * rows)));
  return { row, col };
}
