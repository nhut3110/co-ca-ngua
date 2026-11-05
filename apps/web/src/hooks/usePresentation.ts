import { useEffect, useRef, useState } from 'react';
import { boardRules, type GameState } from '@skyhoof/game-core';
import { transitionCue, type BattleCue } from './battle-feedback';
import { horsePosition } from '../scene/layout';
export type VisualEvent = {
  id: number;
  kind: 'roll' | 'move' | 'spell';
  die: number;
  points: [number, number, number][];
  duration: number;
  cue?: BattleCue;
  impact?: [number, number, number];
};
export function usePresentation(game: GameState, paused: boolean, reduced: boolean) {
  const [snapshot, setSnapshot] = useState(game);
  const [event, setEvent] = useState<VisualEvent | null>(null);
  const [busy, setBusy] = useState(false);
  const remaining = useRef(0);
  if (snapshot !== game) {
    setSnapshot(game);
    const changed = game.horses.filter(
      (h, i) =>
        h.progress !== snapshot.horses[i]?.progress || h.shield !== snapshot.horses[i]?.shield,
    );
    const roll =
      game.die !== null &&
      (game.seed !== snapshot.seed ||
        (game.seed === 0 &&
          snapshot.seed === 0 &&
          ((snapshot.phase === 'roll' && game.phase === 'move') ||
            (game.log[0] !== snapshot.log[0] && game.log[0]?.includes('Đổi vận:')))));
    const spell = !snapshot.usedSpell && game.usedSpell;
    if (roll || changed.length || spell) {
      const duration = reduced
        ? 0.05
        : roll
          ? 1.65
          : changed.length > 1
            ? 2.25
            : changed.some((h) => h.progress === boardRules(game.config).finish)
              ? 2.1
              : changed.length
                ? 1.5
                : 0.85;
      remaining.current = duration * 1000;
      setBusy(true);
      setEvent({
        id: (event?.id ?? 0) + 1,
        kind: roll ? 'roll' : changed.length ? 'move' : 'spell',
        die: game.die ?? 1,
        points: changed.flatMap((h) => [
          horsePosition(snapshot.horses.find((old) => old.id === h.id) ?? h, game.config),
          horsePosition(h, game.config),
        ]),
        duration,
        cue: transitionCue(snapshot, game),
        impact: (() => {
          const victim = changed.find(
            (h) =>
              h.owner !== snapshot.current &&
              h.progress < 0 &&
              (snapshot.horses.find((old) => old.id === h.id)?.progress ?? -1) >= 0,
          );
          return victim
            ? horsePosition(
                snapshot.horses.find((old) => old.id === victim.id)!,
                game.config,
              )
            : undefined;
        })(),
      });
    }
  }
  useEffect(() => {
    if (!busy || paused) return;
    const started = performance.now();
    const timer = setTimeout(() => setBusy(false), remaining.current);
    return () => {
      clearTimeout(timer);
      remaining.current = Math.max(0, remaining.current - (performance.now() - started));
    };
  }, [busy, paused, event]);
  return { event, busy };
}
