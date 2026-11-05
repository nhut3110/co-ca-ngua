import { absoluteTile, type Horse, type GameConfig, boardRules } from '@skyhoof/game-core';
export const CELL = 0.5;
export const TILE_TOP = 0.24;
export const STABLE_TOP = 0.3;
// One complete quarter, rotated exactly. The four inner diagonal turns are intentional.
const quarter: [number, number][] = [
  [-1, 7],
  [-1, 6],
  [-1, 5],
  [-1, 4],
  [-1, 3],
  [-1, 2],
  [-2, 1],
  [-3, 1],
  [-4, 1],
  [-5, 1],
  [-6, 1],
  [-7, 1],
  [-7, 0],
];
export const track: [number, number][] = Array.from({ length: 4 }, (_, q) =>
  quarter.map(([a, b]) => {
    let x = a,
      z = b;
    for (let i = 0; i < q; i++) [x, z] = [-z, x];
    return [x * CELL, z * CELL] as [number, number];
  }),
).flat();
export const corners: [number, number][] = [
  [-2.35, 2.35],
  [-2.35, -2.35],
  [2.35, -2.35],
  [2.35, 2.35],
];
export const colors = ['#45c88e', '#59bcff', '#f5bd48', '#ec778d'];
export const homeLanes: [number, number][][] = Array.from({ length: 4 }, (_, q) =>
  Array.from({ length: 6 }, (_, i) => {
    let x = 0,
      z = (6 - i) * CELL;
    for (let j = 0; j < q; j++) [x, z] = [-z, x];
    return [x, z] as [number, number];
  }),
);
const rotateQuarter = ([a, b]: [number, number], q: number): [number, number] => {
  let x = a,
    z = b;
  for (let j = 0; j < q; j++) [x, z] = [-z, x];
  return [x, z];
};
const grandQuarter: [number, number][] = [
  ...Array.from({ length: 11 }, (_, i) => [-i * 0.56, 5.6] as [number, number]),
  ...Array.from({ length: 9 }, (_, i) => [-5.6, 5.6 - (i + 1) * 0.56] as [number, number]),
];
export const grandTrack = Array.from({ length: 4 }, (_, q) =>
  grandQuarter.map((p) => rotateQuarter(p, q)),
).flat();
export const grandHomeLanes = Array.from({ length: 4 }, (_, q) =>
  Array.from({ length: 6 }, (_, i) => rotateQuarter([0, 5.04 - i * 0.56], q)),
);
export function boardLayout(config?: Pick<GameConfig, 'board'>) {
  return config?.board === 'grand'
    ? { track: grandTrack, homeLanes: grandHomeLanes, corners, worldScale: 1.35 }
    : { track, homeLanes, corners, worldScale: 1 };
}
export function horsePosition(
  horse: Horse,
  config?: Pick<GameConfig, 'board'>,
): [number, number, number] {
  const { track, homeLanes, corners } = boardLayout(config),
    board = boardRules(config);
  const [cx, cz] = corners[horse.owner];
  if (horse.progress === board.finish)
    return [cx + (horse.index - 1.5) * 0.29, STABLE_TOP, cz - 0.88];
  if (horse.progress < 0)
    return [
      cx + (horse.index % 2 ? 0.37 : -0.37),
      STABLE_TOP,
      cz + (horse.index < 2 ? -0.32 : 0.36),
    ];
  const [x, z] =
    horse.progress < board.trackLength
      ? track[absoluteTile(horse, config)!]
      : homeLanes[horse.owner][horse.progress - board.trackLength];
  return [x, TILE_TOP, z];
}
