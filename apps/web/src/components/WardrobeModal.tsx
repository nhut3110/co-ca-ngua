import { useState } from 'react';
import { t } from '../i18n';
import { Check, Crown, Horse, Palette, Shuffle, Sparkle, Stack } from '@phosphor-icons/react';
import { auras, catalogById, chromas, pedestals, skins } from '@skyhoof/catalog';
import { PLAYER_NAMES, type GameConfig } from '@skyhoof/game-core';
import { colors } from '../scene/layout';
import { Modal } from './Modal';

export function WardrobeModal({
  config,
  playerNames,
  initialSlot = 0,
  onUpdate,
  onClose,
}: {
  config: GameConfig;
  playerNames?: string[];
  initialSlot?: number;
  onUpdate: (cosmetics: Partial<GameConfig['cosmetics']>) => void;
  onClose: () => void;
}) {
  const [slot, setSlot] = useState(initialSlot);
  const [tab, setTab] = useState<'skin' | 'chroma' | 'aura' | 'pedestal'>('skin');

  const skinIds = config.cosmetics.skinIds;
  const chromaIds = config.cosmetics.chromaIds ?? Array(4).fill('default');
  const auraIds = config.cosmetics.auraIds ?? Array(4).fill('none');
  const pedestalIds = config.cosmetics.pedestalIds ?? Array(4).fill('classic');

  const currentSkin = catalogById(skins, skinIds[slot]);
  const currentChroma = catalogById(chromas, chromaIds[slot]);
  const currentAura = catalogById(auras, auraIds[slot]);
  const currentPedestal = catalogById(pedestals, pedestalIds[slot]);

  const setSlotItem = (key: 'skinIds' | 'chromaIds' | 'auraIds' | 'pedestalIds', value: string) => {
    const base =
      key === 'skinIds'
        ? skinIds
        : key === 'chromaIds'
          ? chromaIds
          : key === 'auraIds'
            ? auraIds
            : pedestalIds;
    const next = base.map((v, i) => (i === slot ? value : v));
    onUpdate({ [key]: next });
  };

  const randomizeSlot = () => {
    const pick = <T extends { id: string }>(arr: readonly T[]) =>
      arr[Math.floor(Math.random() * arr.length)].id;
    onUpdate({
      skinIds: skinIds.map((v, i) => (i === slot ? pick(skins) : v)),
      chromaIds: chromaIds.map((v, i) => (i === slot ? pick(chromas) : v)),
      auraIds: auraIds.map((v, i) => (i === slot ? pick(auras) : v)),
      pedestalIds: pedestalIds.map((v, i) => (i === slot ? pick(pedestals) : v)),
    });
  };

  const names = playerNames ?? [
    config.playerName || PLAYER_NAMES[0],
    PLAYER_NAMES[1],
    PLAYER_NAMES[2],
    PLAYER_NAMES[3],
  ];

  return (
    <Modal title={t('Tủ Đồ Huyền Thoại · Skin & Phụ Kiện')} onClose={onClose}>
      <div className="wardrobe-modal">
        <div
          className="corner-tabs wardrobe-slots"
          role="tablist"
          aria-label={t('Chọn phe tùy chỉnh')}
        >
          {[0, 1, 2, 3].map((i) => (
            <button
              key={i}
              role="tab"
              aria-selected={slot === i}
              className={slot === i ? 'selected' : ''}
              onClick={() => setSlot(i)}
            >
              <span style={{ backgroundColor: colors[i] }} />
              {t(names[i] ?? `Góc ${i + 1}`)}
            </button>
          ))}
        </div>

        <div
          className="wardrobe-hero-preview"
          style={
            {
              '--hero-accent': colors[slot],
              '--chroma-primary': currentChroma.primary,
              '--chroma-secondary': currentChroma.secondary,
            } as React.CSSProperties
          }
        >
          <div className="wardrobe-portrait-wrap">
            {currentSkin.portrait ? (
              <img src={currentSkin.portrait} alt={t(currentSkin.name)} />
            ) : (
              <Horse size={48} weight="duotone" />
            )}
            <span className="wardrobe-chroma-badge" style={{ background: currentChroma.primary }} />
          </div>
          <div className="wardrobe-hero-meta">
            <span className="eyebrow">{t(names[slot] ?? 'CHIẾN BINH')}</span>
            <h3>{t(currentSkin.name)}</h3>
            <p>{t(currentSkin.description)}</p>
            <div className="wardrobe-tags">
              <span>
                <Palette size={13} /> {t(currentChroma.name)}
              </span>
              <span>
                <Sparkle size={13} /> {t(currentAura.name)}
              </span>
              <span>
                <Stack size={13} /> {t(currentPedestal.name)}
              </span>
            </div>
          </div>
          <button
            className="button secondary wardrobe-random-btn"
            onClick={randomizeSlot}
            title={t('Phối ngẫu nhiên nhân vật và phụ kiện')}
          >
            <Shuffle size={17} />
            <span>{t('Ngẫu nhiên')}</span>
          </button>
        </div>

        <div className="atelier-tabs wardrobe-category-tabs">
          <button aria-pressed={tab === 'skin'} onClick={() => setTab('skin')}>
            <Horse size={16} /> {t('Nhân vật')} ({skins.length})
          </button>
          <button aria-pressed={tab === 'chroma'} onClick={() => setTab('chroma')}>
            <Palette size={16} /> {t('Sắc giáp')} ({chromas.length})
          </button>
          <button aria-pressed={tab === 'aura'} onClick={() => setTab('aura')}>
            <Crown size={16} /> {t('Hào quang')} ({auras.length})
          </button>
          <button aria-pressed={tab === 'pedestal'} onClick={() => setTab('pedestal')}>
            <Stack size={16} /> {t('Đế cờ')} ({pedestals.length})
          </button>
        </div>

        {tab === 'skin' && (
          <div className="recruit-grid wardrobe-skin-grid">
            {skins.map((s, i) => {
              const active = skinIds[slot] === s.id;
              return (
                <button
                  key={s.id}
                  aria-pressed={active}
                  onClick={() => setSlotItem('skinIds', s.id)}
                  style={{ '--recruit-color': s.accent } as React.CSSProperties}
                >
                  <span className="recruit-index">{String(i + 1).padStart(2, '0')}</span>
                  {s.portrait ? (
                    <img src={s.portrait} alt="" loading="lazy" />
                  ) : (
                    <span className="recruit-silhouette">
                      <Horse size={42} weight="duotone" />
                    </span>
                  )}
                  <strong>{t(s.name)}</strong>
                  <small className="skin-cat-tag">
                    {t(
                      s.category === 'steed'
                        ? 'Chiến mã'
                        : s.category === 'mythic'
                          ? 'Thần thoại'
                          : s.category === 'undead'
                            ? 'Tử linh'
                            : 'Anh hùng',
                    )}
                  </small>
                  {active && <Check size={15} className="recruit-check" />}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'chroma' && (
          <div className="wardrobe-option-list">
            {chromas.map((c) => {
              const active = chromaIds[slot] === c.id;
              return (
                <button
                  key={c.id}
                  className={`wardrobe-option-card ${active ? 'selected' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSlotItem('chromaIds', c.id)}
                >
                  <span
                    className="chroma-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${c.primary} 0%, ${c.secondary} 100%)`,
                    }}
                  />
                  <div>
                    <strong>{t(c.name)}</strong>
                    <small>{t(c.description)}</small>
                  </div>
                  {active && <Check size={18} />}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'aura' && (
          <div className="wardrobe-option-list">
            {auras.map((a) => {
              const active = auraIds[slot] === a.id;
              return (
                <button
                  key={a.id}
                  className={`wardrobe-option-card ${active ? 'selected' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSlotItem('auraIds', a.id)}
                >
                  <span
                    className="chroma-swatch aura-swatch"
                    style={{
                      background: `radial-gradient(circle, ${a.color} 0%, ${a.secondary} 100%)`,
                    }}
                  >
                    <Sparkle size={16} weight="fill" />
                  </span>
                  <div>
                    <strong>{t(a.name)}</strong>
                    <small>{t(a.description)}</small>
                  </div>
                  {active && <Check size={18} />}
                </button>
              );
            })}
          </div>
        )}

        {tab === 'pedestal' && (
          <div className="wardrobe-option-list">
            {pedestals.map((p) => {
              const active = pedestalIds[slot] === p.id;
              return (
                <button
                  key={p.id}
                  className={`wardrobe-option-card ${active ? 'selected' : ''}`}
                  aria-pressed={active}
                  onClick={() => setSlotItem('pedestalIds', p.id)}
                >
                  <span
                    className="chroma-swatch"
                    style={{
                      background: `linear-gradient(135deg, ${p.trim} 0%, ${p.base} 100%)`,
                    }}
                  />
                  <div>
                    <strong>{t(p.name)}</strong>
                    <small>{t(p.description)}</small>
                  </div>
                  {active && <Check size={18} />}
                </button>
              );
            })}
          </div>
        )}

        <div className="modal-actions">
          <button className="button primary full" onClick={onClose}>
            {t('Hoàn tất trang bị')}
          </button>
        </div>
      </div>
    </Modal>
  );
}
