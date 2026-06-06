import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type PointerEvent, type RefObject } from "react";
import { isAdjacentPosition, isSamePosition, resolvePointerPosition } from "../game/input";
import { findAvailableMove } from "../game/matchEngine";
import { TILE_META, POWERUP_META } from "../game/tiles";
import type { AvailableMove, Board, BoardEffectEvent, Position } from "../game/types";

const HINT_IDLE_MS = 5200;
const BURST_PARTICLES = [
  { x: 0, y: -34 },
  { x: 29, y: -18 },
  { x: 32, y: 18 },
  { x: 0, y: 36 },
  { x: -31, y: 18 },
  { x: -28, y: -20 },
];

interface ScoreFlight {
  id: string;
  score: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
  distance: number;
  angle: number;
}

interface GameBoardProps {
  board: Board;
  selected: Position | null;
  effect: BoardEffectEvent | null;
  scoreTargetRef: RefObject<HTMLDivElement>;
  onSelect: (position: Position) => void;
  onSwap: (a: Position, b: Position) => void;
}

export function GameBoard({ board, selected, effect, scoreTargetRef, onSelect, onSwap }: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<Position | null>(null);
  const [dragOrigin, setDragOrigin] = useState<Position | null>(null);
  const [dragTarget, setDragTarget] = useState<Position | null>(null);
  const [flight, setFlight] = useState<ScoreFlight | null>(null);
  const [hintMove, setHintMove] = useState<AvailableMove | null>(null);
  const rowCount = board.length || 8;
  const colCount = board[0]?.length || 8;
  const burstPositions = useMemo(() => (effect ? effect.positions.slice(0, 48) : []), [effect]);
  const hintKeys = useMemo(() => {
    if (!hintMove) return new Set<string>();
    return new Set([positionKey(hintMove.from), positionKey(hintMove.to)]);
  }, [hintMove]);

  useEffect(() => {
    if (!effect || effect.score <= 0) {
      setFlight(null);
      return;
    }

    const root = boardRef.current;
    const target = scoreTargetRef.current;
    if (!root || !target) return;

    const boardRect = root.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    const startX = ((effect.origin.col + 0.5) / colCount) * boardRect.width;
    const startY = ((effect.origin.row + 0.5) / rowCount) * boardRect.height;
    const endX = targetRect.left + targetRect.width * 0.5 - boardRect.left;
    const endY = targetRect.top + targetRect.height * 0.52 - boardRect.top;
    const distance = Math.hypot(endX - startX, endY - startY);
    const angle = Math.atan2(endY - startY, endX - startX) * (180 / Math.PI);

    setFlight({
      id: effect.id,
      score: effect.score,
      startX,
      startY,
      endX,
      endY,
      midX: startX + (endX - startX) * 0.55,
      midY: startY + (endY - startY) * 0.35 - Math.min(90, distance * 0.18),
      distance,
      angle,
    });
  }, [colCount, effect, rowCount, scoreTargetRef]);

  useEffect(() => {
    setHintMove(null);
    if (selected) return undefined;

    const timer = window.setTimeout(() => {
      setHintMove(findAvailableMove(board));
    }, HINT_IDLE_MS);

    return () => window.clearTimeout(timer);
  }, [board, effect?.id, selected]);

  function positionKey(position: Position) {
    return `${position.row}:${position.col}`;
  }

  function selectedClass(position: Position) {
    return selected?.row === position.row && selected.col === position.col ? " tile-selected" : "";
  }

  function dragClass(position: Position) {
    if (isSamePosition(dragOrigin, position)) return " tile-drag-start";
    if (isSamePosition(dragTarget, position)) return " tile-drag-target";
    return "";
  }

  function hintClass(position: Position) {
    return hintKeys.has(positionKey(position)) ? " tile-hint" : "";
  }

  function effectPositionStyle(position: Position) {
    return {
      left: `${((position.col + 0.5) / colCount) * 100}%`,
      top: `${((position.row + 0.5) / rowCount) * 100}%`,
    };
  }

  function handleBoardPointerDown(event: PointerEvent<HTMLDivElement>) {
    const root = boardRef.current;
    if (!root) return;
    const position = resolvePointerPosition(root, event.clientX, event.clientY, rowCount, colCount);
    if (!position) return;
    event.preventDefault();
    setHintMove(null);
    dragStart.current = position;
    setDragOrigin(position);
    setDragTarget(null);
    root.setPointerCapture(event.pointerId);
  }

  function handleBoardPointerMove(event: PointerEvent<HTMLDivElement>) {
    const root = boardRef.current;
    const start = dragStart.current;
    if (!root || !start) return;
    const position = resolvePointerPosition(root, event.clientX, event.clientY, rowCount, colCount);
    if (!position || isSamePosition(start, position)) {
      setDragTarget(null);
      return;
    }
    setDragTarget(isAdjacentPosition(start, position) ? position : null);
  }

  function handleBoardPointerUp(event: PointerEvent<HTMLDivElement>) {
    const root = boardRef.current;
    const start = dragStart.current;
    const end = root ? resolvePointerPosition(root, event.clientX, event.clientY, rowCount, colCount) : null;
    dragStart.current = null;
    setDragOrigin(null);
    setDragTarget(null);
    if (root?.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    if (!start) return;
    if (end && !isSamePosition(start, end) && isAdjacentPosition(start, end)) {
      onSwap(start, end);
      return;
    }
    onSelect(start);
  }

  function handleBoardPointerCancel(event: PointerEvent<HTMLDivElement>) {
    const root = boardRef.current;
    dragStart.current = null;
    setDragOrigin(null);
    setDragTarget(null);
    if (root?.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
  }

  return (
    <div className="board-wrap">
      <div
        ref={boardRef}
        className={`game-board${dragOrigin ? " game-board-dragging" : ""}`}
        role="grid"
        aria-label="Neon Crush board"
        onPointerDown={handleBoardPointerDown}
        onPointerMove={handleBoardPointerMove}
        onPointerUp={handleBoardPointerUp}
        onPointerCancel={handleBoardPointerCancel}
      >
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
                className={`tile ${meta.cssClass}${tile.powerup ? " tile-powerup" : ""}${selectedClass(position)}${dragClass(position)}${hintClass(position)}`}
                data-powerup={powerup?.symbol || ""}
                aria-label={`${meta.label} tile at row ${rowIndex + 1}, column ${colIndex + 1}${powerup ? ` with ${powerup.label}` : ""}`}
                whileTap={{ scale: 0.94 }}
              >
                <span>{meta.symbol}</span>
              </motion.button>
            );
          }),
        )}
        {effect ? (
          <div className={`board-effect-layer board-effect-${effect.kind}`} key={effect.id} aria-hidden="true">
            {burstPositions.map((position, index) => (
              <span
                className="tile-burst"
                style={effectPositionStyle(position)}
                key={`${effect.id}-${position.row}-${position.col}-${index}`}
              >
                <motion.span
                  className="burst-ring"
                  initial={{ opacity: 0.9, scale: 0.25 }}
                  animate={{ opacity: 0, scale: effect.kind === "miss" ? 1.35 : 2.15 }}
                  transition={{ duration: effect.kind === "miss" ? 0.34 : 0.58, delay: Math.min(index * 0.012, 0.14) }}
                />
                {BURST_PARTICLES.map((particle, particleIndex) => (
                  <motion.span
                    className="burst-particle"
                    initial={{ opacity: 1, x: 0, y: 0, scale: 0.8 }}
                    animate={{
                      opacity: 0,
                      x: particle.x * (effect.kind === "miss" ? 0.45 : 1),
                      y: particle.y * (effect.kind === "miss" ? 0.45 : 1),
                      scale: 0.15,
                    }}
                    transition={{ duration: effect.kind === "miss" ? 0.3 : 0.56, delay: Math.min(index * 0.012, 0.14) }}
                    key={particleIndex}
                  />
                ))}
              </span>
            ))}
          </div>
        ) : null}
        {flight ? (
          <div className="score-flight-layer" aria-hidden="true">
            <span
              className="score-lightning-path"
              style={{
                left: flight.startX,
                top: flight.startY,
                width: flight.distance,
                transform: `rotate(${flight.angle}deg)`,
              }}
            >
              <motion.span
                className="score-lightning-core"
                initial={{ opacity: 0, scaleX: 0 }}
                animate={{ opacity: [0, 1, 0], scaleX: [0, 1, 0.35] }}
                transition={{ duration: 0.58, ease: "easeOut" }}
              />
            </span>
            <motion.div
              className="score-bolt"
              initial={{ x: flight.startX, y: flight.startY, opacity: 0, scale: 0.72 }}
              animate={{
                x: [flight.startX, flight.midX, flight.endX],
                y: [flight.startY, flight.midY, flight.endY],
                opacity: [0, 1, 1, 0],
                scale: [0.72, 1.12, 0.92],
              }}
              transition={{ duration: 0.74, ease: "easeOut" }}
              onAnimationComplete={() => setFlight(null)}
            >
              +{flight.score.toLocaleString()}
            </motion.div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
