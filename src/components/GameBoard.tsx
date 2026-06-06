import { motion } from "framer-motion";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent, type RefObject } from "react";
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
const SCORE_SPARKS = Array.from({ length: 12 }, (_, index) => index);

interface ScoreFlight {
  id: string;
  score: number;
  tier: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  midX: number;
  midY: number;
  distance: number;
  angle: number;
}

interface DragVisual {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  distance: number;
  angle: number;
  tileSize: number;
  valid: boolean;
}

interface GameBoardProps {
  board: Board;
  selected: Position | null;
  effect: BoardEffectEvent | null;
  cleared: boolean;
  scoreTargetRef: RefObject<HTMLDivElement>;
  onSelect: (position: Position) => void;
  onSwap: (a: Position, b: Position) => void;
  onNextLevel: () => void;
}

export function GameBoard({ board, selected, effect, cleared, scoreTargetRef, onSelect, onSwap, onNextLevel }: GameBoardProps) {
  const boardRef = useRef<HTMLDivElement | null>(null);
  const dragStart = useRef<Position | null>(null);
  const [dragOrigin, setDragOrigin] = useState<Position | null>(null);
  const [dragTarget, setDragTarget] = useState<Position | null>(null);
  const [dragVisual, setDragVisual] = useState<DragVisual | null>(null);
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
      tier: scoreTier(effect.score, effect.cascades),
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
    if (!flight) return undefined;
    const target = scoreTargetRef.current;
    if (!target) return undefined;

    const impactTimer = window.setTimeout(() => {
      target.classList.add("score-impact");
    }, 1420);
    const cleanupTimer = window.setTimeout(() => {
      target.classList.remove("score-impact");
    }, 2100);

    return () => {
      window.clearTimeout(impactTimer);
      window.clearTimeout(cleanupTimer);
      target.classList.remove("score-impact");
    };
  }, [flight, scoreTargetRef]);

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

  function scoreTier(score: number, cascades: number) {
    if (score >= 2800 || cascades >= 5) return 4;
    if (score >= 1500 || cascades >= 3) return 3;
    if (score >= 760 || cascades >= 2) return 2;
    return 1;
  }

  function scorePopStyle(event: BoardEffectEvent): CSSProperties {
    const tier = scoreTier(event.score, event.cascades);
    const scale = 0.92 + Math.min(0.9, event.score / 3400);
    return {
      ...effectPositionStyle(event.origin),
      "--score-pop-scale": scale.toFixed(2),
      "--score-pop-hue": `${185 + tier * 30}deg`,
    } as CSSProperties;
  }

  function cellCenterPx(root: HTMLElement, position: Position) {
    const rect = root.getBoundingClientRect();
    return {
      x: ((position.col + 0.5) / colCount) * rect.width,
      y: ((position.row + 0.5) / rowCount) * rect.height,
      tileSize: Math.max(30, Math.min(78, Math.min(rect.width / colCount, rect.height / rowCount) - 8)),
    };
  }

  function clamp(value: number, min: number, max: number) {
    return Math.max(min, Math.min(max, value));
  }

  function restingDragVisual(root: HTMLElement, start: Position): DragVisual {
    const center = cellCenterPx(root, start);
    return {
      startX: center.x,
      startY: center.y,
      endX: center.x,
      endY: center.y,
      distance: 0,
      angle: 0,
      tileSize: center.tileSize,
      valid: false,
    };
  }

  function createDragVisual(root: HTMLElement, start: Position, clientX: number, clientY: number, target: Position | null): DragVisual {
    const rect = root.getBoundingClientRect();
    const startCenter = cellCenterPx(root, start);
    const targetCenter = target ? cellCenterPx(root, target) : null;
    const rawX = clamp(clientX - rect.left, 0, rect.width);
    const rawY = clamp(clientY - rect.top, 0, rect.height);
    const rawDx = rawX - startCenter.x;
    const rawDy = rawY - startCenter.y;
    const rawDistance = Math.hypot(rawDx, rawDy);
    const maxDistance = startCenter.tileSize * 1.25;
    const dragScale = rawDistance > maxDistance && rawDistance > 0 ? maxDistance / rawDistance : 1;
    const endX = targetCenter?.x ?? startCenter.x + rawDx * dragScale;
    const endY = targetCenter?.y ?? startCenter.y + rawDy * dragScale;
    const distance = Math.hypot(endX - startCenter.x, endY - startCenter.y);

    return {
      startX: startCenter.x,
      startY: startCenter.y,
      endX,
      endY,
      distance,
      angle: Math.atan2(endY - startCenter.y, endX - startCenter.x) * (180 / Math.PI),
      tileSize: startCenter.tileSize,
      valid: !!target,
    };
  }

  function dragPathStyle(visual: DragVisual): CSSProperties {
    return {
      left: visual.startX,
      top: visual.startY,
      width: visual.distance,
      transform: `rotate(${visual.angle}deg)`,
    };
  }

  function dragGhostStyle(visual: DragVisual): CSSProperties {
    return {
      left: visual.endX,
      top: visual.endY,
      "--drag-tile-size": `${visual.tileSize}px`,
    } as CSSProperties;
  }

  function isOverlayPointer(event: PointerEvent<HTMLDivElement>) {
    return event.target instanceof Element && !!event.target.closest("[data-board-overlay]");
  }

  function handleBoardPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (isOverlayPointer(event)) return;
    const root = boardRef.current;
    if (!root) return;
    const position = resolvePointerPosition(root, event.clientX, event.clientY, rowCount, colCount);
    if (!position) return;
    event.preventDefault();
    setHintMove(null);
    dragStart.current = position;
    setDragOrigin(position);
    setDragTarget(null);
    setDragVisual(restingDragVisual(root, position));
    root.setPointerCapture(event.pointerId);
  }

  function handleBoardPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (isOverlayPointer(event)) return;
    const root = boardRef.current;
    const start = dragStart.current;
    if (!root || !start) return;
    const position = resolvePointerPosition(root, event.clientX, event.clientY, rowCount, colCount);
    const nextTarget = position && !isSamePosition(start, position) && isAdjacentPosition(start, position) ? position : null;
    setDragTarget(nextTarget);
    setDragVisual(createDragVisual(root, start, event.clientX, event.clientY, nextTarget));
  }

  function handleBoardPointerUp(event: PointerEvent<HTMLDivElement>) {
    if (isOverlayPointer(event)) return;
    const root = boardRef.current;
    const start = dragStart.current;
    const end = root ? resolvePointerPosition(root, event.clientX, event.clientY, rowCount, colCount) : null;
    dragStart.current = null;
    setDragOrigin(null);
    setDragTarget(null);
    setDragVisual(null);
    if (root?.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
    if (!start) return;
    if (end && !isSamePosition(start, end) && isAdjacentPosition(start, end)) {
      onSwap(start, end);
      return;
    }
    onSelect(start);
  }

  function handleBoardPointerCancel(event: PointerEvent<HTMLDivElement>) {
    if (isOverlayPointer(event)) return;
    const root = boardRef.current;
    dragStart.current = null;
    setDragOrigin(null);
    setDragTarget(null);
    setDragVisual(null);
    if (root?.hasPointerCapture(event.pointerId)) root.releasePointerCapture(event.pointerId);
  }

  const draggedTile = dragOrigin ? board[dragOrigin.row]?.[dragOrigin.col] : null;
  const draggedMeta = draggedTile ? TILE_META[draggedTile.kind] : null;
  const draggedPowerup = draggedTile?.powerup ? POWERUP_META[draggedTile.powerup] : null;

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
        {dragVisual && dragOrigin && draggedMeta ? (
          <div className={`drag-visual-layer${dragVisual.valid ? " drag-visual-valid" : ""}`} aria-hidden="true">
            <span className="drag-origin-halo" style={effectPositionStyle(dragOrigin)} />
            {dragVisual.distance > 3 ? (
              <span className="drag-vector" style={dragPathStyle(dragVisual)}>
                <span className="drag-vector-core" />
              </span>
            ) : null}
            {dragTarget ? <span className="drag-target-halo" style={effectPositionStyle(dragTarget)} /> : null}
            <span
              className={`drag-ghost ${draggedMeta.cssClass}${draggedTile?.powerup ? " drag-ghost-powerup" : ""}`}
              data-powerup={draggedPowerup?.symbol || ""}
              style={dragGhostStyle(dragVisual)}
            >
              <span>{draggedMeta.symbol}</span>
            </span>
          </div>
        ) : null}
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
            {effect.score > 0 ? (
              <motion.div
                className={`score-pop score-pop-tier-${scoreTier(effect.score, effect.cascades)}`}
                style={scorePopStyle(effect)}
                initial={{ opacity: 0, scale: 0.25, rotate: -8 }}
                animate={{
                  opacity: [0, 1, 1, 1, 0],
                  scale: [0.25, 1.26, 1.08, 1.04, 1.48],
                  y: [4, -10, -14, -16, -34],
                  rotate: [-8, 4, -2, 0, 0],
                }}
                transition={{ duration: 1.38, times: [0, 0.18, 0.48, 0.74, 1], ease: "easeOut" }}
              >
                <span className="score-pop-sparks">
                  {SCORE_SPARKS.map((spark) => (
                    <span className="score-pop-spark" key={spark} />
                  ))}
                </span>
                <strong>+{effect.score.toLocaleString()}</strong>
              </motion.div>
            ) : null}
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
                animate={{ opacity: [0, 1, 1, 0], scaleX: [0, 0.64, 1, 0.25] }}
                transition={{ duration: 1.1, delay: 0.48, ease: "easeOut" }}
              />
            </span>
            <motion.div
              className={`score-bolt score-bolt-tier-${flight.tier}`}
              initial={{ x: flight.startX, y: flight.startY, opacity: 0, scale: 0.72 }}
              animate={{
                x: [flight.startX, flight.midX, flight.endX],
                y: [flight.startY, flight.midY, flight.endY],
                opacity: [0, 1, 1, 1, 0],
                scale: [0.72, 1.18, 1.08, 0.86, 0.32],
              }}
              transition={{ duration: 1.18, delay: 0.58, times: [0, 0.18, 0.62, 0.86, 1], ease: "easeInOut" }}
              onAnimationComplete={() => setFlight(null)}
            >
              +{flight.score.toLocaleString()}
            </motion.div>
          </div>
        ) : null}
        {cleared ? (
          <motion.div
            className="level-clear-overlay"
            data-board-overlay="true"
            role="dialog"
            aria-modal="true"
            aria-labelledby="level-clear-title"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <motion.div
              className="level-clear-popup"
              initial={{ y: 18 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.28, ease: "easeOut" }}
            >
              <span className="clear-burst" aria-hidden="true" />
              <p className="eyebrow">Level cleared</p>
              <h3 id="level-clear-title">Level cleared</h3>
              <p>Go to next level and keep the chain alive.</p>
              <button className="button button-primary" type="button" onClick={onNextLevel}>
                Go to next level
              </button>
            </motion.div>
          </motion.div>
        ) : null}
      </div>
    </div>
  );
}
