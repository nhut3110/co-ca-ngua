export type Difficulty = 1 | 2 | 3 | 4 | 5;
export type SkyEventKind = 'tailwind' | 'truce' | 'mana_rain' | 'starfall';
export type SpellKind = 'reroll' | 'plus' | 'minus' | 'boost' | 'summon';

export interface GameConfig {
  version: 1;
  playerName: string;
  playerCount: 2 | 3 | 4;
  horsesPerPlayer: 2 | 4;
  difficulty: Difficulty;
  launchOnOne: boolean;
  board?: 'classic' | 'grand';
  modeId?: 'classic' | 'arcane' | 'relic' | 'grand';
  modules: {
    spells: boolean;
    portals: boolean;
    comeback: boolean;
    events?: boolean;
    relics?: boolean;
  };
  cosmetics: {
    mapId: string;
    skyId?: string;
    diceId?: string;
    skinIds: string[];
    biomeIds: string[];
    chromaIds?: string[];
    auraIds?: string[];
    pedestalIds?: string[];
  };
}

export const DEFAULT_CONFIG: GameConfig = {
  version: 1,
  playerName: 'Bạn',
  playerCount: 4,
  horsesPerPlayer: 4,
  difficulty: 3,
  launchOnOne: true,
  modules: { spells: false, portals: false, comeback: false },
  cosmetics: {
    mapId: 'floating-island',
    skyId: 'daylight',
    diceId: 'astral-brass',
    skinIds: ['royal-steed', 'astral-unicorn', 'ember-drake', 'arcane-archon'],
    biomeIds: ['forest', 'snow', 'volcano', 'celestial'],
  },
};

export interface Horse {
  id: string;
  owner: number;
  index: number;
  progress: number;
  shield: boolean;
  comeback: boolean;
}

export interface Player {
  id: number;
  name: string;
  mana: number;
}

export interface GameState {
  version: 1;
  config: GameConfig;
  players: Player[];
  horses: Horse[];
  current: number;
  phase: 'roll' | 'move' | 'finished';
  die: number | null;
  rawDie: number | null;
  usedSpell: boolean;
  summonAura?: boolean;
  seed: number;
  turn: number;
  winner: number | null;
  log: string[];
  event?: SkyEventKind;
}

export type GameAction =
  | { type: 'roll' }
  | { type: 'move'; horseId: string }
  | { type: 'pass' }
  | { type: 'spell'; spell: SpellKind }
  | { type: 'shield'; horseId: string }
  | { type: 'cosmetics'; cosmetics: Partial<GameConfig['cosmetics']> };

export const FINISH = 57;
export const PLAYER_NAMES = ['Bạn', 'Mây', 'Nắng', 'Đào'];
export const PORTALS = [8, 34] as const;
export const WELL_TILES = [5, 18, 31, 44];
export const RELIC_TILES = [11, 24, 37, 50];

const CLASSIC_BOARD = {
  id: 'classic',
  trackLength: 52,
  quarter: 13,
  finish: 57,
  portals: [8, 34],
  wells: WELL_TILES,
  relics: RELIC_TILES,
} as const;

const GRAND_BOARD = {
  id: 'grand',
  trackLength: 80,
  quarter: 20,
  finish: 85,
  portals: [12, 52],
  wells: [7, 27, 47, 67],
  relics: [15, 35, 55, 75],
} as const;

export function boardRules(config?: Pick<GameConfig, 'board'>) {
  return config?.board === 'grand' ? GRAND_BOARD : CLASSIC_BOARD;
}

export function absoluteTile(horse: Horse, config?: Pick<GameConfig, 'board'>): number | null {
  const board = boardRules(config);
  return horse.progress >= 0 && horse.progress < board.trackLength
    ? (horse.owner * board.quarter + horse.progress) % board.trackLength
    : null;
}

function validOptionalIdArray(arr: unknown): boolean {
  return (
    arr === undefined ||
    (Array.isArray(arr) && arr.length === 4 && arr.every((id) => typeof id === 'string'))
  );
}

