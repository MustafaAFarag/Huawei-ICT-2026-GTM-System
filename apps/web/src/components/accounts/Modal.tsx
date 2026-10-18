"use client";
import { useEffect, useId, useRef, type ReactNode } from "react";
import { IconX } from "@revenue/ui";
import { usePrefs } from "../../lib/prefs";

// Modal dialog on the native <dialog> element: the browser traps focus, makes the page behind
// inert and closes on Escape. Clicking the dimmed backdrop closes it too.
export function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  const { t } = usePrefs();
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    const previous = document.activeElement as HTMLElement | null;
    if (!dialog.open) dialog.showModal();
    return () => {
      if (dialog.open) dialog.close();
      if (previous?.isConnected) previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="acct-modal"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target === ref.current) onClose();
      }}
    >
      <div className="acct-modal-body">
        <header className="acct-modal-head">
          <div>
            <h2 id={titleId}>{title}</h2>
            {subtitle && <p dir="auto">{subtitle}</p>}
          </div>
          <button
            type="button"
            className="icon-button"
            aria-label={t("Close")}
            onClick={onClose}
          >
            <IconX size={16} />
          </button>
        </header>
        {children}
      </div>
    </dialog>
  );
}
