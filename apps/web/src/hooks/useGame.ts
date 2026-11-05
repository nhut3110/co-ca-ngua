import { useCallback, useEffect, useRef, useState } from 'react';
import {
  applyAction,
  boardRules,
  createGame,
  chooseBotAction,
  DEFAULT_CONFIG,
  type GameAction,
  type GameConfig,
  type GameState,
} from '@skyhoof/game-core';

const SAVE_KEY = 'skyhoof.match.v1';
export function readSavedGame(): GameState | null {
  try {
    const raw = JSON.parse(localStorage.getItem(SAVE_KEY) ?? 'null') as GameState | null;
    if (
      !raw ||
      raw.version !== 1 ||
      !raw.config ||
      !Array.isArray(raw.players) ||
      !Array.isArray(raw.horses) ||
      !['roll', 'move', 'finished'].includes(raw.phase)
    )
      return null;
    const expected = createGame(raw.config, raw.seed);
    if (
      (raw.config.modules.events &&
        !['tailwind', 'truce', 'mana_rain', 'starfall'].includes(raw.event ?? '')) ||
      raw.players.length !== expected.players.length ||
      raw.horses.length !== expected.horses.length ||
      !Number.isInteger(raw.current) ||
      raw.current < 0 ||
      raw.current >= raw.players.length
    )
      return null;
    if (
      !Number.isInteger(raw.seed) ||
      !Number.isInteger(raw.turn) ||
      raw.turn < 1 ||
      typeof raw.usedSpell !== 'boolean' ||
      !Array.isArray(raw.log) ||
      !raw.log.every((line) => typeof line === 'string') ||
      raw.players.some(
        (p, i) =>
          p.id !== i ||
          typeof p.name !== 'string' ||
          !Number.isInteger(p.mana) ||
          p.mana < 0 ||
          p.mana > 3,
      )
    )
      return null;
    if (raw.phase === 'finished') {
      if (
        !Number.isInteger(raw.winner) ||
        raw.winner === null ||
        raw.winner < 0 ||
        raw.winner >= raw.players.length ||
        !raw.horses
          .filter((h) => h.owner === raw.winner)
          .every((h) => h.progress === boardRules(raw.config).finish)
      )
        return null;
    } else if (raw.winner !== null) return null;
    if (
      raw.horses.some(
        (h, i) =>
          h.id !== expected.horses[i].id ||
          h.owner !== expected.horses[i].owner ||
          h.index !== expected.horses[i].index ||
          typeof h.shield !== 'boolean' ||
          typeof h.comeback !== 'boolean' ||
          !Number.isInteger(h.progress) ||
          h.progress < -1 ||
          h.progress > boardRules(raw.config).finish,
      )
    )
      return null;
    if (
      raw.phase === 'move' &&
      (!raw.die || raw.die < 1 || raw.die > 6 || !raw.rawDie || raw.rawDie < 1 || raw.rawDie > 6)
    )
      return null;
    return raw;
  } catch {
    return null;
  }
}
export function useGame(active: boolean, paused: boolean, online = false) {
  const [game, setGame] = useState<GameState>(() => readSavedGame() ?? createGame(DEFAULT_CONFIG));
  const gameRef = useRef(game);
  gameRef.current = game;
  const [storageError, setStorageError] = useState(false);
  const dispatch = useCallback((action: GameAction) => setGame((s) => applyAction(s, action)), []);
  const start = useCallback(
    (config: GameConfig) =>
      setGame(createGame(config, crypto.getRandomValues(new Uint32Array(1))[0])),
    [],
  );
  useEffect(() => {
    if (!active || online) return;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(game));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [game, active, online]);
  useEffect(() => {
    if (!active || online || paused || game.current === 0 || game.phase === 'finished') return;
    const worker = new Worker(new URL('./bot.worker.ts', import.meta.url), { type: 'module' });
    let cancelled = false;
    worker.onmessage = (event: MessageEvent<GameAction>) => {
      if (!cancelled) dispatch(event.data);
    };
    worker.onerror = () => {
      if (!cancelled) dispatch(chooseBotAction(game));
    };
    const timeout = setTimeout(() => worker.postMessage(game), game.phase === 'roll' ? 750 : 900);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
      worker.terminate();
    };
  }, [active, paused, game, dispatch, online]);
  const advanceBots = useCallback((ms: number) => {
    setGame((current) => {
      let next = current;
      for (
        let i = 0;
        i < Math.floor(ms / 750) && next.current !== 0 && next.phase !== 'finished';
        i++
      )
        next = applyAction(next, chooseBotAction(next));
      return next;
    });
  }, []);
  return { game, dispatch, start, storageError, advanceBots, gameRef, setGame };
}