export function createGame(config: GameConfig = DEFAULT_CONFIG, seed = Date.now()): GameState {
  const settings = structuredClone(config);
  if (
    settings.version !== 1 ||
    (settings.board !== undefined && !['classic', 'grand'].includes(settings.board)) ||
    (settings.modeId !== undefined &&
      !['classic', 'arcane', 'relic', 'grand'].includes(settings.modeId)) ||
    typeof settings.playerName !== 'string' ||
    typeof settings.launchOnOne !== 'boolean' ||
    !settings.modules ||
    !['spells', 'portals', 'comeback'].every(
      (key) => typeof settings.modules[key as keyof GameConfig['modules']] === 'boolean',
    ) ||
    (settings.modules.events !== undefined && typeof settings.modules.events !== 'boolean') ||
    (settings.modules.relics !== undefined && typeof settings.modules.relics !== 'boolean') ||
    !settings.cosmetics ||
    typeof settings.cosmetics.mapId !== 'string' ||
    (settings.cosmetics.skyId !== undefined && typeof settings.cosmetics.skyId !== 'string') ||
    (settings.cosmetics.diceId !== undefined && typeof settings.cosmetics.diceId !== 'string') ||
    ![settings.cosmetics.skinIds, settings.cosmetics.biomeIds].every(
      (ids) => Array.isArray(ids) && ids.length === 4 && ids.every((id) => typeof id === 'string'),
    ) ||
    !validOptionalIdArray(settings.cosmetics.chromaIds) ||
    !validOptionalIdArray(settings.cosmetics.auraIds) ||
    !validOptionalIdArray(settings.cosmetics.pedestalIds) ||
    ![2, 3, 4].includes(settings.playerCount) ||
    ![2, 4].includes(settings.horsesPerPlayer) ||
    ![1, 2, 3, 4, 5].includes(settings.difficulty)
  )
    throw new Error('Thiết lập ván không hợp lệ.');

  const initialSeed = seed >>> 0 || 1;
  return {
    version: 1,
    config: settings,
    ...(settings.modules.events
      ? { event: (initialSeed & 1 ? 'tailwind' : 'truce') as GameState['event'] }
      : {}),
    players: Array.from({ length: settings.playerCount }, (_, id) => ({
      id,
      name: id === 0 ? settings.playerName.trim().slice(0, 24) || 'Bạn' : PLAYER_NAMES[id],
      mana: settings.modules.spells ? 1 : 0,
    })),
    horses: Array.from({ length: settings.playerCount * settings.horsesPerPlayer }, (_, i) => ({
      id: `p${Math.floor(i / settings.horsesPerPlayer)}-h${i % settings.horsesPerPlayer}`,
      owner: Math.floor(i / settings.horsesPerPlayer),
      index: i % settings.horsesPerPlayer,
      progress: -1,
      shield: false,
      comeback: false,
    })),
    current: 0,
    phase: 'roll',
    die: null,
    rawDie: null,
    usedSpell: false,
    seed: seed >>> 0 || 1,
    turn: 1,
    winner: null,
    log: ['Cuộc đua bắt đầu. Chúc bạn một ván thật vui!'],
  };
}

function nextRandom(state: GameState) {
  let x = state.seed;
  x ^= x << 13;
  x ^= x >>> 17;
  x ^= x << 5;
  state.seed = x >>> 0;
  return state.seed / 4294967296;
}

export function destination(
  horse: Horse,
  die: number,
  config: GameConfig,
  event?: GameState['event'],
  summonAura = false,
): number | null {
  if (horse.progress === boardRules(config).finish) return null;
  if (horse.progress < 0)
    return die === 6 ||
      (config.launchOnOne && die === 1) ||
      (config.modules.comeback && horse.comeback) ||
      (config.modules.events && event === 'tailwind') ||
      summonAura
      ? 0
      : null;
  return horse.progress + die <= boardRules(config).finish ? horse.progress + die : null;
}

