import { t } from '../i18n';
import { Horse } from '@phosphor-icons/react';
export function Brand({ onClick }: { onClick: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label={t('Skyhoof — Trang chủ')}>
      <span className="brand-mark">
        <Horse size={25} weight="fill" />
      </span>
      <span>Skyhoof</span>
    </button>
  );
}
export function StepLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="eyebrow">
      <span />
      {t(children)}
    </div>
  );
}
