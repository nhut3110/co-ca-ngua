import { t, LanguageSwitch } from '../i18n';
import {
  DeviceMobileCamera,
  DownloadSimple,
  ArrowSquareOut,
  ArrowsClockwise,
  ShieldCheck,
} from '@phosphor-icons/react';
import type { useMobileAccess } from '../hooks/useMobileAccess';
export function MobileGate({ access }: { access: ReturnType<typeof useMobileAccess> }) {
  const ios =
    /iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (navigator.maxTouchPoints > 1 && /Macintosh/i.test(navigator.userAgent));
  return (
    <main className="mobile-gate" aria-labelledby="mobile-gate-title">
      <div className="mobile-gate-card">
        <LanguageSwitch />
        <span className="gate-eyebrow">{t('SKYHOOF · SẴN SÀNG LÊN ĐƯỜNG')}</span>
        <div className="gate-illustration" aria-hidden="true">
          <DeviceMobileCamera size={76} weight="thin" />
          <ArrowsClockwise size={30} />
        </div>
        <h1 id="mobile-gate-title">
          {t(access.installed ? 'Xoay ngang để vào bàn' : 'Mang bàn cờ về màn hình chính')}
        </h1>
        <p>
          {t(
            access.installed
              ? 'Skyhoof chơi ở chế độ ngang. Ván đang chơi sẽ tạm dừng khi bạn xoay dọc.'
              : 'Trên điện thoại, hãy cài Skyhoof, mở từ biểu tượng ứng dụng và xoay ngang để chơi.',
          )}
        </p>
        {!access.installed && (
          <>
            <ol className="install-steps">
              <li>
                <span>1</span>
                <div>
                  <strong>{t('Cài ứng dụng')}</strong>
                  <p>
                    {t(
                      ios
                        ? 'Trong Safari, bấm Chia sẻ → Thêm vào MH chính → Thêm. Nếu có “Mở dưới dạng ứng dụng web”, hãy bật tùy chọn đó.'
                        : 'Trong Chrome, mở menu ⋮ → Cài đặt ứng dụng hoặc Thêm vào màn hình chính.',
                    )}
                  </p>
                </div>
              </li>
              <li>
                <span>2</span>
                <div>
                  <strong>{t('Mở Skyhoof từ màn hình chính')}</strong>
                  <p>{t('Thoát tab này và chạm biểu tượng Skyhoof vừa cài.')}</p>
                </div>
              </li>
              <li>
                <span>3</span>
                <div>
                  <strong>{t('Xoay điện thoại nằm ngang')}</strong>
                  <p>{t('Nếu máy không xoay, hãy tắt khóa xoay màn hình.')}</p>
                </div>
              </li>
            </ol>
            {access.canInstall && (
              <button
                className="button primary full"
                disabled={access.installing}
                onClick={() => void access.install()}
              >
                <DownloadSimple size={20} />
                {t(access.installing ? 'Đang mở cài đặt…' : 'Cài Skyhoof')}
              </button>
            )}
            {!access.canInstall && (
              <p className="install-browser-note">
                <ArrowSquareOut size={18} />
                {t(
                  ios
                    ? 'Không thấy mục cài đặt? Hãy mở liên kết bằng Safari.'
                    : 'Không thấy mục cài đặt? Hãy mở liên kết bằng Chrome. PWA cần HTTPS hoặc localhost.',
                )}
              </p>
            )}
          </>
        )}
        {access.installed && (
          <div className="gate-ready">
            <ShieldCheck size={20} />
            {t('Đã mở trong ứng dụng · Chờ màn hình ngang')}
          </div>
        )}
        {access.hint && (
          <p role="status" className="install-status">
            {t(access.hint)}
          </p>
        )}
      </div>
    </main>
  );
}