export function legalMoves(state: GameState): Horse[] {
  if (state.phase !== 'move' || state.die === null) return [];
  return state.horses.filter((h) => {
    if (h.owner !== state.current) return false;
    if (
      state.die !== state.rawDie &&
      (h.progress < 0 || h.progress + state.die! >= boardRules(state.config).trackLength)
    )
      return false;
    const d = destination(h, state.die!, state.config, state.event, state.summonAura);
    if (d === null) return false;
    if (d === boardRules(state.config).finish) return true;
    const tile = absoluteTile({ ...h, progress: d }, state.config);
    return !state.horses.some(
      (other) =>
        other.id !== h.id &&
        (tile === null
          ? other.owner === h.owner && other.progress === d
          : absoluteTile(other, state.config) === tile &&
            (other.owner === h.owner ||
              other.shield ||
              (state.config.modules.events && state.event === 'truce'))),
    );
  });
}

function note(state: GameState, message: string) {
  state.log = [message, ...state.log].slice(0, 12);
}

const EVENT_CYCLE: SkyEventKind[] = ['tailwind', 'truce', 'mana_rain', 'starfall'];

function endMove(state: GameState) {
  state.die = null;
  state.summonAura = false;
  state.phase = 'roll';
  if (state.rawDie !== 6) {
    state.current = (state.current + 1) % state.players.length;
    state.turn++;
    if (state.config.modules.events && (state.turn - 1) % state.players.length === 0) {
      const idx = state.event ? EVENT_CYCLE.indexOf(state.event) : 0;
      const nextEvent = EVENT_CYCLE[(idx + 1) % EVENT_CYCLE.length];
      state.event = nextEvent;
      if (nextEvent === 'mana_rain' && state.config.modules.spells) {
        state.players.forEach((p) => {
          p.mana = Math.min(3, p.mana + 1);
        });
      }
      const eventLabels: Record<SkyEventKind, string> = {
        tailwind: 'Sự kiện: Gió khai hội.',
        truce: 'Sự kiện: Màn sương hòa bình.',
        mana_rain: 'Sự kiện: Mưa tinh thạch (+1 Mana).',
        starfall: 'Sự kiện: Bão sao băng (Xuất quân +1 ô).',
      };
      note(state, eventLabels[nextEvent]);
    }
    state.usedSpell = false;
    state.horses.forEach((h) => {
      if (h.owner === state.current) h.shield = false;
    });
  }
  state.rawDie = null;
}

