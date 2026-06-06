import type { LevelDefinition } from "./types";

export const LEVELS: LevelDefinition[] = [
  { id: 1, name: "Ignition Alley", moves: 20, targetScore: 3600, goals: [{ kind: "cyan", count: 12 }] },
  { id: 2, name: "Magenta Drift", moves: 21, targetScore: 4600, goals: [{ kind: "magenta", count: 14 }] },
  { id: 3, name: "Volt Avenue", moves: 22, targetScore: 5600, goals: [{ kind: "lime", count: 16 }] },
  { id: 4, name: "Flare Terminal", moves: 23, targetScore: 6800, goals: [{ kind: "amber", count: 18 }] },
  { id: 5, name: "Violet Rail", moves: 24, targetScore: 8200, goals: [{ kind: "violet", count: 20 }] },
  { id: 6, name: "Coral Switchyard", moves: 24, targetScore: 9600, goals: [{ kind: "coral", count: 20 }] },
  { id: 7, name: "Prism Overpass", moves: 25, targetScore: 11200, goals: [{ kind: "cyan", count: 22 }] },
  { id: 8, name: "Chrome Bazaar", moves: 26, targetScore: 12800, goals: [{ kind: "amber", count: 22 }] },
  { id: 9, name: "Lime Skyline", moves: 26, targetScore: 14600, goals: [{ kind: "lime", count: 24 }] },
  { id: 10, name: "Rush Circuit", moves: 27, targetScore: 16600, goals: [{ kind: "coral", count: 24 }] },
  { id: 11, name: "Nova Reactor", moves: 28, targetScore: 18800, goals: [{ kind: "magenta", count: 26 }] },
  { id: 12, name: "Neon Core", moves: 30, targetScore: 21500, goals: [{ kind: "violet", count: 28 }] },
];

export function getLevel(id: number): LevelDefinition {
  return LEVELS.find((level) => level.id === id) || LEVELS[0];
}

export function getNextLevelId(id: number): number {
  return Math.min(id + 1, LEVELS[LEVELS.length - 1].id);
}
