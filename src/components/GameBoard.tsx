import { motion } from "framer-motion";
import { useRef, type PointerEvent } from "react";
import { resolvePointerPosition } from "../game/input";
import { TILE_META, POWERUP_META } from "../game/tiles";
import type { Board, Position } from "../game/types";

interface GameBoardProps {
  board: Board;
  selected: Position | null;
  onSelect: (position: Position) => void;
  onSwap: (a: Position, b: Position) => void;
}

export function GameBoard({ board, selected, onSelect, onSwap }: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<Position | null>(null);

  function selectedClass(position: Position) {
    return selected?.row === position.row && selected.col === position.col ? " tile-selected" : "";
  }

  function handlePointerDown(position: Position) {
    dragStart.current = position;
  }

  function handlePointerUp(event: PointerEvent<HTMLButtonElement>, position: Position) {
    const root = boardRef.current;
    const start = dragStart.current;
    dragStart.current = null;
    if (!root || !start) {
      onSelect(position);
      return;
    }
    const end = resolvePointerPosition(root, event.clientX, event.clientY, board.length, board[0]?.length || 8);
    if (end && (end.row !== start.row || end.col !== start.col)) onSwap(start, end);
    else onSelect(position);
  }

  return (
    <div className="board-wrap">
      <div ref={boardRef} className="game-board" role="grid" aria-label="Neon Crush board">
        {board.map((row, rowIndex) =>
          row.map((tile, colIndex) => {
            const meta = TILE_META[tile.kind];
            const powerup = tile.powerup ? POWERUP_META[tile.powerup] : null;
            const position = { row: rowIndex, col: colIndex };
            return (
              <motion.button
                layout
                key={tile.id}
                type="button"
                role="gridcell"
                className={`tile ${meta.cssClass}${tile.powerup ? " tile-powerup" : ""}${selectedClass(position)}`}
                data-powerup={powerup?.symbol || ""}
                aria-label={`${meta.label} tile at row ${rowIndex + 1}, column ${colIndex + 1}${powerup ? ` with ${powerup.label}` : ""}`}
                onPointerDown={() => handlePointerDown(position)}
                onPointerUp={(event) => handlePointerUp(event, position)}
                whileTap={{ scale: 0.94 }}
              >
                <span>{meta.symbol}</span>
              </motion.button>
            );
          }),
        )}
      </div>
    </div>
  );
}