/** Immutable authoritative reducer. Invalid actions return the original state. */
export function applyAction(original: GameState, action: GameAction): GameState {
  if (action.type === 'cosmetics') {
    const state = structuredClone(original);
    const nextCosmetics = { ...state.config.cosmetics, ...action.cosmetics };
    if (
      typeof nextCosmetics.mapId !== 'string' ||
      ![nextCosmetics.skinIds, nextCosmetics.biomeIds].every(
        (ids) =>
          Array.isArray(ids) && ids.length === 4 && ids.every((id) => typeof id === 'string'),
      ) ||
      !validOptionalIdArray(nextCosmetics.chromaIds) ||
      !validOptionalIdArray(nextCosmetics.auraIds) ||
      !validOptionalIdArray(nextCosmetics.pedestalIds)
    )
      return original;
    state.config.cosmetics = nextCosmetics;
    return state;
  }

  if (original.phase === 'finished') return original;
  const state = structuredClone(original);
  const player = state.players[state.current];

  if (action.type === 'roll') {
    if (state.phase !== 'roll') return original;
    state.die = state.rawDie = Math.floor(nextRandom(state) * 6) + 1;
    state.phase = 'move';
    note(state, `${player.name} tung được ${state.die}.`);
    return state;
  }

  if (action.type === 'spell') {
    if (
      !state.config.modules.spells ||
      state.usedSpell ||
      state.phase !== 'move' ||
      state.die === null
    )
      return original;

    const cost =
      action.spell === 'summon' ? 3 : action.spell === 'reroll' || action.spell === 'boost' ? 2 : 1;
    if (player.mana < cost) return original;

    if (action.spell === 'summon') {
      const canLaunchAny = state.horses.some((h) => h.owner === state.current && h.progress < 0);
      if (!canLaunchAny || state.summonAura) return original;
      const startTile =
        (state.current * boardRules(state.config).quarter) % boardRules(state.config).trackLength;
      const blockedByOwnOrProtected = state.horses.some(
        (other) =>
          absoluteTile(other, state.config) === startTile &&
          (other.owner === state.current ||
            other.shield ||
            (state.config.modules.events && state.event === 'truce')),
      );
      if (blockedByOwnOrProtected) return original;
      player.mana -= cost;
      state.usedSpell = true;
      state.summonAura = true;
      note(state, `${player.name} dùng Triệu hồi khẩn!`);
      return state;
    }

    if (
      action.spell !== 'reroll' &&
      !state.horses.some(
        (h) =>
          h.owner === state.current &&
          h.progress >= 0 &&
          h.progress < boardRules(state.config).trackLength - 1,
      )
    )
      return original;

    const delta = action.spell === 'boost' ? 2 : action.spell === 'plus' ? 1 : -1;
    const value = state.die + delta;
    if (action.spell !== 'reroll' && (value < 1 || value > 6)) return original;

    player.mana -= cost;
    state.usedSpell = true;
    if (action.spell === 'reroll') {
      state.die = state.rawDie = Math.floor(nextRandom(state) * 6) + 1;
      note(state, `${player.name} dùng Đổi vận: ${state.die}.`);
    } else if (action.spell === 'boost') {
      state.die = value;
      note(state, `${player.name} dùng Tốc hành: ${state.die} bước.`);
    } else {
      state.die = value;
      note(state, `${player.name} dùng Bẻ vận: ${state.die} bước.`);
    }
    return state;
  }

  if (action.type === 'shield') {
    const horse = state.horses.find((h) => h.id === action.horseId);
    if (
      !state.config.modules.spells ||
      state.usedSpell ||
      state.phase !== 'roll' ||
      player.mana < 2 ||
      !horse ||
      horse.owner !== state.current ||
      absoluteTile(horse, state.config) === null ||
      horse.shield
    )
      return original;
    horse.shield = true;
    player.mana -= 2;
    state.usedSpell = true;
    note(state, `${player.name} tạo Kết giới cho quân ${horse.index + 1}.`);
    return state;
  }

  if (action.type === 'pass') {
    if (state.phase !== 'move' || legalMoves(state).length > 0) return original;
    note(state, `${player.name} không có nước đi hợp lệ.`);
    endMove(state);
    return state;
  }

  if (action.type === 'move') {
    if (!legalMoves(state).some((h) => h.id === action.horseId)) return original;
    const horse = state.horses.find((h) => h.id === action.horseId)!;
    const wasInStable = horse.progress < 0;
    // A modified roll cannot launch or enter the private home lane.
    if (
      state.die !== state.rawDie &&
      (horse.progress < 0 || horse.progress + state.die! >= boardRules(state.config).trackLength)
    )
      return original;

    horse.progress = destination(horse, state.die!, state.config, state.event, state.summonAura)!;
    horse.comeback = false;

    if (
      wasInStable &&
      horse.progress === 0 &&
      state.config.modules.events &&
      state.event === 'starfall'
    ) {
      const bonusTile = absoluteTile({ ...horse, progress: 1 }, state.config);
      if (
        bonusTile !== null &&
        !state.horses.some((h) => h.id !== horse.id && absoluteTile(h, state.config) === bonusTile)
      ) {
        horse.progress = 1;
      }
    }

    const tile = absoluteTile(horse, state.config);
    let captured = false;
    let relicNote = '';
    if (tile !== null) {
      state.horses.forEach((other) => {
        if (other.owner !== horse.owner && absoluteTile(other, state.config) === tile) {
          other.progress = -1;
          other.shield = false;
          other.comeback = state.config.modules.comeback;
          if (state.config.modules.spells)
            state.players[other.owner].mana = Math.min(3, state.players[other.owner].mana + 1);
          captured = true;
        }
      });
      if (
        state.config.modules.portals &&
        (boardRules(state.config).portals as readonly number[]).includes(tile)
      ) {
        const target =
          tile === boardRules(state.config).portals[0]
            ? boardRules(state.config).portals[1]
            : boardRules(state.config).portals[0];
        const distance =
          (target - tile + boardRules(state.config).trackLength) %
          boardRules(state.config).trackLength;
        if (
          horse.progress + distance < boardRules(state.config).trackLength &&
          !state.horses.some((h) => h.id !== horse.id && absoluteTile(h, state.config) === target)
        ) {
          horse.progress += distance;
          note(state, `${player.name} đi qua Cổng không gian.`);
        }
      }
      if (
        state.config.modules.spells &&
        (boardRules(state.config).wells as readonly number[]).includes(tile)
      )
        player.mana = Math.min(3, player.mana + 1);

      if (
        state.config.modules.relics &&
        (boardRules(state.config).relics as readonly number[]).includes(tile)
      ) {
        const blessing = (state.turn + horse.owner + tile) % 3;
        if (blessing === 0) {
          horse.shield = true;
          relicNote = `${player.name} thu thập Cổ vật: Nhận Khiên Thánh!`;
        } else if (blessing === 1 && state.config.modules.spells) {
          player.mana = Math.min(3, player.mana + 2);
          relicNote = `${player.name} thu thập Cổ vật: +2 Tinh thạch!`;
        } else {
          const surgeProgress = horse.progress + 2;
          const surgeTile = absoluteTile({ ...horse, progress: surgeProgress }, state.config);
          if (
            surgeProgress < boardRules(state.config).trackLength &&
            surgeTile !== null &&
            !state.horses.some(
              (h) => h.id !== horse.id && absoluteTile(h, state.config) === surgeTile,
            )
          ) {
            horse.progress = surgeProgress;
            relicNote = `${player.name} thu thập Cổ vật: Lướt thêm 2 bước!`;
          } else {
            horse.shield = true;
            if (state.config.modules.spells) player.mana = Math.min(3, player.mana + 1);
            relicNote = `${player.name} thu thập Cổ vật: Nhận Khiên & Tinh thạch!`;
          }
        }
      }
    }
    if (horse.progress >= boardRules(state.config).trackLength) horse.shield = false;
    note(
      state,
      horse.progress === boardRules(state.config).finish
        ? `${player.name} đưa quân ${horse.index + 1} về đích!`
        : captured
          ? `${player.name} đá quân đối thủ về chuồng!`
          : relicNote || `${player.name} di chuyển quân ${horse.index + 1}.`,
    );
    if (
      state.horses
        .filter((h) => h.owner === state.current)
        .every((h) => h.progress === boardRules(state.config).finish)
    ) {
      state.winner = state.current;
      state.phase = 'finished';
      note(state, `${player.name} thắng cuộc đua!`);
    } else endMove(state);
    return state;
  }
  return original;
}

