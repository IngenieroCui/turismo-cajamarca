import React, { useEffect, useId, useRef } from 'react';
import { X } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: string;
  closeOnBackdrop?: boolean;
}

const FOCUSABLE_SELECTOR =
  'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])';

const ModalShell: React.FC<Props> = ({
  open,
  title,
  description,
  onClose,
  children,
  footer,
  maxWidth = 'max-w-lg',
  closeOnBackdrop = true,
}) => {
  const titleId = useId();
  const descriptionId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement | null>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const closeHandler = useRef(onClose);

  useEffect(() => {
    closeHandler.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusTimer = window.setTimeout(() => {
      const autofocusTarget = dialogRef.current?.querySelector<HTMLElement>(
        '[data-autofocus]:not([disabled])',
      );
      (autofocusTarget || closeRef.current)?.focus();
    }, 0);

    const isTopmostDialog = () => {
      const dialogs = Array.from(
        document.querySelectorAll<HTMLElement>('[data-modal-shell="true"]'),
      );
      return dialogs[dialogs.length - 1] === dialogRef.current;
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (!isTopmostDialog()) return;

      if (event.key === 'Escape') {
        event.stopPropagation();
        closeHandler.current();
        return;
      }

      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;

      const focusable = Array.from(
        dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
      ).filter((element) => !element.hasAttribute('disabled'));
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.();
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (closeOnBackdrop && event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        data-modal-shell="true"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={`max-h-[92vh] w-full ${maxWidth} overflow-y-auto rounded-3xl border border-[var(--border-medium)] bg-[var(--bg-secondary)] shadow-2xl`}
      >
        <header className="flex items-start justify-between gap-4 border-b border-[var(--border-light)] p-5">
          <div>
            <h2 id={titleId} className="my-0 text-lg font-bold">
              {title}
            </h2>
            {description && (
              <p id={descriptionId} className="mt-1 text-xs text-[var(--text-secondary)]">
                {description}
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            aria-label="Cerrar"
            className="rounded-xl bg-[var(--bg-primary)] p-2"
            onClick={onClose}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="p-6">{children}</div>
        {footer && (
          <footer className="border-t border-[var(--border-light)] bg-[var(--bg-primary)] p-4">
            {footer}
          </footer>
        )}
      </section>
    </div>
  );
};

export default ModalShell;
