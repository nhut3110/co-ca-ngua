import { t } from '../i18n';
import { SpeakerHigh } from '@phosphor-icons/react';
import type { AudioPreferences } from '../audio/GameAudio';
export function AudioSettings({
  preferences,
  update,
  preview,
}: {
  preferences: AudioPreferences;
  update: (patch: Partial<AudioPreferences>) => void;
  preview: () => void;
}) {
  return (
    <section className="audio-settings" aria-label={t('Âm thanh')}>
      <label className="toggle-row">
        <span className="module-icon">
          <SpeakerHigh size={22} />
        </span>
        <span>
          <strong>{t('Âm thanh')}</strong>
          <small>{t('Nhạc fantasy và hiệu ứng trong trận.')}</small>
        </span>
        <input
          type="checkbox"
          checked={!preferences.muted}
          onChange={(e) => update({ muted: !e.target.checked })}
        />
        <span className="switch" />
      </label>
      <label className="volume-control">
        <span>
          {t('Nhạc nền ')}
          <output>{t(Math.round(preferences.music * 100))}%</output>
        </span>
        <input
          aria-label={t('Âm lượng nhạc nền')}
          type="range"
          min="0"
          max="100"
          value={Math.round(preferences.music * 100)}
          onChange={(e) => update({ music: Number(e.target.value) / 100 })}
        />
      </label>
      <label className="volume-control">
        <span>
          {t('Hiệu ứng ')}
          <output>{t(Math.round(preferences.effects * 100))}%</output>
        </span>
        <input
          aria-label={t('Âm lượng hiệu ứng')}
          type="range"
          min="0"
          max="100"
          value={Math.round(preferences.effects * 100)}
          onChange={(e) => update({ effects: Number(e.target.value) / 100 })}
        />
      </label>
      <button
        className="button secondary full"
        disabled={preferences.muted || preferences.effects === 0}
        onClick={preview}
      >
        {t('Nghe thử phép thuật')}
      </button>
      <p className="audio-hint">
        {t('Âm thanh bắt đầu sau lần chạm đầu tiên. Lựa chọn được lưu trên máy.')}
      </p>
    </section>
  );
}