/** Legal actions include the extra restrictions from a modified movement roll. */
export function playableMoves(state: GameState): Horse[] {
  return legalMoves(state).filter(
    (h) =>
      state.die === state.rawDie ||
      (h.progress >= 0 && h.progress + state.die! < boardRules(state.config).trackLength),
  );
}

function threat(state: GameState, horse: Horse): number {
  const tile = absoluteTile(horse, state.config);
  if (tile === null || horse.shield) return 0;
  return state.horses.reduce((sum, h) => {
    const from = absoluteTile(h, state.config);
    if (h.owner === horse.owner || from === null) return sum;
    const distance =
      (tile - from + boardRules(state.config).trackLength) % boardRules(state.config).trackLength;
    return (
      sum +
      (distance >= 1 &&
      distance <= 6 &&
      h.progress + distance < boardRules(state.config).trackLength
        ? 1 / 6
        : 0)
    );
  }, 0);
}

function scoreMove(state: GameState, horse: Horse, level: number): number {
  const next = applyAction(state, { type: 'move', horseId: horse.id });
  if (next === state) return -Infinity;
  const moved = next.horses.find((h) => h.id === horse.id)!;
  const captures = state.horses.filter(
    (h) =>
      h.owner !== horse.owner &&
      h.progress >= 0 &&
      next.horses.find((n) => n.id === h.id)!.progress < 0,
  );
  let score =
    (moved.progress === boardRules(state.config).finish
      ? 120
      : moved.progress >= boardRules(state.config).trackLength
        ? 28
        : 0) + captures.reduce((s, h) => s + 35 + h.progress * 0.5, 0);
  score += horse.progress < 0 ? 10 : (moved.progress - horse.progress) * 0.8;
  if (moved.shield && !horse.shield) score += 14;
  if (level >= 3)
    score +=
      (threat(state, horse) - threat(next, moved)) * (15 + moved.progress * 0.9) +
      moved.progress * 0.12;
  if (next.winner === horse.owner) score += 10000;
  return score;
}

