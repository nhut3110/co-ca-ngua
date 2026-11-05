import { useEffect, useRef, useState } from 'react';
import type { GameState } from '@skyhoof/game-core';
import type { VisualEvent } from './usePresentation';
import type { BattleCue } from './battle-feedback';
import { factionForBiome } from '@skyhoof/catalog';
export function useBattleNotice(
  game: GameState,
  event: VisualEvent | null,
  busy: boolean,
  paused: boolean,
  playerSeat = 0,
) {
  const turn = !busy && game.phase === 'roll';
  const cue: BattleCue | null = turn
    ? {
        kind: 'turn',
        actor: game.current,
        title:
          event?.cue?.bonus && event.cue.actor === game.current
            ? 'THÊM LƯỢT'
            : game.current === playerSeat
              ? 'ĐẾN LƯỢT BẠN'
              : 'ĐẾN LƯỢT',
        detail: factionForBiome(game.config.cosmetics.biomeIds[game.current]).name,
      }
    : (event?.cue ?? null);
  const key = turn
    ? `turn-${game.turn}-${game.current}-${event?.id ?? 0}`
    : event
      ? `event-${event.id}`
      : 'none';
  const timeline = useRef({ key: '', elapsed: 0 });
  const [notice, setNotice] = useState<BattleCue | null>(null);
  useEffect(() => {
    if (timeline.current.key !== key) {
      timeline.current = { key, elapsed: 0 };
      setNotice(null);
    }
    if (!cue || paused) return;
    const delay = cue.kind === 'capture' ? 1000 : cue.kind === 'roll' ? 1150 : 0;
    const duration = cue.kind === 'roll' ? 1100 : cue.kind === 'turn' ? 1900 : 1500;
    const end = delay + duration,
      elapsed = timeline.current.elapsed;
    if (elapsed >= end) return;
    const start = performance.now();
    if (elapsed >= delay) setNotice(cue);
    const reveal = elapsed < delay ? setTimeout(() => setNotice(cue), delay - elapsed) : undefined;
    const hide = setTimeout(() => setNotice(null), end - elapsed);
    return () => {
      clearTimeout(reveal);
      clearTimeout(hide);
      timeline.current.elapsed += performance.now() - start;
    };
    // The stable key identifies the cue; pausing resumes the same remaining lifetime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, paused]);
  return notice;
}
