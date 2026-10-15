"use client";
import { IconPlug, IconShieldCheck, IconHistory, IconCoin } from "@revenue/ui";
import {
  Badge,
  Button,
  Field,
  Input,
  Meter,
  Panel,
  toneFor,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";

const QUOTA_KEYS = ["aiCredits", "enrichmentCredits", "sends", "exports"];

export function Settings() {
  const { ws, data, busy, canWrite, action, propose } = useWorkspace();
  const { t } = usePrefs();
  const isOwner = data.role === "owner";
  const limits = {
    ...data.plans[data.workspace.plan],
    ...data.workspace.planLimits,
  } as Record<string, number>;
  return (
    <div className="settings-grid">
      <Panel
        eyebrow={t("Billing")}
        title={t("Spending and plan")}
        actions={<IconCoin size={16} aria-hidden className="muted" />}
      >
        {data.budgets
          .filter((b) => !b.userId)
          .map((b) => (
            <div key={b.id} className="stack">
              <div className="budget-line">
                <span>
                  <strong className="mono">{b.used}</strong> {t("credits used")}{" "}
                  · <span className="mono">{b.reserved}</span> {t("reserved")} ·{" "}
                  <span className="mono">{b.cap}</span> {t("cap")}
                </span>
                <Meter value={b.used + b.reserved} max={b.cap} />
              </div>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  void action(
                    () =>
                      client.workspace(ws, "", {
                        method: "PATCH",
                        body: JSON.stringify({ cap: Number(f.get("cap")) }),
                      }),
                    t("Spending cap saved."),
                  );
                }}
              >
                <Field label={t("Monthly cap")}>
                  <Input type="number" name="cap" min={0} defaultValue={b.cap} />
                </Field>
                <Button type="submit" disabled={!isOwner || busy}>
                  {t("Save cap")}
                </Button>
              </form>
            </div>
          ))}
        <div className="plan-grid">
          {Object.entries(data.plans).map(([name, plan]) => {
            const current = name === data.workspace.plan;
            return (
              <div key={name} className={`plan ${current ? "current" : ""}`}>
                <div className="plan-head">
                  <h3>{name}</h3>
                  {current && <Badge tone="ok">{t("Current")}</Badge>}
                </div>
                <p className="plan-price">
                  <span className="mono">${plan.price}</span>
                  <small> / {t("month")}</small>
                </p>
                <small className="mono muted">
                  {plan.aiCredits.toLocaleString("en-US")} AI credits
                </small>
                <Button
                  size="sm"
                  disabled={!isOwner || busy || current}
                  onClick={() =>
                    void action(
                      () =>
                        client.workspace(ws, "", {
                          method: "PATCH",
                          body: JSON.stringify({ plan: name }),
                        }),
                      `Mock checkout: ${name} selected. No payment was collected.`,
                    )
                  }
                >
                  {t("Mock checkout")}
                </Button>
              </div>
            );
          })}
        </div>
      </Panel>
      <Panel eyebrow={t("Limits")} title={t("Resource quotas and member caps")}>
        <p className="muted">
          {t(
            "Monthly workspace quotas apply alongside spending caps. Reducing a cap retains existing usage and prevents further reservations.",
          )}
        </p>
        <ul className="quota-list">
          {data.quotas.map((q) => (
            <li key={q.kind}>
              <span>{q.kind}</span>
              <span className="mono">
                {q.used + q.reserved} / {q.cap}
              </span>
              <Meter value={q.used + q.reserved} max={q.cap} />
            </li>
          ))}
        </ul>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            void action(
              () =>
                client.workspace(ws, "", {
                  method: "PATCH",
                  body: JSON.stringify({
                    planLimits: Object.fromEntries(
                      QUOTA_KEYS.map((k) => [k, Number(f.get(k))]),
                    ),
                    memberCaps: data.members.map((m) => ({
                      userId: m.userId,
                      cap: Number(f.get(`member:${m.userId}`)),
                    })),
                  }),
                }),
              t("Workspace quotas and member caps saved."),
            );
          }}
        >
          <div className="form-grid">
            {QUOTA_KEYS.map((k) => (
              <Field key={k} label={k}>
                <Input
                  name={k}
                  type="number"
                  min={0}
                  max={k === "exports" ? 10000 : k === "sends" ? 1000000 : 100000}
                  defaultValue={limits[k]}
                  required
                />
              </Field>
            ))}
            {data.members.map((m) => (
              <Field
                key={m.userId}
                label={`${m.user.name} · ${m.role} ${t("monthly credits")}`}
              >
                <Input
                  name={`member:${m.userId}`}
                  type="number"
                  min={0}
                  max={100000}
                  defaultValue={
                    m.creditCap ??
                    data.budgets.find((b) => b.userId === m.userId)?.cap ??
                    limits.aiCredits
                  }
                  required
                />
              </Field>
            ))}
          </div>
          <Button type="submit" disabled={!isOwner || busy}>
            {t("Save quotas and member caps")}
          </Button>
        </form>
      </Panel>
      <Panel
        eyebrow={t("Integrations")}
        title={t("Connectors")}
        actions={<IconPlug size={16} aria-hidden className="muted" />}
      >
        <p className="muted">
          {t(
            "Secrets are encrypted server-side. Saving credentials does not enable live sending.",
          )}
        </p>
        <ul className="connector-list">
          <li className="connector">
            <div>
              <strong>Twenty CRM</strong>
              <p className="muted small">{t("Native CRM records")}</p>
            </div>
            <Button
              size="sm"
              disabled={!isOwner || busy}
              onClick={() =>
                void action(
                  () =>
                    client.workspace(ws, "/connectors/crm/check", {
                      method: "POST",
                    }),
                  t("Twenty CRM connection verified."),
                )
              }
            >
              {t("Check connection")}
            </Button>
          </li>
          {data.connectors.map((c) => (
            <li key={c.provider} className="connector">
              <div>
                <strong>{c.provider}</strong>
                <div className="badge-row">
                  <Badge tone={toneFor(c.mode)}>{c.mode}</Badge>
                  <Badge tone={toneFor(c.status)}>{c.status}</Badge>
                </div>
                {c.lastError && <p className="error-text">{c.lastError}</p>}
              </div>
              <form
                className="inline-form"
                onSubmit={(e) => {
                  e.preventDefault();
                  const f = new FormData(e.currentTarget);
                  const form = e.currentTarget;
                  void action(async () => {
                    await client.workspace(ws, `/connectors/${c.provider}`, {
                      method: "POST",
                      body: JSON.stringify({ secret: f.get("secret") }),
                    });
                    form.reset();
                  }, t("Sandbox credential saved for validation."));
                }}
              >
                <Input
                  aria-label={`${c.provider} secret`}
                  name="secret"
                  type="password"
                  placeholder={
                    c.provider === "predictleads"
                      ? "JSON with key and token"
                      : "API key"
                  }
                  autoComplete="off"
                  required
                />
                <Button size="sm" type="submit" disabled={!isOwner || busy}>
                  {t("Save")}
                </Button>
              </form>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel
        eyebrow="P2"
        title={t("Sender pre-flight")}
        actions={<IconShieldCheck size={16} aria-hidden className="muted" />}
      >
        {Object.keys(data.workspace.preflight).length ? (
          <dl className="preflight">
            {Object.entries(data.workspace.preflight).map(([key, value]) => (
              <div key={key}>
                <dt className="mono">{key}</dt>
                <dd>
                  {typeof value === "boolean" ? (
                    <Badge tone={value ? "ok" : "danger"}>{String(value)}</Badge>
                  ) : (
                    <bdi className="mono">{String(value)}</bdi>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <p className="muted">{t("No sender check yet. Start P2.")}</p>
        )}
        <Button disabled={!canWrite || busy} onClick={() => void propose("preflight")}>
          {t("Review sender check")}
        </Button>
      </Panel>
      <Panel
        eyebrow={t("Governance")}
        title={t("Audit history")}
        className="span-2"
        actions={<IconHistory size={16} aria-hidden className="muted" />}
      >
        {data.audit.length ? (
          <ul className="audit-list">
            {data.audit.map((a) => (
              <li key={a.id}>
                <span>{a.action}</span>
                <time className="mono muted">
                  {new Date(a.createdAt).toLocaleString()}
                </time>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{t("Actions will appear here as you work.")}</p>
        )}
      </Panel>
    </div>
  );
}
