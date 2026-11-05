import { t, LanguageSwitch } from '../i18n';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  ArrowCounterClockwise,
  DiceSix,
  Horse as HorseIcon,
  Sparkle,
  Shield,
  Plus,
  Minus,
  Pause,
  Play,
  Trophy,
  BookOpen,
  Crosshair,
  SlidersHorizontal,
  Check,
  Diamond,
  Flag,
  Sword,
  Hand,
  X,
  Lightning,
  Palette,
  Crown,
} from '@phosphor-icons/react';
import { boardRules, playableMoves, type GameAction, type GameState } from '@skyhoof/game-core';
import { catalogById, skins } from '@skyhoof/catalog';
import { BoardScene } from '../scene/BoardScene';
import { moveIntent } from '../hooks/battle-feedback';
import { useBattleNotice } from '../hooks/useBattleNotice';
import { usePresentation } from '../hooks/usePresentation';
import { useBattleAudio } from '../audio/useBattleAudio';
import type { SoundCue } from '../audio/GameAudio';
import { colors } from '../scene/layout';
import { WardrobeModal } from './WardrobeModal';

function Dice({ value }: { value: number | null }) {
  const positions: Record<number, number[]> = {
    1: [4],
    2: [0, 8],
    3: [0, 4, 8],
    4: [0, 2, 6, 8],
    5: [0, 2, 4, 6, 8],
    6: [0, 2, 3, 5, 6, 8],
  };
  return (
    <span
      className={`die ${value ? '' : 'unrolled'}`}
      key={value ?? 0}
      aria-label={t(value ? `Xúc xắc ${value}` : 'Chờ tung xúc xắc')}
    >
      {t(
        Array.from({ length: 9 }, (_, i) => (
          <i key={i} className={positions[value ?? 6].includes(i) ? 'visible' : ''} />
        )),
      )}
    </span>
  );
}

const skyEventMeta: Record<NonNullable<GameState['event']>, { title: string; subtitle: string }> = {
  tailwind: {
    title: 'Gió khai hội',
    subtitle: 'Xuất quân bằng mọi số',
  },
  truce: {
    title: 'Màn sương hòa bình',
    subtitle: 'Không thể đá quân',
  },
  mana_rain: {
    title: 'Mưa tinh thạch',
    subtitle: 'Mỗi người nhận 1 tinh thạch',
  },
  starfall: {
    title: 'Mưa sao băng',
    subtitle: 'Xuất quân tiến thêm 1 ô nếu trống',
  },
};

