import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { DEFAULT_CONFIG, type GameConfig } from '@skyhoof/game-core';
import { t } from '../i18n';
import { createRoom, joinRoom, startRoom, type Room, type Session } from './api';
export function OnlineLobby({
  room,
  session,
  onSession,
  onUpdate,
  onBack,
  error,
}: {
  room: Room | null;
  session: Session | null;
  onSession: (s: Session, r: Room) => void;
  onUpdate: (r: Room) => void;
  onBack: () => void;
  error: string;
}) {
  const [name, setName] = useState('');
  const [code, setCode] = useState(
    () => new URLSearchParams(location.search).get('room')?.toUpperCase() ?? '',
  );
  const [config, setConfig] = useState<GameConfig>(() => ({
    ...structuredClone(DEFAULT_CONFIG),
    playerCount: 2,
    horsesPerPlayer: 2,
  }));
  const [busy, setBusy] = useState(false);
  const [botCount, setBotCount] = useState(0);
  const [localError, setLocalError] = useState('');
  const [qr, setQr] = useState('');
  const link = room ? `${location.origin}${location.pathname}?room=${room.code}` : '';
  useEffect(() => {
    let cancelled = false;
    if (link)
      QRCode.toDataURL(link, { width: 220, margin: 1, errorCorrectionLevel: 'M' })
        .then((x) => {
          if (!cancelled) setQr(x);
        })
        .catch(() => setQr(''));
    return () => {
      cancelled = true;
    };
  }, [link]);
  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setLocalError('');
    try {
      await fn();
    } catch (e) {
      setLocalError(e instanceof Error ? e.message : 'Không thể kết nối');
    } finally {
      setBusy(false);
    }
  };
  const remember = (r: Room & { token: string }) => onSession({ code: r.code, token: r.token }, r);
  return (
    <main className="online-screen">
      <section className="online-panel">
        <button className="text-button" onClick={onBack}>
          {t('← Trang chủ')}
        </button>
        <span className="eyebrow online-eyebrow">SKYHOOF ONLINE</span>
        <h1>{t(room ? 'Phòng chờ' : 'Chơi cùng bạn bè')}</h1>
        {(error || localError) && (
          <p role="alert" className="online-error">
            {error || localError}
          </p>
        )}
        {!room ? (
          <>
            <label>
              {t('Tên của bạn')}
              <input value={name} maxLength={24} onChange={(e) => setName(e.target.value)} />
            </label>
            <div className={`online-columns ${code ? 'has-invite' : ''}`}>
              <section>
                <h2>{t('Tạo phòng')}</h2>
                <label>
                  {t('Số người chơi')}
                  <select
                    value={config.playerCount}
                    onChange={(e) => {
                      const playerCount = Number(e.target.value) as 2 | 3 | 4;
                      setConfig({ ...config, playerCount });
                      setBotCount((count) => Math.min(count, playerCount - 1));
                    }}
                  >
                    <option value={2}>2</option>
                    <option value={3}>3</option>
                    <option value={4}>4</option>
                  </select>
                </label>
                <label>
                  {t('Số bot')}
                  <select value={botCount} onChange={(e) => setBotCount(Number(e.target.value))}>
                    {Array.from({ length: config.playerCount }, (_, count) => (
                      <option key={count} value={count}>
                        {count}
                      </option>
                    ))}
                  </select>
                </label>
                {botCount > 0 && (
                  <label>
                    {t('Độ khó bot')}: {config.difficulty}/5
                    <input
                      type="range"
                      min="1"
                      max="5"
                      step="1"
                      value={config.difficulty}
                      onChange={(e) =>
                        setConfig({
                          ...config,
                          difficulty: Number(e.target.value) as GameConfig['difficulty'],
                        })
                      }
                    />
                  </label>
                )}
                <label>
                  {t('Số quân mỗi người')}
                  <select
                    value={config.horsesPerPlayer}
                    onChange={(e) =>
                      setConfig({ ...config, horsesPerPlayer: Number(e.target.value) as 2 | 4 })
                    }
                  >
                    <option value={2}>2</option>
                    <option value={4}>4</option>
                  </select>
                </label>
                <label>
                  {t('Bàn cờ')}
                  <select
                    value={config.board ?? 'classic'}
                    onChange={(e) =>
                      setConfig({ ...config, board: e.target.value as 'classic' | 'grand' })
                    }
                  >
                    <option value="classic">{t('Cổ điển')}</option>
                    <option value="grand">{t('Đại viễn chinh')}</option>
                  </select>
                </label>
                <label className="online-check">
                  <input
                    type="checkbox"
                    checked={config.launchOnOne}
                    onChange={(e) => setConfig({ ...config, launchOnOne: e.target.checked })}
                  />
                  {t('Xuất chuồng bằng 1 hoặc 6')}
                </label>
                <label className="online-check">
                  <input
                    type="checkbox"
                    checked={config.modules.spells}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        modules: { ...config.modules, spells: e.target.checked },
                      })
                    }
                  />
                  {t('Tinh thạch & phép')}
                </label>
                <label className="online-check">
                  <input
                    type="checkbox"
                    checked={config.modules.portals}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        modules: { ...config.modules, portals: e.target.checked },
                      })
                    }
                  />
                  {t('Cổng không gian')}
                </label>
                <label className="online-check">
                  <input
                    type="checkbox"
                    checked={config.modules.comeback}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        modules: { ...config.modules, comeback: e.target.checked },
                      })
                    }
                  />
                  {t('Tái xuất')}
                </label>
                <label className="online-check">
                  <input
                    type="checkbox"
                    checked={!!config.modules.events}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        modules: { ...config.modules, events: e.target.checked },
                      })
                    }
                  />
                  {t('Biến cố bầu trời')}
                </label>
                <label className="online-check">
                  <input
                    type="checkbox"
                    checked={!!config.modules.relics}
                    onChange={(e) =>
                      setConfig({
                        ...config,
                        modules: { ...config.modules, relics: e.target.checked },
                      })
                    }
                  />
                  {t('Cổ vật bí ẩn')}
                </label>
                <button
                  className="button primary"
                  disabled={busy || !name.trim()}
                  onClick={() =>
                    run(async () => remember(await createRoom(config, name, botCount)))
                  }
                >
                  {t('Tạo phòng')}
                </button>
              </section>
              <section>
                <h2>{t('Vào phòng')}</h2>
                <label>
                  {t('Mã phòng')}
                  <input
                    value={code}
                    maxLength={6}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    autoCapitalize="characters"
                  />
                </label>
                <button
                  className="button secondary"
                  disabled={busy || !name.trim() || code.length !== 6}
                  onClick={() => run(async () => remember(await joinRoom(code, name)))}
                >
                  {t('Vào phòng')}
                </button>
              </section>
            </div>
          </>
        ) : (
          <>
            <div className="online-room">
              <div>
                <p>{t('Mã phòng')}</p>
                <strong className="room-code">{room.code}</strong>
                <p>
                  {room.players.length}/{room.capacity} {t('người chơi')}
                </p>
                <ol>
                  {room.players.map((p) => (
                    <li key={p.seat}>
                      {p.name}
                      {p.bot ? ` · ${t('Máy')}` : ''}
                      {p.seat === 0 ? ` · ${t('Chủ phòng')}` : ''}
                      {p.seat === room.seat ? ` · ${t('Bạn')}` : ''}
                    </li>
                  ))}
                </ol>
                <button
                  className="button secondary"
                  onClick={() => navigator.clipboard?.writeText(link)}
                >
                  {t('Sao chép liên kết')}
                </button>
              </div>
              {qr && <img src={qr} alt={t('Mã QR mời vào phòng')} width="180" height="180" />}
            </div>
            {room.seat === 0 ? (
              <button
                className="button primary"
                disabled={busy || room.players.length !== room.capacity}
                onClick={() => run(async () => onUpdate(await startRoom(session!)))}
              >
                {t('Bắt đầu ván')}
              </button>
            ) : (
              <p>{t('Đang chờ chủ phòng bắt đầu…')}</p>
            )}
          </>
        )}
      </section>
    </main>
  );
}
