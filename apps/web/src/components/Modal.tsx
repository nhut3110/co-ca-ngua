import { t } from '../i18n';
import { useEffect, useRef, type ReactNode } from 'react';
import { X } from '@phosphor-icons/react';
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    ref.current?.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      aria-labelledby="modal-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-inner">
        <header>
          <h2 id="modal-title">{t(title)}</h2>
          <button className="icon-button" autoFocus onClick={onClose} aria-label={t('Đóng')}>
            <X size={21} />
          </button>
        </header>
        {t(children)}
      </div>
    </dialog>
  );
}
