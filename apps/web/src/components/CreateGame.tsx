import { t } from '../i18n';
import { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Horse,
  PawPrint,
  MagicWand,
  Tree,
  Snowflake,
  Sun,
  Flower,
  Columns,
  Fire,
  Star,
  Sparkle,
  Spiral,
  ArrowCounterClockwise,
  Info,
  Robot,
  Palette,
  Crown,
  TreasureChest,
} from '@phosphor-icons/react';
import { DEFAULT_CONFIG, type Difficulty, type GameConfig } from '@skyhoof/game-core';
import {
  biomes,
  maps,
  skins,
  skies,
  diceStyles,
  chromas,
  auras,
  pedestals,
  gameModes,
  catalogById,
} from '@skyhoof/catalog';
import { BoardScene } from '../scene/BoardScene';
import { colors } from '../scene/layout';
import { RitualArt } from './RitualArt';
import { StepLabel } from './Brand';
import { WardrobeModal } from './WardrobeModal';

export const difficultyLabels = ['Rất dễ', 'Dễ', 'Trung bình', 'Khó', 'Rất khó'];
const difficultyDescriptions = [
  'Chọn nước ngẫu nhiên. Thoải mái làm quen.',
  'Biết chớp cơ hội, đôi khi vẫn bỏ lỡ.',
  'Cân bằng tiến quân, đá quân và tránh rủi ro.',
  'Xét nguy cơ và mô phỏng các lượt tiếp theo.',
  'Mô phỏng nhiều tình huống hơn trước khi quyết định.',
];
const biomeIcons = [Tree, Snowflake, Sun, Flower, Fire, Star, Sparkle, Columns];
const skinIcons = [Horse, PawPrint, MagicWand];
const modules = [
  {
    id: 'spells' as const,
    name: 'Tinh thạch & phép',
    description: 'Bẻ vận, tốc hành, triệu hồi khẩn và tạo kết giới bảo vệ ngựa.',
    icon: Sparkle,
  },
  {
    id: 'portals' as const,
    name: 'Cổng không gian',
    description: 'Dừng đúng cổng để tự động đi tắt khi lối ra trống.',
    icon: Spiral,
  },
  {
    id: 'comeback' as const,
    name: 'Tái xuất',
    description: 'Ngựa bị đá được trở lại bằng bất kỳ mặt xúc xắc nào.',
    icon: ArrowCounterClockwise,
  },
  {
    id: 'events' as const,
    name: 'Biến cố bầu trời',
    description: 'Mỗi vòng xoay chuyển 4 thiên tượng: Gió hội, Hòa bình, Mưa tinh thạch, Sao băng.',
    icon: Star,
  },
  {
    id: 'relics' as const,
    name: 'Cổ vật bí ẩn',
    description: 'Dừng trên đài cổ vật để nhận ngẫu nhiên Khiên, +2 Tinh thạch hoặc Tiến 2 bước.',
    icon: TreasureChest,
  },
];

