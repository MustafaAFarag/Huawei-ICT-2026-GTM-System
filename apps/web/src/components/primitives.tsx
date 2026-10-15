"use client";
import {
  forwardRef,
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { IconAlertTriangle, IconInbox } from "@revenue/ui";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "ai" | "danger";
  size?: "sm" | "md";
  startIcon?: ReactNode;
  endIcon?: ReactNode;
};
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      variant = "secondary",
      size = "md",
      startIcon,
      endIcon,
      className = "",
      type = "button",
      children,
      ...rest
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        className={`btn btn-${variant} btn-${size} ${className}`}
        {...rest}
      >
        {startIcon && <span className="btn-icon">{startIcon}</span>}
        {children}
        {endIcon && <span className="btn-icon">{endIcon}</span>}
      </button>
    );
  },
);

export const Input = forwardRef<
  HTMLInputElement,
  InputHTMLAttributes<HTMLInputElement>
>(function Input({ className = "", ...rest }, ref) {
  return <input ref={ref} className={`control ${className}`} {...rest} />;
});

export const Textarea = forwardRef<
  HTMLTextAreaElement,
  TextareaHTMLAttributes<HTMLTextAreaElement>
>(function Textarea({ className = "", ...rest }, ref) {
  return <textarea ref={ref} className={`control ${className}`} {...rest} />;
});

export function Select({
  className = "",
  ...rest
}: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className={`control ${className}`} {...rest} />;
}

export type Tone = "neutral" | "ok" | "warn" | "danger" | "info" | "ai";
export function Badge({
  tone = "neutral",
  children,
  dot = true,
}: {
  tone?: Tone;
  children: ReactNode;
  dot?: boolean;
}) {
  return (
    <span className={`badge tone-${tone}`}>
      {dot && <span className="dot" aria-hidden />}
      {children}
    </span>
  );
}

const STATE_TONES: Record<string, Tone> = {
  succeeded: "ok",
  approved: "ok",
  imported: "ok",
  connected: "ok",
  verified: "ok",
  simulated: "info",
  fixture: "info",
  sandbox: "info",
  queued: "warn",
  running: "warn",
  pending: "warn",
  draft: "warn",
  held: "warn",
  failed: "danger",
  cancelled: "danger",
  blocked: "danger",
  rejected: "danger",
  duplicate: "neutral",
};
export function toneFor(state: string): Tone {
  return STATE_TONES[state.toLowerCase()] ?? "neutral";
}

export function Panel({
  title,
  eyebrow,
  actions,
  children,
  className = "",
  as = "section",
}: {
  title?: ReactNode;
  eyebrow?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  const Tag = as;
  return (
    <Tag className={`panel ${className}`}>
      {(title || actions || eyebrow) && (
        <header className="panel-head">
          <div>
            {eyebrow && <p className="eyebrow">{eyebrow}</p>}
            {title && <h2>{title}</h2>}
          </div>
          {actions && <div className="panel-actions">{actions}</div>}
        </header>
      )}
      {children}
    </Tag>
  );
}

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: ReactNode;
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`field ${className}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  );
}

export function Check({
  label,
  ...rest
}: InputHTMLAttributes<HTMLInputElement> & { label: ReactNode }) {
  return (
    <label className="check">
      <input type="checkbox" {...rest} />
      <span>{label}</span>
    </label>
  );
}

export function Empty({
  title,
  children,
  icon,
  action,
}: {
  title: string;
  children: ReactNode;
  icon?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <span className="empty-icon" aria-hidden>
        {icon ?? <IconInbox size={18} />}
      </span>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}

export function ErrorPanel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div role="alert" className="error-panel">
      <IconAlertTriangle size={18} aria-hidden />
      <div>
        <strong>{title}</strong>
        <p>{children}</p>
        {actions && <div className="button-row">{actions}</div>}
      </div>
    </div>
  );
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <span key={i} style={{ inlineSize: `${92 - i * 14}%` }} />
      ))}
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <kbd className="kbd">{children}</kbd>;
}

export function Meter({ value, max }: { value: number; max: number }) {
  const ratio = max > 0 ? Math.min(value / max, 1) : 0;
  const state = ratio >= 1 ? "full" : ratio >= 0.8 ? "high" : "ok";
  return (
    <span
      className={`meter meter-${state}`}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
    >
      <span style={{ inlineSize: `${ratio * 100}%` }} />
    </span>
  );
}

export function Stat({
  label,
  value,
  meta,
  meter,
}: {
  label: string;
  value: ReactNode;
  meta?: ReactNode;
  meter?: { value: number; max: number };
}) {
  return (
    <div className="stat">
      <span className="eyebrow">{label}</span>
      <strong className="stat-value">{value}</strong>
      {meter && <Meter {...meter} />}
      {meta && <span className="stat-meta">{meta}</span>}
    </div>
  );
}

export function Credits({ value }: { value: number }) {
  return (
    <bdi className="mono credits">
      {value.toLocaleString("en-US")}
      <span> cr</span>
    </bdi>
  );
}