export function GameView({
  game,
  dispatch,
  onExit,
  onRules,
  onReplay,
  paused,
  onPause,
  reducedMotion,
  storageError,
  onBusyChange,
  onSound,
  onSettings,
  playerSeat = 0,
  online = false,
  networkBusy = false,
}: {
  game: GameState;
  dispatch: (action: GameAction) => void;
  onExit: () => void;
  onRules: () => void;
  onReplay: () => void;
  paused: boolean;
  onPause: () => void;
  reducedMotion: boolean;
  storageError: boolean;
  onBusyChange: (busy: boolean) => void;
  onSound: (cue: SoundCue) => void;
  onSettings: () => void;
  playerSeat?: number;
  online?: boolean;
  networkBusy?: boolean;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [shieldTarget, setShieldTarget] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [compact, setCompact] = useState(
    () => matchMedia('(max-width:760px), (max-height:560px)').matches,
  );
  const [boardReady, setBoardReady] = useState(false);
  const onSceneReady = useCallback(() => setBoardReady(true), []);
  const immersive = true;
  const [toolsOpen, setToolsOpen] = useState(false);
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const toolsRef = useRef<HTMLDivElement>(null);
  const toolsToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!toolsOpen) return;
    const close = (event: PointerEvent) => {
      if (!toolsRef.current?.contains(event.target as Node)) setToolsOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setToolsOpen(false);
        toolsToggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [toolsOpen]);
  const [explore, setExplore] = useState(false),
    [zoom, setZoom] = useState(0),
    [spellsOpen, setSpellsOpen] = useState(false),
    [squadOpen, setSquadOpen] = useState(false);
  const confirmButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    const mq = matchMedia('(max-width:760px), (max-height:560px)');
    const update = () => setCompact(mq.matches);
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  const { event, busy: animating } = usePresentation(game, paused, reducedMotion);
  const busy = animating || !boardReady;
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
  const notice = useBattleNotice(game, event, busy, paused, playerSeat);
  useBattleAudio(game, event, notice, busy, paused, onSound);
  const board = boardRules(game.config);
  const legal = playableMoves(game);
  const intent = moveIntent(game, selected);
  const human =
    game.current === playerSeat && game.phase !== 'finished' && !paused && !busy && !networkBusy;
  const me = game.players[playerSeat];
  const ownHorses = game.horses.filter((h) => h.owner === playerSeat);
  const canCast = human && game.config.modules.spells && !game.usedSpell;
  const canModify =
    canCast &&
    game.phase === 'move' &&
    me.mana >= 1 &&
    ownHorses.some((h) => h.progress >= 0 && h.progress < board.trackLength - 1);
  const canBoost = canModify && me.mana >= 2 && (game.die ?? 6) <= 4;
  const canSummon =
    canCast &&
    game.phase === 'move' &&
    me.mana >= 3 &&
    !game.summonAura &&
    ownHorses.some((h) => h.progress < 0) &&
    ownHorses.every((h) => h.progress !== 0);

  const select = (id: string) => {
    if (!human) return;
    setSquadOpen(false);
    if (shieldTarget) {
      setSelected(null);
      dispatch({ type: 'shield', horseId: id });
      setShieldTarget(false);
    } else if (legal.some((h) => h.id === id)) {
      onSound(selected === id ? 'cancel' : 'select');
      setSelected((current) => (current === id ? null : id));
    }
  };
  const roll = () => {
    if (!human || game.phase !== 'roll' || shieldTarget) return;
    setSelected(null);
    dispatch({ type: 'roll' });
  };
  const confirm = () => {
    if (!human || !intent) return;
    dispatch({ type: 'move', horseId: intent.horse.id });
    setSelected(null);
    setSquadOpen(false);
  };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (
        paused ||
        wardrobeOpen ||
        !human ||
        (e.target as HTMLElement).closest('input,select,textarea,dialog')
      )
        return;
      if (/^[1-4]$/.test(e.key)) {
        const h = ownHorses.find((h) => h.index === Number(e.key) - 1);
        if (h && (shieldTarget || legal.some((m) => m.id === h.id))) {
          e.preventDefault();
          select(h.id);
          requestAnimationFrame(() => confirmButton.current?.focus({ preventScroll: true }));
        }
      }
      if (e.code === 'Escape' && (selected || shieldTarget)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        setSelected(null);
        setShieldTarget(false);
        onSound('cancel');
      }
      if (
        (e.code === 'Enter' || e.code === 'Space') &&
        !(e.target as HTMLElement).closest('button')
      ) {
        e.preventDefault();
        if (game.phase === 'roll') roll();
        else confirm();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  });
  const active = game.players[game.current];
  const squadControls = (
    <div className="squad">
      <div className="subsection-heading">
        <span>{t('QUÂN CỦA BẠN')}</span>
        <span>
          {t(ownHorses.filter((h) => h.progress === board.finish).length)}/
          {t(game.config.horsesPerPlayer)}
          {t('về đích')}
        </span>
      </div>
      <div className="horse-actions">
        {ownHorses.map((h) => (
          <button
            key={h.id}
            className={`${legal.some((m) => m.id === h.id) && human ? 'available' : ''} ${selected === h.id ? 'selected' : ''}`}
            disabled={
              !human ||
              (!shieldTarget && !legal.some((m) => m.id === h.id)) ||
              (shieldTarget && (h.progress < 0 || h.progress >= board.trackLength))
            }
            onClick={() => select(h.id)}
            aria-label={t(`Chọn quân ${h.index + 1}`)}
            aria-pressed={selected === h.id}
            title={t(
              h.progress < 0
                ? `Quân ${h.index + 1} · Xuất quân`
                : `Quân ${h.index + 1} · ${h.progress}/${board.trackLength}`,
            )}
          >
            <HorseIcon size={23} weight="duotone" />
            <strong>{h.index + 1}</strong>
            <small>
              {t(
                h.progress === board.finish ? (
                  <>
                    <Check size={12} />
                    {t('Về đích')}
                  </>
                ) : h.progress < 0 ? (
                  h.comeback ? (
                    'Tái xuất'
                  ) : (
                    'Xuất quân'
                  )
                ) : h.progress >= board.trackLength ? (
                  'Vào đích'
                ) : (
                  `${h.progress}/${board.trackLength}`
                ),
              )}
            </small>
            {h.shield && <Shield className="shield-icon" size={12} />}
          </button>
        ))}
      </div>
    </div>
  );
  const spellControls = game.config.modules.spells && (
    <section className="spell-section">
      <div className="subsection-heading">
        <span>{t('SÁCH PHÉP CỔ NGỮ')}</span>
        <span className="mana">
          <Diamond size={15} weight="fill" /> {t(me.mana)}/3
        </span>
      </div>
      <div className="spell-actions">
        <button
          disabled={!canModify || game.die === 1}
          onClick={() => {
            dispatch({ type: 'spell', spell: 'minus' });
            setSpellsOpen(false);
          }}
          title={t('Bẻ vận: giảm 1 bước, tốn 1 tinh thạch')}
        >
          <Minus size={18} />
          <span>{t('−1 bước')}</span>
          <small>{t('1 ◆')}</small>
        </button>
        <button
          disabled={!canModify || game.die === 6}
          onClick={() => {
            dispatch({ type: 'spell', spell: 'plus' });
            setSpellsOpen(false);
          }}
          title={t('Bẻ vận: tăng 1 bước, tốn 1 tinh thạch')}
        >
          <Plus size={18} />
          <span>{t('+1 bước')}</span>
          <small>{t('1 ◆')}</small>
        </button>
        <button
          disabled={!canBoost}
          onClick={() => {
            dispatch({ type: 'spell', spell: 'boost' });
            setSpellsOpen(false);
          }}
          title={t('Tốc hành: cộng 2 bước trên đường chung, tốn 2 tinh thạch')}
        >
          <Lightning size={18} />
          <span>{t('Tốc hành +2')}</span>
          <small>{t('2 ◆')}</small>
        </button>
        <button
          disabled={!canCast || game.phase !== 'move' || me.mana < 2}
          onClick={() => {
            dispatch({ type: 'spell', spell: 'reroll' });
            setSpellsOpen(false);
          }}
          title={t('Đổi vận: tung lại xúc xắc, tốn 2 tinh thạch')}
        >
          <ArrowCounterClockwise size={18} />
          <span>{t('Đổi vận')}</span>
          <small>{t('2 ◆')}</small>
        </button>
        <button
          className={shieldTarget ? 'targeting' : ''}
          disabled={
            !canCast ||
            game.phase !== 'roll' ||
            me.mana < 2 ||
            !ownHorses.some((h) => h.progress >= 0 && h.progress < board.trackLength)
          }
          onClick={() => {
            setShieldTarget((v) => !v);
            setSpellsOpen(false);
          }}
          title={t('Kết giới: bảo vệ 1 ngựa khỏi bị đá đến lượt sau, tốn 2 tinh thạch')}
        >
          <Shield size={18} />
          <span>{t(shieldTarget ? 'Hủy chọn' : 'Kết giới')}</span>
          <small>{t('2 ◆')}</small>
        </button>
        <button
          disabled={!canSummon}
          onClick={() => {
            dispatch({ type: 'spell', spell: 'summon' });
            setSpellsOpen(false);
          }}
          title={t(
            'Triệu hồi khẩn: cho phép xuất chuồng với bất kỳ mặt xúc xắc nào, tốn 3 tinh thạch',
          )}
        >
          <Crown size={18} />
          <span>{t('Triệu hồi')}</span>
          <small>{t('3 ◆')}</small>
        </button>
      </div>
      <p className="spell-hint">
        <Sparkle size={12} />
        {t(
          game.usedSpell
            ? 'Đã dùng phép trong lượt này.'
            : 'Mỗi lượt dùng một phép. Giếng phép & Cổ vật cho thêm tinh thạch.',
        )}
      </p>
    </section>
  );
  const activeSkyEvent = game.event ? skyEventMeta[game.event] : null;
  return (
    <main
      className={`game-layout ${compact ? 'compact-game' : ''} ${explore ? 'exploring' : ''} ${paused ? 'game-paused' : ''} immersive-game`}
    >
      <section className="game-world">
        <div className="game-toolbar command-dock" ref={toolsRef}>
          <div className="dock-primary" role="toolbar" aria-label={t('Công cụ bàn cờ')}>
            <button
              className="icon-button"
              aria-label={t('Rời bàn')}
              title={t('Rời bàn')}
              onClick={() => {
                setToolsOpen(false);
                onExit();
              }}
            >
              <ArrowLeft size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={t('Công cụ bàn cờ')}
              title={t('Công cụ bàn cờ')}
              aria-expanded={toolsOpen}
              aria-controls="board-tools"
              ref={toolsToggleRef}
              onClick={() => setToolsOpen((v) => !v)}
            >
              <SlidersHorizontal size={17} />
            </button>
            <button
              className="icon-button wardrobe-dock-btn"
              aria-label={t('Tủ đồ skin')}
              disabled={online}
              title={t('Đổi skin & trang phục trực tiếp')}
              onClick={() => {
                setToolsOpen(false);
                setWardrobeOpen(true);
              }}
            >
              <Palette size={17} />
            </button>
          </div>
          {toolsOpen && (
            <div id="board-tools" className="board-tools-popover">
              <div className="tools-heading">
                <span>{t('Góc nhìn')}</span>
                <LanguageSwitch />
              </div>
              <button
                className="camera-mode-button"
                aria-label={t(explore ? 'Khóa camera để chọn quân' : 'Mở xoay bàn cờ')}
                aria-pressed={explore}
                onClick={() => setExplore((v) => !v)}
              >
                <Hand size={19} />
                <span>{t(explore ? 'Khóa camera để chọn quân' : 'Mở xoay bàn cờ')}</span>
              </button>
              <div className="camera-tools" role="group" aria-label={t('Điều khiển camera')}>
                <button
                  className="icon-button"
                  aria-label={t('Thu nhỏ bàn cờ')}
                  title={t('Thu nhỏ bàn cờ')}
                  onClick={() => setZoom((v) => v - 1)}
                >
                  <Minus size={19} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t('Đưa camera về góc ban đầu')}
                  title={t('Đưa camera về góc ban đầu')}
                  onClick={() => setResetKey((k) => k + 1)}
                >
                  <Crosshair size={20} />
                </button>
                <button
                  className="icon-button"
                  aria-label={t('Phóng to bàn cờ')}
                  title={t('Phóng to bàn cờ')}
                  onClick={() => setZoom((v) => v + 1)}
                >
                  <Plus size={19} />
                </button>
              </div>
              <button
                className="tools-pause"
                disabled={online}
                onClick={() => {
                  setToolsOpen(false);
                  setWardrobeOpen(true);
                }}
              >
                <Palette size={16} />
                <span>{t('Tủ đồ Skin & Hào quang')}</span>
              </button>
              <button
                className="tools-pause"
                aria-label={t(paused ? 'Tiếp tục' : 'Tạm dừng')}
                title={t(paused ? 'Tiếp tục' : 'Tạm dừng')}
                onClick={() => {
                  setToolsOpen(false);
                  onPause();
                }}
              >
                {paused ? <Play size={16} /> : <Pause size={16} />}
                <span>{t(paused ? 'Tiếp tục' : 'Tạm dừng')}</span>
              </button>

              <div className="tools-secondary">
                <button
                  onClick={() => {
                    setToolsOpen(false);
                    onSettings();
                  }}
                >
                  <SlidersHorizontal size={16} />
                  {t('Cài đặt')}
                </button>
                <button
                  onClick={() => {
                    setToolsOpen(false);
                    onRules();
                  }}
                >
                  <BookOpen size={16} />
                  {t('Cách chơi')}
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="player-strip player-rails">
          {game.players.map((p) => {
            const finished = game.horses.filter(
              (h) => h.owner === p.id && h.progress === board.finish,
            ).length;
            return (
              <div
                key={p.id}
                className={`player-chip ${game.current === p.id && game.phase !== 'finished' ? 'active' : ''}`}
                data-player={p.id}
                data-side={
                  game.players.length === 2
                    ? p.id === 0
                      ? 'left'
                      : 'right'
                    : p.id < 2
                      ? 'left'
                      : 'right'
                }
                aria-current={
                  game.current === p.id && game.phase !== 'finished' ? 'true' : undefined
                }
                style={{ '--player-color': colors[p.id] } as React.CSSProperties}
              >
                <span className="player-avatar">
                  <span className="portrait-fire" aria-hidden="true">
                    <svg viewBox="0 0 80 100" fill="none">
                      <defs>
                        <linearGradient
                          id={`fire-${p.id}`}
                          x1="40"
                          y1="98"
                          x2="40"
                          y2="12"
                          gradientUnits="userSpaceOnUse"
                        >
                          <stop stopColor="#fff1b5" />
                          <stop offset=".28" stopColor="#ffc56a" stopOpacity=".85" />
                          <stop offset=".65" stopColor="#ec783e" stopOpacity=".45" />
                          <stop offset="1" stopColor="#e06338" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      <path
                        className="flame flame-back"
                        d="M24 96C6 83 21 71 16 58C13 48 18 39 24 32C17 48 29 55 25 67C19 81 20 86 31 96Z"
                        fill={`url(#fire-${p.id})`}
                      />
                      <path
                        className="flame flame-front"
                        d="M52 96C67 84 55 77 61 64C71 45 58 39 64 19C48 36 64 49 54 65C45 79 60 86 46 97Z"
                        fill={`url(#fire-${p.id})`}
                      />
                      <path
                        className="flame flame-thread"
                        d="M20 90C5 77 27 67 19 53M58 91C74 76 51 66 63 47"
                        stroke={`url(#fire-${p.id})`}
                        strokeWidth=".9"
                        strokeLinecap="round"
                      />
                    </svg>
                    {Array.from({ length: 6 }, (_, i) => (
                      <i
                        key={i}
                        className="fire-ember"
                        style={
                          {
                            '--ember-x': `${12 + ((i * 19) % 73)}%`,
                            '--ember-delay': `${-i * 0.47}s`,
                            '--ember-duration': `${1.7 + (i % 3) * 0.3}s`,
                          } as React.CSSProperties
                        }
                      />
                    ))}
                  </span>
                  <img
                    src={catalogById(skins, game.config.cosmetics.skinIds[p.id]).portrait}
                    alt=""
                  />
                </span>
                <div className="player-identity">
                  <strong data-player-name>{p.name}</strong>
                  <div className="player-subrow">
                    <span
                      className="finish-pips"
                      aria-label={t(`${finished}/${game.config.horsesPerPlayer}`)}
                    >
                      {t(
                        Array.from({ length: game.config.horsesPerPlayer }, (_, i) => (
                          <i key={i} className={i < finished ? 'done' : ''} />
                        )),
                      )}
                    </span>
                    {game.config.modules.spells && (
                      <span className="chip-mana" aria-label={t(`${p.mana} tinh thạch`)}>
                        <Diamond size={10} weight="fill" />
                        {t(p.mana)}
                      </span>
                    )}
                  </div>
                </div>
                {game.current === p.id && game.die && (
                  <span className="chip-die">
                    <DiceSix size={15} />
                    {t(game.die)}
                  </span>
                )}
                {game.current === p.id && <span className="turn-dot" />}
              </div>
            );
          })}
        </div>
        {game.config.modules.events && activeSkyEvent && (
          <div
            className={`sky-event event-${game.event} ${game.config.modules.spells ? 'with-spells' : ''}`}
            role="status"
            aria-live="polite"
          >
            <Sparkle size={15} />
            <span>
              <strong>{t(activeSkyEvent.title)}</strong>
              <small>
                {t(
                  game.event === 'mana_rain' && !game.config.modules.spells
                    ? 'Bật phép thuật để nhận tinh thạch'
                    : activeSkyEvent.subtitle,
                )}
              </small>
            </span>
          </div>
        )}
        <BoardScene
          onReady={onSceneReady}
          config={game.config}
          game={game}
          selected={selected}
          legalIds={
            human
              ? shieldTarget
                ? ownHorses
                    .filter((h) => h.progress >= 0 && h.progress < board.trackLength)
                    .map((h) => h.id)
                : legal.map((h) => h.id)
              : []
          }
          onSelect={select}
          reducedMotion={reducedMotion}
          resetKey={resetKey}
          visualEvent={event}
          paused={paused}
          canRoll={human && game.phase === 'roll' && !shieldTarget}
          onRoll={roll}
          cameraEnabled={!paused}
          twoFingerOnly={immersive && !explore}
          zoomRequest={zoom}
        />
        {immersive && human && !explore && (
          <div className="mobile-battle-controls" data-game-action>
            {game.config.modules.spells && !shieldTarget && (
              <button
                className="floating-mana"
                aria-label={t('Phép thuật')}
                aria-expanded={spellsOpen}
                onClick={() => {
                  setSpellsOpen((v) => !v);
                  setSquadOpen(false);
                }}
              >
                <Sparkle size={20} />
                <span>{t(me.mana)}</span>
              </button>
            )}
            {spellsOpen && (
              <div className="floating-spells">
                {t(spellControls)}
                <button className="text-button" onClick={() => setSpellsOpen(false)}>
                  {t('Đóng phép ')}
                  <X size={16} />
                </button>
              </div>
            )}
            {t(
              intent || shieldTarget ? (
                <div className="mobile-confirm">
                  <button
                    className="icon-button"
                    aria-label={t('Hủy chọn quân')}
                    onClick={() => {
                      setSelected(null);
                      setShieldTarget(false);
                      onSound('cancel');
                    }}
                  >
                    <X size={20} />
                  </button>
                  {t(
                    shieldTarget ? (
                      <span>{t('Chạm quân để tạo kết giới')}</span>
                    ) : (
                      <button
                        ref={confirmButton}
                        id="confirm-move"
                        className={`button primary ${intent?.kind === 'capture' ? 'attack-button' : ''}`}
                        onClick={confirm}
                      >
                        {t(
                          intent?.kind === 'capture' ? (
                            <Sword size={20} />
                          ) : (
                            <ArrowRight size={20} />
                          ),
                        )}
                        {t(intent?.label)}
                      </button>
                    ),
                  )}
                </div>
              ) : game.phase === 'roll' ? (
                <button
                  id="roll-dice"
                  className="button primary floating-roll relic-roll-button"
                  aria-label={t('Tung xúc xắc')}
                  title={t('Tung xúc xắc')}
                  onClick={roll}
                >
                  <DiceSix size={32} weight="duotone" />
                  <span>{t('Tung xúc xắc')}</span>
                </button>
              ) : !legal.length ? (
                <button
                  className="button secondary floating-roll"
                  onClick={() => dispatch({ type: 'pass' })}
                >
                  {t('Qua lượt ')}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <span className="pick-hint">
                  {t(game.die)}
                  {t(' bước · Chạm quân đang sáng')}
                </span>
              ),
            )}
            {(game.phase === 'move' || shieldTarget) && (
              <button
                className="floating-squad icon-button"
                aria-label={t('Chọn quân bằng danh sách')}
                aria-expanded={squadOpen}
                onClick={() => {
                  setSquadOpen((v) => !v);
                  setSpellsOpen(false);
                }}
              >
                <HorseIcon size={23} />
              </button>
            )}
            {(squadOpen ||
              (human &&
                !selected &&
                ((game.phase === 'move' && legal.length > 0) || shieldTarget))) && (
              <div className="floating-picker">{t(squadControls)}</div>
            )}
          </div>
        )}
        {notice && (
          <div
            key={`${notice.kind}-${event?.id ?? 0}-${game.turn}`}
            className={`battle-notice notice-${notice.kind}`}
            role="status"
            aria-live="polite"
            aria-atomic="true"
            style={{ '--notice-color': colors[notice.actor] } as React.CSSProperties}
          >
            <span className="notice-emblem">
              {notice.kind === 'turn' ? (
                <img
                  src={catalogById(skins, game.config.cosmetics.skinIds[notice.actor]).portrait}
                  alt=""
                />
              ) : (
                t(
                  notice.kind === 'capture' ? (
                    <Sword size={30} />
                  ) : notice.kind === 'finish' ? (
                    <Trophy size={30} />
                  ) : notice.kind === 'deploy' ? (
                    <Flag size={30} />
                  ) : (
                    <Sparkle size={30} />
                  ),
                )
              )}
            </span>
            <div>
              <strong>{t(notice.title)}</strong>
              <p>
                {notice.kind === 'turn' && (
                  <>
                    <b>{game.players[notice.actor].name}</b>
                    {' · '}
                  </>
                )}
                {t(notice.detail)}
              </p>
            </div>
            <i />
          </div>
        )}
        {immersive && explore && (
          <div className="camera-mode-hint">
            {t('Kéo để xoay · Chụm để zoom ')}
            <button onClick={() => setExplore(false)}>{t('Xong')}</button>
          </div>
        )}
        <div className="board-footnote">
          <span>
            {t(
              game.config.modules.portals
                ? 'Cổng tự mở khi lối ra trống'
                : 'Kéo xoay · Cuộn phóng · Chuột phải dịch bàn',
            )}
          </span>
          <button className="text-button" onClick={onRules}>
            <BookOpen size={16} />
            {t('Luật ván này')}
          </button>
        </div>
        {paused && game.phase !== 'finished' && (
          <div className="pause-overlay">
            <Pause size={35} />
            <h2>{t('Tạm dừng')}</h2>
            {immersive && (
              <div className="pause-tools">
                <button
                  className="text-button"
                  disabled={online}
                  onClick={() => {
                    onPause();
                    setWardrobeOpen(true);
                  }}
                >
                  <Palette size={18} />
                  {t('Tủ đồ Skin & Hào quang')}
                </button>
                <button className="text-button" onClick={onSettings}>
                  {t('Âm thanh & cài đặt')}
                </button>
                <button className="text-button" onClick={onRules}>
                  <BookOpen size={18} />
                  {t('Luật ván này')}
                </button>
                <button className="text-button" onClick={onExit}>
                  <ArrowLeft size={18} />
                  {t('Rời bàn')}
                </button>
                <details>
                  <summary>{t('Nhật ký ván chơi')}</summary>
                  <ol>
                    {game.log.slice(0, 5).map((line, i) => (
                      <li key={i}>{t(line)}</li>
                    ))}
                  </ol>
                </details>
              </div>
            )}
            <p>
              {t(
                online
                  ? 'Ván online vẫn tiếp tục khi bạn tạm dừng giao diện.'
                  : 'Ván chơi đang được lưu trên trình duyệt này.',
              )}
            </p>
            <button className="button primary" onClick={onPause}>
              {t('Tiếp tục ')}
              <Play size={16} />
            </button>
          </div>
        )}
        {game.phase === 'finished' && !busy && (
          <div className="pause-overlay victory">
            <Trophy size={48} weight="duotone" />
            <span className="eyebrow">{t('CUỘC ĐUA ĐÃ CÓ CHỦ NHÂN')}</span>
            <h2>
              {game.players[game.winner!].name}
              {t(' chiến thắng!')}
            </h2>
            <p>{t('Bạn có thể chơi lại với cùng cài đặt.')}</p>
            {!online && (
              <button className="button primary" onClick={onReplay}>
                {t('Chơi lại ')}
                <ArrowCounterClockwise size={17} />
              </button>
            )}
            <button className="text-button" onClick={onExit}>
              {t('Về trang chủ')}
            </button>
          </div>
        )}
      </section>
      {wardrobeOpen && (
        <WardrobeModal
          config={game.config}
          playerNames={game.players.map((p) => p.name)}
          onUpdate={(next) => dispatch({ type: 'cosmetics', cosmetics: next })}
          onClose={() => setWardrobeOpen(false)}
        />
      )}
      {!immersive && (
        <aside className="game-panel" aria-label={t('Điều khiển ván chơi')}>
          <div className="turn-summary">
            <div className="turn-heading">
              <span className="eyebrow">
                {t('LƯỢT ')}
                {t(game.turn.toString().padStart(2, '0'))}
              </span>
              <span className="status-pill">
                <span /> {t(paused ? 'Tạm dừng' : 'Đang chơi')}
              </span>
            </div>
            <h1>
              {t(
                game.phase === 'finished'
                  ? 'Ván chơi kết thúc'
                  : game.current === playerSeat
                    ? 'Đến lượt bạn'
                    : `${active.name} đang chơi`,
              )}
            </h1>
            <p className="turn-description">
              {t(
                busy
                  ? event?.kind === 'roll'
                    ? 'Thánh vật đang định vận…'
                    : 'Đang thực hiện nước đi…'
                  : shieldTarget
                    ? 'Chọn một ngựa trên đường chung để bảo vệ.'
                    : game.phase === 'finished'
                      ? 'Ván chơi đã kết thúc.'
                      : paused
                        ? 'Nhấn tiếp tục khi bạn sẵn sàng.'
                        : game.current !== playerSeat
                          ? 'Đối thủ đang chọn nước đi.'
                          : game.phase === 'roll'
                            ? 'Tung xúc xắc để tiến quân.'
                            : legal.length
                              ? intent
                                ? intent.label
                                : 'Chọn quân, rồi xác nhận nước đi.'
                              : 'Chưa có nước đi. Bạn có thể dùng phép hoặc qua lượt.',
              )}
            </p>
          </div>
          <div className="dice-controls">
            <div className="dice-area">
              <Dice value={busy && event?.kind === 'roll' ? null : game.die} />
              <div>
                <span>
                  {t(
                    busy && event?.kind === 'roll'
                      ? 'Đang đổ xúc xắc…'
                      : game.die
                        ? `${game.die} bước`
                        : 'Chờ xúc xắc',
                  )}
                </span>
                <small>
                  {t(
                    game.rawDie === 6
                      ? 'Số 6! Được tung thêm.'
                      : game.phase === 'move'
                        ? 'Chọn nước đi của bạn'
                        : game.config.launchOnOne
                          ? '1 hoặc 6 để xuất chuồng.'
                          : '6 để xuất chuồng.',
                  )}
                </small>
              </div>
            </div>
            {t(
              game.phase === 'roll' || (busy && event?.kind === 'roll') ? (
                <button
                  id="roll-dice"
                  className="button primary roll-button"
                  disabled={!human || game.phase !== 'roll' || shieldTarget}
                  onClick={roll}
                >
                  <DiceSix size={22} />
                  {t(
                    game.current !== playerSeat
                      ? 'Đối thủ đang chơi…'
                      : busy
                        ? event?.kind === 'roll'
                          ? 'Đang triệu hồi…'
                          : 'Đang hành động…'
                        : 'Tung xúc xắc',
                  )}
                  <span>{t('↵')}</span>
                </button>
              ) : game.phase === 'move' && !legal.length && human ? (
                <button
                  className="button secondary roll-button"
                  onClick={() => dispatch({ type: 'pass' })}
                >
                  {t('Qua lượt ')}
                  <ArrowRight size={18} />
                </button>
              ) : (
                <button
                  ref={confirmButton}
                  id="confirm-move"
                  className={`button primary roll-button ${intent?.kind === 'capture' ? 'attack-button' : ''}`}
                  disabled={!human || !intent || shieldTarget}
                  onClick={confirm}
                >
                  {intent?.kind === 'capture' ? <Sword size={22} /> : <ArrowRight size={22} />}
                  <span className="action-label">
                    {t(
                      busy
                        ? 'Đang hành động…'
                        : game.current !== playerSeat
                          ? 'Đối thủ đang chơi…'
                          : (intent?.label ?? 'Chọn quân để đi'),
                    )}
                  </span>
                </button>
              ),
            )}
          </div>
          {t(squadControls)}
          {game.config.modules.spells && compact && (
            <button
              className="tactics-toggle"
              aria-expanded={spellsOpen}
              onClick={() => setSpellsOpen((v) => !v)}
            >
              <Sparkle size={16} />
              {t('Phép thuật · ')}
              {t(me.mana)}
              {t('◆')}
              {t(' ')}
              {spellsOpen ? <Minus size={15} /> : <Plus size={15} />}
            </button>
          )}
          {t(spellControls)}
          <details className="activity">
            <summary>{t('Nhật ký ván chơi')}</summary>
            <div className="subsection-heading">
              <span>{t('Diễn biến gần đây')}</span>
              <span className="live-dot" />
            </div>
            <ol aria-live="polite">
              {game.log.slice(0, 4).map((line, i) => (
                <li key={`${game.turn}-${i}-${line}`} className={i === 0 ? 'latest' : ''}>
                  <span />
                  {t(line)}
                </li>
              ))}
            </ol>
          </details>
          <div className="autosave">
            <span className="live-dot" />
            {t(
              online
                ? 'Ván online đang đồng bộ'
                : storageError
                  ? 'Trình duyệt không lưu được ván này'
                  : 'Ván được tự lưu trên trình duyệt này',
            )}
          </div>
        </aside>
      )}
    </main>
  );
}
