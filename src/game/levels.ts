import type { LevelDefinition } from "./types";

export const LEVELS: LevelDefinition[] = [
  { id: 1, name: "Ignition Alley", moves: 20, targetScore: 4200, goals: [{ kind: "cyan", count: 14 }] },
  { id: 2, name: "Magenta Drift", moves: 21, targetScore: 5400, goals: [{ kind: "magenta", count: 16 }] },
  { id: 3, name: "Volt Avenue", moves: 22, targetScore: 6800, goals: [{ kind: "lime", count: 18 }] },
  {
    id: 4,
    name: "Flare Terminal",
    moves: 23,
    targetScore: 8200,
    goals: [
      { kind: "amber", count: 16 },
      { kind: "cyan", count: 10 },
    ],
  },
  {
    id: 5,
    name: "Violet Rail",
    moves: 24,
    targetScore: 9800,
    goals: [
      { kind: "violet", count: 20 },
      { kind: "magenta", count: 12 },
    ],
  },
  {
    id: 6,
    name: "Coral Switchyard",
    moves: 24,
    targetScore: 11200,
    goals: [
      { kind: "coral", count: 20 },
      { kind: "lime", count: 12 },
    ],
  },
  {
    id: 7,
    name: "Prism Overpass",
    moves: 25,
    targetScore: 13000,
    goals: [
      { kind: "cyan", count: 18 },
      { kind: "violet", count: 16 },
    ],
  },
  {
    id: 8,
    name: "Chrome Bazaar",
    moves: 26,
    targetScore: 14800,
    goals: [
      { kind: "amber", count: 18 },
      { kind: "coral", count: 18 },
    ],
  },
  {
    id: 9,
    name: "Lime Skyline",
    moves: 26,
    targetScore: 16600,
    goals: [
      { kind: "lime", count: 24 },
      { kind: "magenta", count: 16 },
    ],
  },
  {
    id: 10,
    name: "Rush Circuit",
    moves: 27,
    targetScore: 18800,
    goals: [
      { kind: "coral", count: 24 },
      { kind: "cyan", count: 18 },
    ],
  },
  {
    id: 11,
    name: "Nova Reactor",
    moves: 28,
    targetScore: 21400,
    goals: [
      { kind: "magenta", count: 26 },
      { kind: "amber", count: 20 },
    ],
  },
  {
    id: 12,
    name: "Neon Core",
    moves: 30,
    targetScore: 25000,
    goals: [
      { kind: "cyan", count: 22 },
      { kind: "lime", count: 22 },
      { kind: "violet", count: 18 },
    ],
  },
];

export function getLevel(id: number): LevelDefinition {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}

export function getNextLevelId(id: number): number {
  return Math.min(id + 1, LEVELS[LEVELS.length - 1].id);
}