function progressValue(state: GameState, owner: number) {
  return state.horses
    .filter((h) => h.owner === owner)
    .reduce(
      (v, h) =>
        v +
        (h.progress < 0
          ? 0
          : h.progress === boardRules(state.config).finish
            ? 110
            : h.progress + 8),
      0,
    );
}

export function chooseBotMove(state: GameState, random: () => number = Math.random): string | null {
  const moves = playableMoves(state);
  if (!moves.length) return null;
  const level = state.config.difficulty;
  if (level === 1 || (level === 2 && random() < 0.35))
    return moves[Math.floor(random() * moves.length)].id;
  const scored = moves.map((horse) => {
    let score = scoreMove(state, horse, level);
    if (level >= 4) {
      const samples = level === 4 ? 8 : 24;
      let total = 0;
      for (let sample = 0; sample < samples; sample++) {
        let simulation = applyAction(state, { type: 'move', horseId: horse.id });
        // Independent futures: never peek at the actual game's RNG sequence.
        simulation.seed = (Math.floor(random() * 4294967295) || 1) >>> 0;
        for (
          let step = 0;
          step < (level === 4 ? 8 : 16) && simulation.phase !== 'finished';
          step++
        ) {
          if (simulation.phase === 'roll') simulation = applyAction(simulation, { type: 'roll' });
          else {
            const options = playableMoves(simulation).sort(
              (a, b) => scoreMove(simulation, b, 3) - scoreMove(simulation, a, 3),
            );
            simulation = applyAction(
              simulation,
              options.length ? { type: 'move', horseId: options[0].id } : { type: 'pass' },
            );
          }
        }
        total +=
          progressValue(simulation, horse.owner) -
          Math.max(
            ...simulation.players
              .filter((p) => p.id !== horse.owner)
              .map((p) => progressValue(simulation, p.id)),
          ) *
            0.65;
      }
      score += (total / samples) * 0.5;
    }
    return { id: horse.id, score: score + random() * (level === 2 ? 12 : 0.8) };
  });
  return scored.sort((a, b) => b.score - a.score)[0].id;
}

export function chooseBotAction(state: GameState, random: () => number = Math.random): GameAction {
  if (state.config.modules.spells && !state.usedSpell && state.config.difficulty >= 2) {
    if (state.phase === 'roll' && state.players[state.current].mana >= 2) {
      const risky = state.horses
        .filter((h) => h.owner === state.current && threat(state, h) > 0)
        .sort((a, b) => b.progress - a.progress)[0];
      if (risky && risky.progress > 18) return { type: 'shield', horseId: risky.id };
    }
    if (state.phase === 'move') {
      if (!playableMoves(state).length && state.players[state.current].mana >= 3) {
        const summonTry = applyAction(state, { type: 'spell', spell: 'summon' });
        if (summonTry !== state && playableMoves(summonTry).length > 0)
          return { type: 'spell', spell: 'summon' };
      }
      if (!playableMoves(state).length && state.players[state.current].mana >= 2)
        return { type: 'spell', spell: 'reroll' };
      const currentBest = Math.max(
        -100,
        ...playableMoves(state).map((h) => scoreMove(state, h, 3)),
      );
      for (const spell of ['plus', 'minus', 'boost'] as const) {
        const next = applyAction(state, { type: 'spell', spell });
        if (
          next !== state &&
          Math.max(-100, ...playableMoves(next).map((h) => scoreMove(next, h, 3))) >
            currentBest + 22
        )
          return { type: 'spell', spell };
      }
    }
  }
  if (state.phase === 'roll') return { type: 'roll' };
  const horseId = chooseBotMove(state, random);
  return horseId ? { type: 'move', horseId } : { type: 'pass' };
}
