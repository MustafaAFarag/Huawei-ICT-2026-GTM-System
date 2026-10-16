"use client";
import { useEffect, useRef, type ReactNode } from "react";
import type { ToolRequest } from "@revenue/contracts";
import { IconX } from "@revenue/ui";
import { Badge, Button } from "./primitives";
import { usePrefs } from "../lib/prefs";
import { assetLabel } from "../lib/asset-label";
import { useWorkspace } from "./workspace-context";
import { client } from "../lib/client";
import type { Asset } from "../lib/types";

export type Proposal = {
  input: ToolRequest;
  quote: { id: string; estimate: number; audience: number; expiresAt: string };
};

// Focus trap and Escape handling shared by every dialog.
function useDialog(open: boolean, busy: boolean, onClose: () => void) {
  const close = useRef(onClose);
  close.current = onClose;
  const busyRef = useRef(busy);
  busyRef.current = busy;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const modal = document.querySelector<HTMLElement>('[role="dialog"]');
    const controls = () =>
      Array.from(
        modal?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), input:not(:disabled), textarea:not(:disabled), select:not(:disabled), a[href], iframe",
        ) ?? [],
      );
    controls()[0]?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busyRef.current) close.current();
      if (event.key !== "Tab") return;
      const list = controls();
      if (!list.length) return;
      if (event.shiftKey && document.activeElement === list[0]) {
        event.preventDefault();
        list.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === list.at(-1)) {
        event.preventDefault();
        list[0]?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected) previous.focus();
    };
  }, [open]);
}

function Dialog({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className="modal-backdrop">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby={label}
        className={`modal ${className}`}
      >
        {children}
      </section>
    </div>
  );
}

export function CostModal({
  proposal,
  busy,
  error,
  onCancel,
  onApprove,
}: {
  proposal: Proposal;
  busy: boolean;
  error: string;
  onCancel: () => void;
  onApprove: () => void;
}) {
  const { t } = usePrefs();
  useDialog(true, busy, onCancel);
  return (
    <Dialog label="cost-title">
      <p className="eyebrow">{t("Review before running")}</p>
      <h2 id="cost-title" className="step-name">
        {proposal.input.tool.replaceAll("_", " ")}
      </h2>
      <div className="badge-row">
        <Badge>
          {proposal.quote.audience || t("Workspace")} {t("selected")}
        </Badge>
        <Badge>{proposal.input.language}</Badge>
        <Badge>{proposal.input.play}</Badge>
      </div>
      {error && (
        <p role="alert" className="error-text">
          {error}
        </p>
      )}
      {proposal.input.message && (
        <div className="revision-request">
          <strong>{t("Requested change")}</strong>
          <p dir="auto">{proposal.input.message}</p>
          {proposal.input.sourceAssetId && (
            <p className="muted small">
              {t(
                "Creates a new unapproved revision. The original is preserved.",
              )}
            </p>
          )}
        </div>
      )}
      <div className="cost">
        <strong className="mono">{proposal.quote.estimate}</strong>
        <span>{t("credits maximum")}</span>
      </div>
      <p className="muted">
        {t(
          "Audience, evidence, copy and sender settings are bound to this approval. It expires in 15 minutes. Unused credits are released after the run.",
        )}
      </p>
      {proposal.input.tool === "queue_sequence" && (
        <p className="muted">
          {t(
            "Each contact must pass current copy approval, suppression, country policy and sender checks. Sequences are simulated.",
          )}
        </p>
      )}
      <div className="button-row end">
        <Button disabled={busy} onClick={onCancel}>
          {t("Cancel")}
        </Button>
        <Button variant="primary" disabled={busy} onClick={onApprove}>
          {busy ? t("Queuing…") : t("Approve cost and run")}
        </Button>
      </div>
    </Dialog>
  );
}
