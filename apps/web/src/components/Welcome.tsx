import { t } from '../i18n';
import { ArrowRight, Horse, Play, BookOpen, Sparkle } from '@phosphor-icons/react';
import { BoardScene } from '../scene/BoardScene';
import { DEFAULT_CONFIG, type GameConfig } from '@skyhoof/game-core';

const WELCOME_SHOWCASE_CONFIG: GameConfig = {
  ...structuredClone(DEFAULT_CONFIG),
  modeId: 'relic',
  modules: {
    spells: true,
    portals: true,
    comeback: true,
    events: true,
    relics: true,
  },
  cosmetics: {
    ...structuredClone(DEFAULT_CONFIG.cosmetics),
    skinIds: ['royal-steed', 'astral-unicorn', 'ember-drake', 'arcane-archon'],
    chromaIds: ['default', 'default', 'default', 'default'],
    auraIds: ['grand-crown', 'aether-wings', 'rune-halo', 'starlight-shards'],
    pedestalIds: ['astral-ring', 'lotus-jade', 'iron-crown', 'classic'],
  },
};

export function Welcome({
  onCreate,
  onOnline,
  onQuickArcane,
  onContinue,
  hasSave,
  onRules,
  reducedMotion,
  staticPreview = false,
}: {
  onCreate: () => void;
  onOnline: () => void;
  onQuickArcane?: () => void;
  onContinue: () => void;
  hasSave: boolean;
  onRules: () => void;
  reducedMotion: boolean;
  staticPreview?: boolean;
}) {
  return (
    <main className="welcome">
      <div className="welcome-world">
        {t(
          staticPreview ? (
            <img
              className="welcome-poster"
              src="/assets/previews/welcome-board.webp"
              alt={t('Bàn cờ bốn miền phép thuật')}
              width="1000"
              height="707"
              fetchPriority="high"
            />
          ) : (
            <BoardScene
              composition="welcome"
              config={WELCOME_SHOWCASE_CONFIG}
              reducedMotion={reducedMotion}
            />
          ),
        )}
      </div>
      <section className="main-menu" aria-label={t('Menu trò chơi')}>
        <div className="game-crest">
          <Horse size={54} weight="fill" />
        </div>
        <span className="menu-eyebrow">{t('ĐẠI ĐIỆN THIÊN KHÔNG')}</span>
        <h1>Skyhoof</h1>
        <p className="game-subtitle">{t('CÁ NGỰA · BỐN MIỀN PHÉP THUẬT')}</p>
        <div className="menu-badges" aria-hidden="true">
          <span>{t('15 Linh Thú & Anh Hùng')}</span>
          <span>{t('4 Chế Độ Ma Thuật')}</span>
        </div>
        <div className="menu-actions">
          {hasSave && (
            <button className="menu-continue" onClick={onContinue}>
              <Play size={18} weight="fill" />
              <span>{t('Tiếp tục ván đang chơi')}</span>
              <ArrowRight size={18} />
            </button>
          )}
          <button className="button primary large" id="create-game" onClick={onCreate}>
            {t('Chơi ván mới')}
            <ArrowRight size={20} />
          </button>
          <button className="button secondary" onClick={onOnline}>
            {t('Chơi online cùng bạn bè')}
          </button>
          {onQuickArcane && (
            <button className="button secondary quick-arcane-btn" onClick={onQuickArcane}>
              <Sparkle size={18} weight="fill" />
              <span>{t('Ván Nhanh Pháp Thuật')}</span>
            </button>
          )}
          <button className="menu-rule" onClick={onRules}>
            <BookOpen size={18} />
            {t('Cách chơi')}
          </button>
        </div>
        <p className="mode-note">
          {t('Chơi với máy')}
          <span>{t('2–4 người · 5 mức độ khó')}</span>
        </p>
      </section>
      <div className="welcome-caption">
        <span>{t('ĐẢO TRÊN MÂY')}</span>
        <p>{t(staticPreview ? 'Chọn một ván để bắt đầu' : 'Kéo để xoay bàn cờ')}</p>
      </div>
      <span className="build-label">{t('BẢN KỶ NGUYÊN MA THUẬT 2.0')}</span>
    </main>
  );
}
