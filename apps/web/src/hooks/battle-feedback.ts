import { applyAction, boardRules, playableMoves, type GameState } from '@skyhoof/game-core';
export type BattleCue = {
  kind: 'roll' | 'deploy' | 'advance' | 'capture' | 'finish' | 'spell' | 'turn';
  title: string;
  detail: string;
  actor: number;
  bonus?: boolean;
};
export function transitionCue(before: GameState, after: GameState): BattleCue {
  const actor = before.current,
    who = before.players[actor].name;
  if (
    after.die !== null &&
    (before.seed !== after.seed ||
      (before.seed === 0 &&
        after.seed === 0 &&
        ((before.phase === 'roll' && after.phase === 'move') ||
          (after.log[0] !== before.log[0] && after.log[0]?.includes('Đổi vận:')))))
  )
    return {
      kind: 'roll',
      title: after.die === 6 ? 'VẬN MAY · 6' : `VẬN MỆNH · ${after.die}`,
      detail: after.die === 6 ? `${who} được tung thêm sau nước đi` : `${who} · ${after.die} bước`,
      actor,
    };
  const moved = after.horses.find(
    (h) =>
      h.owner === actor &&
      h.progress > (before.horses.find((p) => p.id === h.id)?.progress ?? h.progress),
  );
  if (!moved) return { kind: 'spell', title: 'PHÉP ĐÃ NIỆM', detail: after.log[0], actor };
  const old = before.horses.find((h) => h.id === moved.id)!;
  const victim = before.horses.find(
    (h) =>
      h.owner !== actor &&
      h.progress >= 0 &&
      after.horses.find((n) => n.id === h.id)?.progress === -1,
  );
  const kind =
    moved.progress === boardRules(after.config).finish
      ? 'finish'
      : victim
        ? 'capture'
        : old.progress < 0
          ? 'deploy'
          : 'advance';
  return {
    kind,
    actor,
    bonus: after.current === actor && after.phase === 'roll',
    title:
      kind === 'capture'
        ? 'ĐÁ QUÂN!'
        : kind === 'deploy'
          ? 'XUẤT QUÂN'
          : kind === 'finish'
            ? 'VINH QUANG!'
            : 'TIẾN LÊN',
    detail: victim
      ? `${who} đẩy lùi ${before.players[victim.owner].name}`
      : `${who} · Quân ${moved.index + 1}${kind === 'advance' ? ` · ${before.die} bước` : kind === 'finish' ? ' đã về đích' : ''}`,
  };
}
export function moveIntent(game: GameState, id: string | null) {
  const horse = playableMoves(game).find((h) => h.id === id);
  if (!horse) return null;
  // Use the authoritative reducer so portal travel, capture and exact finish all agree with the preview.
  const next = applyAction(game, { type: 'move', horseId: horse.id });
  const cue = transitionCue(game, next),
    target = next.horses.find((h) => h.id === horse.id)!;
  return {
    horse,
    target,
    kind: cue.kind,
    label:
      cue.kind === 'capture'
        ? `Đá quân · Quân ${horse.index + 1}`
        : cue.kind === 'finish'
          ? `Về đích · Quân ${horse.index + 1}`
          : horse.progress < 0
            ? `Xuất quân ${horse.index + 1}`
            : `Đi quân ${horse.index + 1} · ${game.die} bước`,
  };
}
