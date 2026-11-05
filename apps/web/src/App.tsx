import { t, LanguageSwitch, useLocale } from './i18n';
import { useCallback, useEffect, useState } from 'react';
import {
  GearSix,
  SpeakerHigh,
  SpeakerSlash,
  ArrowRight,
  Moon,
  Sparkle,
} from '@phosphor-icons/react';
import { DEFAULT_CONFIG, playableMoves, type GameConfig } from '@skyhoof/game-core';
import { Brand } from './components/Brand';
import { Welcome } from './components/Welcome';
import { CreateGame } from './components/CreateGame';
import { GameView } from './components/GameView';
import { Modal } from './components/Modal';
import { MobileGate } from './components/MobileGate';
import { AudioSettings } from './components/AudioSettings';
import { useMobileAccess } from './hooks/useMobileAccess';
import { useGameAudio } from './audio/useGameAudio';
import { readSavedGame, useGame } from './hooks/useGame';
import { OnlineLobby } from './online/OnlineLobby';
import { useOnline } from './online/useOnline';

declare global {
  interface Window {
    render_game_to_text: () => string;
    advanceTime: (ms: number) => Promise<void>;
  }
}
type Screen = 'welcome' | 'create' | 'online' | 'game';
type Dialog = 'rules' | 'settings' | 'leave' | null;
export default function App() {
  useLocale();
  const [screen, setScreen] = useState<Screen>(() =>
    new URLSearchParams(location.search).has('room') ||
    sessionStorage.getItem('skyhoof.online.session.v1')
      ? 'online'
      : 'welcome',
  );
  const [dialog, setDialog] = useState<Dialog>(null);
  const [paused, setPaused] = useState(false);
  const [presenting, setPresenting] = useState(false);
  const [hasSave, setHasSave] = useState(() => Boolean(readSavedGame()));
  const [reducedMotion, setReducedMotion] = useState(
    () => matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const access = useMobileAccess();
  const [hidden, setHidden] = useState(document.hidden);
  const audio = useGameAudio(access.blocked || hidden || paused);
  useEffect(() => {
    const update = () => setHidden(document.hidden);
    document.addEventListener('visibilitychange', update);
    return () => document.removeEventListener('visibilitychange', update);
  }, []);
  useEffect(() => {
    if (access.blocked) setDialog(null);
  }, [access.blocked]);
  const online = useOnline();
  const { game, dispatch, start, storageError, advanceBots, setGame } = useGame(
    screen === 'game',
    paused || dialog !== null || presenting || access.blocked || hidden,
    !!online.session,
  );
  useEffect(() => {
    if (online.room?.game) {
      setGame(online.room.game);
      setScreen('game');
    }
  }, [online.room?.version, online.room?.code, setGame]);
  const startGame = (config: GameConfig) => {
    start(config);
    setPaused(false);
    setHasSave(true);
    setScreen('game');
  };
  const startQuickArcane = () => {
    const arcaneConfig: GameConfig = {
      ...structuredClone(DEFAULT_CONFIG),
      modeId: 'arcane',
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
        chromaIds: ['imperial-gold', 'jade-spirit', 'frost-crystal', 'obsidian-void'],
        auraIds: ['grand-crown', 'aether-wings', 'rune-halo', 'starlight-shards'],
        pedestalIds: ['astral-ring', 'lotus-jade', 'iron-crown', 'classic'],
      },
    };
    startGame(arcaneConfig);
  };
  const exit = () => {
    if (screen === 'game') {
      setDialog('leave');
    } else setScreen('welcome');
  };
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (
        (event.target as HTMLElement).closest('input,button,select,textarea') ||
        dialog ||
        access.blocked ||
        hidden ||
        screen !== 'game'
      )
        return;
      if (event.code === 'KeyF' && !event.repeat) {
        event.preventDefault();
        const toggle = document.fullscreenElement
          ? document.exitFullscreen()
          : document.documentElement.requestFullscreen?.();
        void toggle?.catch(() => {});
      }
      if (event.code === 'Escape') setPaused((p) => !p);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [
    dialog,
    screen,
    game.current,
    game.phase,
    paused,
    presenting,
    dispatch,
    access.blocked,
    hidden,
  ]);
  const snapshot = useCallback(
    () =>
      JSON.stringify({
        screen,
        paused: paused || !!dialog || access.blocked || hidden,
        mobileAccess: {
          mobile: access.mobile,
          installed: access.installed,
          portrait: access.portrait,
          blocked: access.blocked,
        },
        audio: audio.status(),
        presenting,
        coordinates:
          'x right, y up, z toward viewer; progress -1 stable; classic: 52 shared tiles, finish57; grand: 80 shared tiles, finish85',
        ...(screen === 'game'
          ? {
              config: game.config,
              current: game.current,
              phase: game.phase,
              die: game.die,
              rawDie: game.rawDie,
              turn: game.turn,
              event: game.event,
              winner: game.winner,
              players: game.players,
              horses: game.horses,
              legalMoves: playableMoves(game).map((h) => h.id),
              log: game.log,
            }
          : {}),
      }),
    [screen, paused, dialog, presenting, game, access, hidden, audio.status],
  );
  useEffect(() => {
    window.render_game_to_text = snapshot;
    window.advanceTime = async (ms) => {
      if (screen === 'game' && !online.session && !paused && !dialog && !access.blocked && !hidden)
        advanceBots(ms);
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
      );
    };
  }, [snapshot, screen, paused, dialog, advanceBots, access.blocked, hidden, online.session]);
  const rules = screen === 'game' ? game.config : DEFAULT_CONFIG;
  return (
    <>
      <div
        inert={access.blocked}
        aria-hidden={access.blocked || undefined}
        className={`app screen-${screen} ${reducedMotion ? 'reduce-motion' : ''}`}
      >
        <header className="site-header">
          <Brand onClick={exit} />
          <nav aria-label={t('Điều hướng chính')}>
            <LanguageSwitch />
            <button className="nav-link" onClick={() => setDialog('rules')}>
              {t('Cách chơi')}
            </button>
            <span className="header-divider" />
            <button
              className="icon-button"
              aria-label={t(audio.preferences.muted ? 'Bật âm thanh' : 'Tắt âm thanh')}
              aria-pressed={!audio.preferences.muted}
              onClick={() => audio.update({ muted: !audio.preferences.muted })}
            >
              {audio.preferences.muted ? <SpeakerSlash size={20} /> : <SpeakerHigh size={20} />}
            </button>
            <button
              className="icon-button"
              aria-label={t('Cài đặt hiển thị')}
              onClick={() => setDialog('settings')}
            >
              <GearSix size={21} />
            </button>
          </nav>
        </header>
        {screen === 'welcome' && !access.blocked && (
          <Welcome
            onCreate={() => setScreen('create')}
            onOnline={() => setScreen('online')}
            onQuickArcane={startQuickArcane}
            hasSave={hasSave}
            staticPreview={false}
            onContinue={() => setScreen('game')}
            onRules={() => setDialog('rules')}
            reducedMotion={reducedMotion}
          />
        )}
        {screen === 'create' && !access.blocked && (
          <CreateGame
            onBack={() => setScreen('welcome')}
            staticPreview={false}
            onStart={startGame}
            reducedMotion={reducedMotion}
          />
        )}
        {screen === 'online' && !access.blocked && (
          <OnlineLobby
            room={online.room}
            session={online.session}
            error={online.error}
            onSession={online.begin}
            onUpdate={online.accept}
            onBack={() => {
              void online.leave().then((ok) => {
                if (ok) setScreen('welcome');
              });
            }}
          />
        )}
        {screen === 'game' && online.error && (
          <div role="alert" className="online-status-error">
            {online.error}
          </div>
        )}
        {screen === 'game' && (
          <GameView
            game={game}
            dispatch={
              online.session
                ? (action) => {
                    void online.dispatch(action);
                  }
                : dispatch
            }
            playerSeat={online.room?.seat ?? 0}
            online={!!online.session}
            networkBusy={online.sending}
            networkLatency={online.latency}
            onExit={exit}
            onRules={() => setDialog('rules')}
            onReplay={() => startGame(game.config)}
            onBusyChange={setPresenting}
            paused={paused || dialog !== null || access.blocked || hidden}
            onSound={audio.play}
            onSettings={() => setDialog('settings')}
            onPause={() => setPaused((p) => !p)}
            reducedMotion={reducedMotion}
            storageError={storageError}
          />
        )}
        {dialog === 'rules' && (
          <Modal
            title={t(screen === 'game' ? 'Luật ván này' : 'Cách chơi')}
            onClose={() => setDialog(null)}
          >
            <div className="rules-body">
              <p>
                {t('Đưa đủ ')}
                {t(rules.horsesPerPlayer)}
                {t(' ngựa về đích trước các đối thủ.')}
              </p>
              <ol>
                <li>
                  <strong>{t('Tung xúc xắc.')}</strong>
                  {t(' Số ')}
                  {t(rules.launchOnOne ? '1 hoặc 6' : '6')}
                  {t(' cho phép xuất chuồng. Số 6 cho thêm lần tung.')}
                </li>
                <li>
                  <strong>{t('Chọn ngựa.')}</strong>
                  {t(' Đi đúng số bước. Được đi qua quân khác nhưng không dừng trùng quân mình.')}
                </li>
                <li>
                  <strong>{t('Đá quân.')}</strong>
                  {t(' Dừng đúng ô đối thủ để đưa quân đó về chuồng. Đá quân không thêm lượt.')}
                </li>
                <li>
                  <strong>{t('Về đích.')}</strong>
                  {t(
                    ' Chạy một vòng rồi vào đường riêng. Phải đủ số bước, tung thừa không được đi quân đó.',
                  )}
                </li>
              </ol>
              <div className="rules-modules">
                <h3>{t('Luật mở rộng')}</h3>
                {!Object.values(rules.modules).some(Boolean) && (
                  <p>{t('Không có cơ chế mở rộng. Đây là một ván cá ngựa cơ bản.')}</p>
                )}
                {rules.modules.spells && (
                  <>
                    <p>
                      <strong>{t('Tinh thạch:')}</strong>
                      {t(' bắt đầu với 1, giữ tối đa 3. Dừng ở giếng hoặc bị đá được thêm 1.')}
                    </p>
                    <p>
                      <strong>{t('Bẻ vận & Tốc hành:')}</strong>
                      {t(
                        ' tốn 1 viên để tăng/giảm 1 bước, hoặc 2 viên để Tốc hành +2 bước (giới hạn 1–6) trên đường chung.',
                      )}
                    </p>
                    <p>
                      <strong>{t('Đổi vận & Triệu hồi:')}</strong>
                      {t(
                        ' Đổi vận tốn 2 viên để tung lại. Triệu hồi khẩn tốn 3 viên để xuất chuồng với mọi mặt xúc xắc.',
                      )}
                    </p>
                    <p>
                      <strong>{t('Kết giới:')}</strong>
                      {t(
                        ' trước khi tung, tốn 2 viên để bảo vệ một quân đến đầu lượt chính tiếp theo. Đối thủ vẫn đi qua nhưng không được dừng vào đó.',
                      )}
                    </p>
                    <p>{t('Mỗi lượt chính chỉ dùng một phép, kể cả khi có thêm lần tung.')}</p>
                  </>
                )}
                {rules.modules.portals && (
                  <p>
                    <strong>{t('Cổng:')}</strong>
                    {t(
                      ' dừng đúng ô cổng để tự động tiến đến cổng kia khi lối ra trống và chưa vượt cửa về đích. Không nhận quà ở lối ra.',
                    )}
                  </p>
                )}
                {rules.modules.relics && (
                  <p>
                    <strong>{t('Cổ vật bí ẩn:')}</strong>
                    {t(
                      ' dừng trên đài cổ vật để nhận ngẫu nhiên Khiên bảo hộ, +2 Tinh thạch hoặc Tiến thêm 2 bước.',
                    )}
                  </p>
                )}
                {rules.modules.events && (
                  <p>
                    {t(
                      'Biến cố bầu trời: Xoay vòng giữa Gió khai hội (xuất quân bằng mọi số), Màn sương hòa bình (không đá quân), Mưa tinh thạch (mỗi người nhận 1 nếu bật phép) và Mưa sao băng (xuất quân tiến thêm 1 ô nếu trống).',
                    )}
                  </p>
                )}
                {rules.modules.comeback && (
                  <p>
                    <strong>{t('Tái xuất:')}</strong>
                    {t(
                      ' quân bị đá có thể dùng bất kỳ số nào để xuất chuồng lại một lần. Xuất chuồng dùng hết kết quả xúc xắc.',
                    )}
                  </p>
                )}
              </div>
              <button className="button primary full" onClick={() => setDialog(null)}>
                {t('Hiểu rồi, chơi thôi ')}
                <ArrowRight size={17} />
              </button>
            </div>
          </Modal>
        )}
        {dialog === 'settings' && (
          <Modal title={t('Cài đặt')} onClose={() => setDialog(null)}>
            <p className="section-description">
              {t('Áp dụng ngay. Luật và thế giới được chọn lúc tạo ván.')}
            </p>
            <label className="toggle-row">
              <span className="module-icon">
                <Moon size={22} />
              </span>
              <span>
                <strong>{t('Giảm chuyển động')}</strong>
                <small>{t('Tắt nhún nhảy và hạt sáng trang trí.')}</small>
              </span>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(e) => setReducedMotion(e.target.checked)}
              />
              <span className="switch" />
            </label>
            <AudioSettings
              preferences={audio.preferences}
              update={audio.update}
              preview={() => audio.play('spell')}
            />
            <div className="info-note">
              <Sparkle size={18} />
              <span>
                {t('Không có lợi thế từ skin. Mỗi nhân vật đều dùng chung luật di chuyển.')}
              </span>
            </div>
          </Modal>
        )}
        {dialog === 'leave' && (
          <Modal title={t('Rời ván chơi?')} onClose={() => setDialog(null)}>
            <p className="section-description">
              {t(
                online.session
                  ? 'Rời phòng sẽ xóa quyền vào lại trên tab này.'
                  : 'Ván hiện tại được lưu trên trình duyệt này. Bạn có thể tiếp tục từ trang chủ.',
              )}
            </p>
            <div className="modal-actions">
              <button className="button secondary" onClick={() => setDialog(null)}>
                {t('Ở lại chơi')}
              </button>
              <button
                className="button primary"
                onClick={() => {
                  setDialog(null);
                  setPaused(false);
                  void online.leave();
                  setScreen('welcome');
                }}
              >
                {t('Về trang chủ ')}
                <ArrowRight size={17} />
              </button>
            </div>
          </Modal>
        )}
      </div>
      {access.blocked && <MobileGate access={access} />}
    </>
  );
}
