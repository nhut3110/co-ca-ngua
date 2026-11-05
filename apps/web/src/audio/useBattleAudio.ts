import { useEffect, useRef } from 'react';
import type { GameState } from '@skyhoof/game-core';
import type { VisualEvent } from '../hooks/usePresentation';
import type { BattleCue } from '../hooks/battle-feedback';
import type { SoundCue } from './GameAudio';
export function useBattleAudio(
  game: GameState,
  event: VisualEvent | null,
  notice: BattleCue | null,
  busy: boolean,
  paused: boolean,
  play: (cue: SoundCue) => void,
) {
  const playedEvent = useRef(0),
    playedNotice = useRef(''),
    victory = useRef(false),
    previous = useRef(game);
  useEffect(() => {
    const before = previous.current;
    previous.current = game;
    if (
      !paused &&
      before !== game &&
      game.log[0] !== before.log[0] &&
      game.log[0]?.includes('không có nước đi')
    )
      play('pass');
  }, [game, paused, play]);
  useEffect(() => {
    if (!event || paused || event.id === playedEvent.current) return;
    playedEvent.current = event.id;
    if (event.kind === 'roll') {
      if (game.usedSpell && game.log[0]?.includes('Đổi vận')) play('spell');
      play('roll');
    } else if (event.cue?.kind === 'spell') play('spell');
    else play('step');
  }, [event, paused, play, game.usedSpell, game.log]);
  useEffect(() => {
    if (!notice || paused) return;
    const key = `${notice.kind}-${game.turn}-${event?.id ?? 0}`;
    if (key === playedNotice.current) return;
    playedNotice.current = key;
    if (notice.kind === 'turn') play(notice.title === 'THÊM LƯỢT' ? 'bonus' : 'turn');
    else if (notice.kind === 'roll') play(event?.die === 6 ? 'six' : 'result');
    else if (notice.kind !== 'advance' && notice.kind !== 'spell') play(notice.kind);
    // The engine puts the portal entry immediately behind the move summary in the log.
    if (
      notice.kind === 'advance' &&
      event &&
      event.points.length >= 2 &&
      game.log[1]?.includes('Cổng không gian')
    )
      play('portal');
  }, [notice, game.turn, game.log, event, paused, play]);
  useEffect(() => {
    if (game.phase !== 'finished') victory.current = false;
    else if (!busy && !paused && !victory.current) {
      victory.current = true;
      play('victory');
    }
  }, [game.phase, busy, paused, play]);
}