export function CreateGame({
  onBack,
  onStart,
  reducedMotion,
  staticPreview = false,
}: {
  onBack: () => void;
  onStart: (config: GameConfig) => void;
  reducedMotion: boolean;
  staticPreview?: boolean;
}) {
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<GameConfig>(() => structuredClone(DEFAULT_CONFIG));
  const [corner, setCorner] = useState(0);
  const [atelier, setAtelier] = useState('realm');
  const [wardrobeOpen, setWardrobeOpen] = useState(false);
  const panel = useRef<HTMLElement>(null);
  const previousStep = useRef(step);

  useEffect(() => {
    if (previousStep.current === step) return;
    previousStep.current = step;
    panel.current?.querySelector('h1')?.focus({ preventScroll: true });
    if (matchMedia('(max-width:760px)').matches) panel.current?.scrollIntoView({ block: 'start' });
  }, [step]);

  const enabled = Object.values(config.modules).filter(Boolean).length;

  const cosmetic = (
    key:
      | 'mapId'
      | 'skinIds'
      | 'biomeIds'
      | 'skyId'
      | 'diceId'
      | 'chromaIds'
      | 'auraIds'
      | 'pedestalIds',
    value: string,
    index?: number,
  ) =>
    setConfig((c) => {
      const defaults: Record<string, string[]> = {
        chromaIds: ['gold', 'emerald', 'ruby', 'amethyst'],
        auraIds: ['none', 'none', 'none', 'none'],
        pedestalIds: ['stone', 'stone', 'stone', 'stone'],
      };
      const currentArr =
        index !== undefined
          ? ((c.cosmetics[key] as string[] | undefined) ?? defaults[key] ?? ['', '', '', ''])
          : undefined;
      return {
        ...c,
        cosmetics: {
          ...c.cosmetics,
          [key]: index === undefined ? value : currentArr!.map((v, i) => (i === index ? value : v)),
        },
      };
    });

  const applyPreset = (modeId: (typeof gameModes)[number]['id']) => {
    const preset = gameModes.find((m) => m.id === modeId);
    if (!preset) return;
    setConfig((c) => ({
      ...c,
      modeId: preset.id,
      board: preset.board,
      modules: {
        spells: preset.modules.spells,
        portals: preset.modules.portals,
        comeback: preset.modules.comeback,
        events: preset.modules.events,
        relics: preset.modules.relics,
      },
    }));
  };

  const activeChroma = config.cosmetics.chromaIds?.[corner] ?? 'gold';
  const activeAura = config.cosmetics.auraIds?.[corner] ?? 'none';
  const activePedestal = config.cosmetics.pedestalIds?.[corner] ?? 'stone';

  return (
    <main
      className={`create-layout forge-layout ${reducedMotion ? 'forge-still' : ''}`}
      data-ritual-step={step}
    >
      <section className="create-preview">
        <div className="preview-heading">
          <StepLabel>{t('SKYHOOF / PHÒNG TRIỆU HỒI')}</StepLabel>
          <span>{t(staticPreview && step < 2 ? 'Bản đồ minh họa' : 'Xem trước 3D')}</span>
        </div>
        {t(
          staticPreview && step < 2 ? (
            <img
              className="welcome-poster"
              src="/assets/previews/welcome-board.webp"
              alt={t('Bàn cờ bốn miền phép thuật')}
              width="1000"
              height="707"
            />
          ) : (
            <BoardScene config={config} reducedMotion={reducedMotion} />
          ),
        )}
        <div className="forge-compass">
          <RitualArt active kind={step === 1 ? 'spells' : 'world'} />
        </div>
        <div className="forge-chronicle" key={step}>
          <span>{t(['I · HỘI TỤ', 'II · KHẮC ẤN', 'III · KIẾN TẠO'][step])}</span>
          <h2>
            {t(
              [
                'Một lời mời. Bốn vương quốc.',
                'Mỗi ấn chú, một cuộc đua khác.',
                'Thế giới trong tay bạn.',
              ][step],
            )}
          </h2>
        </div>
        <div className="preview-bottom">
          <span className="map-tag">
            {t(maps.find((m) => m.id === config.cosmetics.mapId)?.name)}
          </span>
          <span>{t('Kéo để xoay · Cuộn để thu phóng')}</span>
        </div>
      </section>
      <section className="create-panel" ref={panel}>
        <button className="text-button back-link" onClick={step ? () => setStep(step - 1) : onBack}>
          <ArrowLeft size={16} /> {t(step ? 'Bước trước' : 'Trang chủ')}
        </button>
        <div className="step-tabs" aria-label={t('Các bước tạo ván')}>
          {['Người chơi', 'Luật chơi', 'Thế giới'].map((name, i) => (
            <button
              key={name}
              className={step === i ? 'active' : step > i ? 'complete' : ''}
              onClick={() => setStep(i)}
              aria-current={step === i ? 'step' : undefined}
            >
              <span>{t(step > i ? <Check size={12} /> : i + 1)}</span>
              {t(name)}
            </button>
          ))}
        </div>
        <div className="step-content" key={step}>
          {step === 0 && (
            <>
              <StepLabel>{t('01 / NGƯỜI CHƠI')}</StepLabel>
              <h1 tabIndex={-1}>{t('Tập hợp đoàn viễn chinh')}</h1>
              <p className="section-description">{t('Đặt tên, chọn số đối thủ và độ khó.')}</p>
              <label className="field-label" htmlFor="player-name">
                {t('Tên của bạn')}
              </label>
              <input
                id="player-name"
                maxLength={24}
                value={config.playerName}
                placeholder={t('Nhập tên của bạn')}
                onChange={(e) => setConfig({ ...config, playerName: e.target.value })}
              />
              <fieldset>
                <legend>
                  {t('Số người chơi ')}
                  <span>{t('Bao gồm bạn và bot')}</span>
                </legend>
                <div className="segmented">
                  {([2, 3, 4] as const).map((n) => (
                    <button
                      key={n}
                      aria-pressed={config.playerCount === n}
                      className={config.playerCount === n ? 'selected' : ''}
                      onClick={() => setConfig({ ...config, playerCount: n })}
                    >
                      {t(n)}
                      {t(' người ')}
                      <small>{n - 1} bot</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <fieldset className="difficulty-field">
                <legend>
                  {t('Độ khó của bot ')}
                  <strong>{t(difficultyLabels[config.difficulty - 1])}</strong>
                </legend>
                <input
                  aria-label={t('Độ khó của bot')}
                  type="range"
                  min="1"
                  max="5"
                  step="1"
                  value={config.difficulty}
                  onChange={(e) =>
                    setConfig({ ...config, difficulty: Number(e.target.value) as Difficulty })
                  }
                />
                <div className="range-labels">
                  {difficultyLabels.map((s, i) => (
                    <span key={s} className={config.difficulty === i + 1 ? 'active' : ''}>
                      {t(s)}
                    </span>
                  ))}
                </div>
                <p className="difficulty-description">
                  <Robot size={17} />
                  {t(difficultyDescriptions[config.difficulty - 1])}
                </p>
              </fieldset>
              <div className="info-note">
                <Info size={18} />
                <span>{t('Chơi offline với máy. Xúc xắc công bằng ở cả 5 mức khó.')}</span>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <StepLabel>{t('02 / LUẬT CHƠI')}</StepLabel>
              <h1 tabIndex={-1}>{t('Khắc ấn định mệnh')}</h1>
              <p className="section-description">
                {t('Chọn nhanh chế độ ma thuật hoặc tự phối hợp từng ấn chú bên dưới.')}
              </p>
              <fieldset>
                <legend>{t('Chế độ chơi nhanh')}</legend>
                <div className="mode-preset-grid">
                  {gameModes.map((gm) => {
                    const isSelected =
                      (config.modeId ??
                        (enabled === 0 && config.board !== 'grand' ? 'classic' : undefined)) ===
                      gm.id;
                    return (
                      <button
                        key={gm.id}
                        type="button"
                        className={`mode-preset-card ${isSelected ? 'selected' : ''}`}
                        aria-pressed={isSelected}
                        onClick={() => applyPreset(gm.id)}
                      >
                        <div className="mode-preset-top">
                          <strong>{t(gm.name)}</strong>
                          <span className="mode-badge">{t(gm.badge)}</span>
                        </div>
                        <small>{t(gm.subtitle)}</small>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <fieldset>
                <legend>{t('Số ngựa mỗi người')}</legend>
                <div className="segmented">
                  {([2, 4] as const).map((n) => (
                    <button
                      key={n}
                      className={config.horsesPerPlayer === n ? 'selected' : ''}
                      aria-pressed={config.horsesPerPlayer === n}
                      onClick={() => setConfig({ ...config, horsesPerPlayer: n })}
                    >
                      {t(n)}
                      {t(' ngựa ')}
                      <small>{t(n === 2 ? 'Ván nhanh' : 'Trọn cuộc đua')}</small>
                    </button>
                  ))}
                </div>
              </fieldset>
              <label className="toggle-row compact">
                <span>
                  <strong>{t('Xuất chuồng bằng 1 hoặc 6')}</strong>
                  <small>{t('Tắt để chỉ xuất chuồng khi tung được 6.')}</small>
                </span>
                <input
                  type="checkbox"
                  checked={config.launchOnOne}
                  onChange={(e) => setConfig({ ...config, launchOnOne: e.target.checked })}
                />
                <span className="switch" />
              </label>
              <div className="subsection-heading">
                <span>{t('CƠ CHẾ MỞ RỘNG')}</span>
                <button
                  className="text-button"
                  onClick={() =>
                    setConfig({
                      ...config,
                      modeId: 'classic',
                      modules: {
                        spells: false,
                        portals: false,
                        comeback: false,
                        events: false,
                        relics: false,
                      },
                    })
                  }
                >
                  {t('Đặt lại')}
                </button>
              </div>
              {modules.map((m) => (
                <label
                  key={m.id}
                  className={`toggle-row rune-card ${config.modules[m.id] ? 'enabled' : ''}`}
                >
                  <span className="module-icon">
                    <RitualArt kind={m.id} active={!!config.modules[m.id]} />
                  </span>
                  <span>
                    <strong>{t(m.name)}</strong>
                    <small>{t(m.description)}</small>
                  </span>
                  <input
                    type="checkbox"
                    checked={!!config.modules[m.id]}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        modeId: undefined,
                        modules: { ...config.modules, [m.id]: e.target.checked },
                      })
                    }
                  />
                  <span className="switch" />
                </label>
              ))}
              <div className="info-note">
                <Info size={18} />
                <span>
                  {t(
                    enabled
                      ? `${enabled} cơ chế mở rộng được bật. Luật sẽ khóa khi bắt đầu.`
                      : 'Cổ điển nguyên bản: không tinh thạch, không phép, không cổng.',
                  )}
                </span>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <StepLabel>{t('03 / XƯỞNG THẾ GIỚI')}</StepLabel>
              <h1 tabIndex={-1}>{t('Triệu hồi thế giới')}</h1>
              <p className="section-description">
                {t('Bầu trời, đất đai và những người sẽ bước lên bàn cờ.')}
              </p>
              <div className="atelier-tabs" aria-label={t('Tùy chỉnh thế giới')}>
                {[
                  ['realm', 'Địa hình'],
                  ['biomes', 'Bốn miền'],
                  ['roster', 'Đội hình'],
                  ['dice', 'Xúc xắc'],
                ].map(([id, name]) => (
                  <button key={id} aria-pressed={atelier === id} onClick={() => setAtelier(id)}>
                    {t(name)}
                  </button>
                ))}
              </div>
              <div className="atelier-content" key={atelier}>
                {atelier === 'realm' && (
                  <>
                    <fieldset>
                      <legend>{t('Hành trình')}</legend>
                      <div className="journey-options">
                        {(['classic', 'grand'] as const).map((id) => (
                          <button
                            key={id}
                            aria-pressed={(config.board ?? 'classic') === id}
                            onClick={() => setConfig((c) => ({ ...c, board: id }))}
                          >
                            <svg viewBox="0 0 140 82" aria-hidden="true">
                              <path
                                className="journey-route"
                                d={
                                  id === 'classic'
                                    ? 'M62 8h16v25h25v16H78v25H62V49H37V33h25Z'
                                    : 'M24 12h92v58H24ZM70 12v16m46 13H99M70 70V54M24 41h17'
                                }
                              />
                              <path
                                className="journey-tower"
                                d="m64 50 3-17 3-5 3 5 3 17m-9-17-4-10 6 4m4 6 4-10-6 4"
                              />
                            </svg>
                            <strong>{t(id === 'classic' ? 'Cổ điển' : 'Đại viễn chinh')}</strong>
                            <small>
                              {t(
                                id === 'classic' ? '52 ô · đường chữ thập' : '80 ô · đảo siêu rộng',
                              )}
                            </small>
                          </button>
                        ))}
                      </div>
                      <p className="journey-description">
                        {t(
                          config.board === 'grand'
                            ? 'Vành đai quanh bốn vương quốc, 6 ô về nhà mỗi phe. Hành trình dài hơn, đảo rộng hơn 35%.'
                            : 'Đường đua quen thuộc. Tế đàn vận mệnh ngự giữa bốn vương quốc.',
                        )}
                      </p>
                    </fieldset>
                    <fieldset>
                      <legend>{t('Chọn hình thái đảo')}</legend>
                      <div className="island-options">
                        {maps.map((m, i) => (
                          <button
                            key={m.id}
                            className={`island-choice island-${m.base}`}
                            aria-pressed={config.cosmetics.mapId === m.id}
                            onClick={() => cosmetic('mapId', m.id)}
                          >
                            <svg viewBox="0 0 180 95" aria-hidden="true">
                              <path
                                className="island-shadow"
                                d={
                                  m.base === 'citadel'
                                    ? 'M25 38h130v22l-18 8H43L25 60Z'
                                    : m.base === 'crystal'
                                      ? 'm25 38 65-22 65 22-18 20-47 33-47-33Z'
                                      : 'm25 38 65-22 65 22-15 30-50 16-52-21Z'
                                }
                              />
                              <path d="m25 38 65-22 65 22-65 24Z" />
                              {t(
                                m.base === 'crystal' ? (
                                  <path d="m65 61 8 23 6-16m18-4 7 27 8-27" />
                                ) : m.base === 'citadel' ? (
                                  <path d="M45 52v14m15-10v15m15-11v14m15-11v14m15-17v14m15-18v15m15-19v14" />
                                ) : m.base === 'archipelago' ? (
                                  <path d="m3 48 12-4 14 5-13 7Zm147 22 12-4 14 5-13 7Z" />
                                ) : null,
                              )}
                              <path d="M72 30v-9h9v9m12 1V17h9v14m8 5v-9h9v9" />
                            </svg>
                            <span className="choice-number">0{t(i + 1)}</span>
                            <strong>{t(m.name)}</strong>
                            <small>{t(m.subtitle)}</small>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend>{t('Bầu trời')}</legend>
                      <div className="sky-options">
                        {skies.map((s) => (
                          <button
                            key={s.id}
                            aria-pressed={config.cosmetics.skyId === s.id}
                            onClick={() => cosmetic('skyId', s.id)}
                          >
                            <img
                              src={s.image}
                              alt=""
                              className={s.id === 'astral' ? 'night-sky' : ''}
                            />
                            <span>{t(s.name)}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}
                {(atelier === 'biomes' || atelier === 'roster') && (
                  <fieldset>
                    <legend>{t('Chọn vương quốc')}</legend>
                    <div className="corner-tabs">
                      {colors.map((color, i) => (
                        <button
                          key={color}
                          aria-pressed={corner === i}
                          className={corner === i ? 'selected' : ''}
                          onClick={() => setCorner(i)}
                        >
                          <span style={{ backgroundColor: color }} />
                          {t(i === 0 ? 'Bạn' : `Góc ${i + 1}`)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
                {atelier === 'biomes' && (
                  <fieldset>
                    <legend>
                      {t('Cảnh quan của ')}
                      {t(corner === 0 ? 'bạn' : `góc ${corner + 1}`)}
                    </legend>
                    <div className="biome-atlas">
                      {biomes.map((b, i) => {
                        const Icon = biomeIcons[i] ?? Sun;
                        return (
                          <button
                            key={b.id}
                            aria-label={t(b.name)}
                            aria-pressed={config.cosmetics.biomeIds[corner] === b.id}
                            onClick={() => cosmetic('biomeIds', b.id, corner)}
                            style={
                              {
                                '--biome-ground': b.ground,
                                '--biome-foliage': b.foliage,
                              } as React.CSSProperties
                            }
                          >
                            <span className="biome-emblem">
                              <Icon size={33} weight="duotone" />
                            </span>
                            <strong>{t(b.name)}</strong>
                            <small>0{t(i + 1)}</small>
                          </button>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                {atelier === 'roster' && (
                  <>
                    <div className="wardrobe-banner">
                      <div>
                        <strong>{t('Tủ Đồ Mô-đun 4 Lớp')}</strong>
                        <small>
                          {t('Phối linh thú, sắc giáp, hào quang và đế cờ riêng cho từng góc.')}
                        </small>
                      </div>
                      <button
                        type="button"
                        className="button secondary compact-btn"
                        onClick={() => setWardrobeOpen(true)}
                      >
                        <Palette size={16} />
                        <span>{t('Mở Tủ Đồ')}</span>
                      </button>
                    </div>
                    <fieldset>
                      <legend>{t('Triệu hồi một nhân vật')}</legend>
                      <div className="recruit-grid">
                        {skins.map((s, i) => {
                          const Icon = skinIcons[i % skinIcons.length] ?? Horse;
                          return (
                            <button
                              key={s.id}
                              aria-pressed={config.cosmetics.skinIds[corner] === s.id}
                              onClick={() => cosmetic('skinIds', s.id, corner)}
                              title={t(s.description)}
                              style={{ '--recruit-color': s.accent } as React.CSSProperties}
                            >
                              <span className="recruit-index">
                                {t(String(i + 1).padStart(2, '0'))}
                              </span>
                              {t(
                                s.portrait ? (
                                  <img src={s.portrait} alt="" loading="lazy" />
                                ) : (
                                  <span className="recruit-silhouette">
                                    <Icon size={48} weight="duotone" />
                                  </span>
                                ),
                              )}
                              <strong>{t(s.name)}</strong>
                              {t(
                                config.cosmetics.skinIds[corner] === s.id && (
                                  <Check size={15} className="recruit-check" />
                                ),
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <p className="recruit-lore">
                        {t(catalogById(skins, config.cosmetics.skinIds[corner]).description)}
                      </p>
                    </fieldset>
                    <fieldset>
                      <legend>
                        <Palette size={14} /> {t('Sắc Giáp (Chroma)')}
                      </legend>
                      <div className="mini-chip-row">
                        {chromas.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            className={`mini-swatch-chip ${activeChroma === c.id ? 'selected' : ''}`}
                            aria-pressed={activeChroma === c.id}
                            onClick={() => cosmetic('chromaIds', c.id, corner)}
                          >
                            <i
                              style={{
                                background: `linear-gradient(135deg, ${c.primary}, ${c.secondary})`,
                              }}
                            />
                            <span>{t(c.name)}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                    <fieldset>
                      <legend>
                        <Sparkle size={14} /> {t('Hào Quang & Đế Cờ')}
                      </legend>
                      <div className="mini-chip-row">
                        {auras.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className={`mini-swatch-chip ${activeAura === a.id ? 'selected' : ''}`}
                            aria-pressed={activeAura === a.id}
                            onClick={() => cosmetic('auraIds', a.id, corner)}
                          >
                            <i style={{ background: a.color }} />
                            <span>{t(a.name)}</span>
                          </button>
                        ))}
                      </div>
                      <div className="mini-chip-row" style={{ marginTop: 8 }}>
                        {pedestals.map((p) => (
                          <button
                            key={p.id}
                            type="button"
                            className={`mini-swatch-chip ${activePedestal === p.id ? 'selected' : ''}`}
                            aria-pressed={activePedestal === p.id}
                            onClick={() => cosmetic('pedestalIds', p.id, corner)}
                          >
                            <Crown size={13} />
                            <span>{t(p.name)}</span>
                          </button>
                        ))}
                      </div>
                    </fieldset>
                  </>
                )}
                {atelier === 'dice' && (
                  <fieldset>
                    <legend>{t('Thánh vật định mệnh · I—VI')}</legend>
                    <div className="dice-collection">
                      {diceStyles.map((d) => (
                        <button
                          key={d.id}
                          aria-pressed={config.cosmetics.diceId === d.id}
                          onClick={() => cosmetic('diceId', d.id)}
                          style={
                            {
                              '--dice-body': d.body,
                              '--dice-ink': d.metal,
                            } as React.CSSProperties
                          }
                        >
                          <span className={`die-relic relic-${d.shape}`}>
                            <i>IV</i>
                            <b>II</b>
                            <em>VI</em>
                          </span>
                          <span>
                            <strong>{t(d.name)}</strong>
                            <small>
                              {t(
                                d.shape === 'rounded'
                                  ? 'Khối bo tròn'
                                  : d.shape === 'faceted'
                                    ? 'Cắt giác khoáng thạch'
                                    : 'Vát cạnh cổ vật',
                              )}
                            </small>
                          </span>
                          {t(config.cosmetics.diceId === d.id && <Check size={17} />)}
                        </button>
                      ))}
                    </div>
                  </fieldset>
                )}
              </div>
            </>
          )}
        </div>
        <div className="create-panel-footer">
          <span>
            {t(config.playerCount)}
            {t(' người ')}
            <span>{t('·')}</span> {t(config.horsesPerPlayer)}
            {t(' ngựa ')}
            <span>{t('·')}</span>
            {t(' ')}
            {t(config.board === 'grand' ? 'Viễn chinh' : 'Cổ điển')}
            {t(enabled ? ' · Phù phép' : '')}
          </span>
          <button
            className="button primary"
            id={step === 2 ? 'start-game' : 'next-step'}
            onClick={step === 2 ? () => onStart(config) : () => setStep(step + 1)}
          >
            {t(step === 2 ? 'Bắt đầu ván' : 'Tiếp tục')}
            <ArrowRight size={18} />
          </button>
        </div>
      </section>
      {wardrobeOpen && (
        <WardrobeModal
          config={config}
          initialSlot={corner}
          onUpdate={(next) =>
            setConfig((c) => ({
              ...c,
              cosmetics: { ...c.cosmetics, ...next },
            }))
          }
          onClose={() => setWardrobeOpen(false)}
        />
      )}
    </main>
  );
}
