"use client";
import { useState } from "react";
import { IconHistory, IconShieldCheck } from "@revenue/ui";
import {
  Badge,
  Button,
  Check,
  EmptyState,
  Field,
  Input,
  Meter,
  toneFor,
} from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import "../../styles/pages/settings.css";

const QUOTA_KEYS = ["aiCredits", "enrichmentCredits", "sends", "exports"];
const QUOTA_LABELS: Record<string, string> = {
  aiCredits: "AI credits",
  enrichmentCredits: "Enrichment",
  sends: "sends",
  exports: "exports",
};
const SECTIONS = [
  ["billing", "Spending and plan"],
  ["limits", "Quotas and member caps"],
  ["assignment", "Contact assignment"],
  ["connectors", "Connections"],
  ["preflight", "Sender checks"],
  ["audit", "Audit history"],
] as const;
const CHECK_LABELS: Record<string, string> = {
  mailbox: "Sender mailbox",
  spf: "SPF authentication",
  dkim: "DKIM authentication",
  dmarc: "DMARC authentication",
  unsubscribe: "Unsubscribe link",
  warmupDays: "Warm-up days",
  bounceRate: "Bounce rate",
  complaintRate: "Complaint rate",
  dailyCap: "Daily sending cap",
  checkedAt: "Last checked",
  simulated: "Simulated check",
};

export function Settings() {
  const [section, setSection] =
    useState<(typeof SECTIONS)[number][0]>("billing");
  const [comparePlans, setComparePlans] = useState(false);
  const [provider, setProvider] = useState<string | null>(null);
  const { ws, data, busy, canWrite, action, propose } = useWorkspace();
  const { t, language } = usePrefs();
  const isOwner = data.role === "owner";
  const limits = {
    ...data.plans[data.workspace.plan],
    ...data.workspace.planLimits,
  } as Record<string, number>;
  const members = data.members.filter((m) =>
    ["owner", "operator"].includes(m.role),
  );
  const connector = data.connectors.find((c) => c.provider === provider);
  const number = (value: number) =>
    value.toLocaleString(language === "ar" ? "ar-EG" : "en-US");
  const patch = (body: unknown, message: string) =>
    action(
      () =>
        client.workspace(ws, "", {
          method: "PATCH",
          body: JSON.stringify(body),
        }),
      t(message),
    );
  const title =
    section === "billing" && comparePlans
      ? "Compare plans"
      : section === "connectors" && connector
        ? "Connect provider"
        : SECTIONS.find(([id]) => id === section)![1];

  return (
    <div className="settings-page">
      <nav className="settings-nav" aria-label={t("Settings")}>
        {SECTIONS.map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-current={section === id ? "page" : undefined}
            onClick={() => {
              setSection(id);
              setComparePlans(false);
              setProvider(null);
            }}
          >
            {t(label)}
          </button>
        ))}
      </nav>
      <section
        className="settings-content"
        aria-labelledby="settings-section-title"
        aria-busy={busy}
      >
        <h2 id="settings-section-title">{t(title)}</h2>
        {!isOwner &&
          ["billing", "limits", "assignment", "connectors"].includes(
            section,
          ) && (
            <p className="settings-note">
              {t("Only workspace owners can change these settings.")}
            </p>
          )}
        {section === "billing" && !comparePlans && (
          <>
            {data.budgets
              .filter((b) => !b.userId)
              .map((b) => (
                <div key={b.id}>
                  <div className="settings-usage">
                    <strong>
                      <bdi className="settings-credit-ratio" dir="ltr">
                        <span>{number(b.used + b.reserved)}</span>
                        <span>/</span>
                        <span>{number(b.cap)}</span>
                      </bdi>{" "}
                      {t("credits")}
                    </strong>
                    <p>
                      {t("Used and reserved this month")} ·{" "}
                      <bdi>{data.workspace.plan}</bdi>
                    </p>
                    <Meter value={b.used + b.reserved} max={b.cap} />
                    <span className="settings-usage-detail">
                      <bdi>{number(b.used)}</bdi> {t("credits used")} ·{" "}
                      <bdi>{number(b.reserved)}</bdi> {t("reserved")}
                    </span>
                  </div>
                  <form
                    className="settings-form"
                    onSubmit={(e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      void patch(
                        { cap: Number(f.get("cap")) },
                        "Spending cap saved.",
                      );
                    }}
                  >
                    <Field label={t("Monthly cap")}>
                      <Input
                        type="number"
                        name="cap"
                        min={0}
                        defaultValue={b.cap}
                        required
                        disabled={!isOwner || busy}
                      />
                    </Field>
                    <div className="button-row">
                      <Button
                        variant="primary"
                        type="submit"
                        disabled={!isOwner || busy}
                      >
                        {t("Save cap")}
                      </Button>
                      <Button onClick={() => setComparePlans(true)}>
                        {t("Compare plans")}
                      </Button>
                    </div>
                  </form>
                </div>
              ))}
            {!data.budgets.some((b) => !b.userId) && (
              <EmptyState
                title={t("No spending budget yet")}
                text={t(
                  "A workspace budget will appear here when it is available.",
                )}
                action={
                  <Button onClick={() => setComparePlans(true)}>
                    {t("Compare plans")}
                  </Button>
                }
              />
            )}
            <p className="settings-note">
              {t(
                "Billing remains a labelled simulation. No payment is collected.",
              )}
            </p>
          </>
        )}
        {section === "billing" && comparePlans && (
          <>
            <p className="settings-intro">
              <bdi>{data.workspace.plan}</bdi> · {t("Current plan")}
            </p>
            <ul className="settings-plan-list">
              {Object.entries(data.plans).map(([name, plan]) => {
                const current = name === data.workspace.plan;
                return (
                  <li key={name}>
                    <div>
                      <h3>
                        <bdi>{name}</bdi>
                      </h3>
                      <p>
                        <bdi dir="ltr">${number(plan.price)}</bdi> /{" "}
                        {t("month")} · <bdi>{number(plan.aiCredits)}</bdi>{" "}
                        {t("AI credits")}
                      </p>
                    </div>
                    {current ? (
                      <Badge tone="ok">{t("Current")}</Badge>
                    ) : (
                      <Button
                        size="sm"
                        disabled={!isOwner || busy}
                        onClick={() =>
                          void patch(
                            { plan: name },
                            "Plan selected. No payment was collected.",
                          )
                        }
                      >
                        {t("Mock checkout")}
                      </Button>
                    )}
                  </li>
                );
              })}
            </ul>
            <p className="settings-note">
              {t(
                "Billing remains a labelled simulation. No payment is collected.",
              )}
            </p>
            <Button onClick={() => setComparePlans(false)}>
              {t("Back to spending")}
            </Button>
          </>
        )}
        {section === "limits" && (
          <>
            <form
              className="settings-form"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                void patch(
                  {
                    planLimits: Object.fromEntries(
                      QUOTA_KEYS.map((k) => [k, Number(f.get(k))]),
                    ),
                    memberCaps: data.members.map((m) => ({
                      userId: m.userId,
                      cap: Number(f.get(`member:${m.userId}`)),
                    })),
                  },
                  "Workspace quotas and member caps saved.",
                );
              }}
            >
              <ul className="quota-list settings-quotas">
                {QUOTA_KEYS.map((k) => {
                  const q = data.quotas.find((quota) => quota.kind === k);
                  return (
                    <li key={k}>
                      <div>
                        <strong>{t(QUOTA_LABELS[k])}</strong>
                        <small>
                          <bdi>
                            {number((q?.used ?? 0) + (q?.reserved ?? 0))}
                          </bdi>{" "}
                          {t("used and reserved")}
                        </small>
                      </div>
                      <Field
                        label={t("Monthly quota") + " · " + t(QUOTA_LABELS[k])}
                      >
                        <Input
                          name={k}
                          type="number"
                          min={0}
                          max={
                            k === "exports"
                              ? 10000
                              : k === "sends"
                                ? 1000000
                                : 100000
                          }
                          defaultValue={limits[k]}
                          required
                          disabled={!isOwner || busy}
                        />
                      </Field>
                    </li>
                  );
                })}
              </ul>
              <h3>{t("Member credit caps")}</h3>
              <p className="settings-note">
                {t(
                  "Reducing a cap keeps existing usage and prevents further reservations.",
                )}
              </p>
              <div className="settings-member-caps">
                {data.members.map((m) => (
                  <Field
                    key={m.userId}
                    label={
                      <>
                        <bdi>{t(m.user.name)}</bdi> · {t(m.role)}
                      </>
                    }
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
                      disabled={!isOwner || busy}
                    />
                  </Field>
                ))}
              </div>
              <Button
                variant="primary"
                type="submit"
                disabled={!isOwner || busy}
              >
                {t("Save quotas and member caps")}
              </Button>
            </form>
          </>
        )}
        {section === "assignment" && (
          <form
            className="settings-form"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void patch(
                {
                  company: {
                    roundRobin: f.get("roundRobin") === "on",
                    ownerCaps: Object.fromEntries(
                      members.map((m) => [
                        m.userId,
                        Number(f.get(`contacts:${m.userId}`)),
                      ]),
                    ),
                  },
                },
                "Contact assignment saved.",
              );
            }}
          >
            <div className="settings-assignment-method">
              <Check
                name="roundRobin"
                label={t("Automatically distribute new contacts")}
                defaultChecked={data.workspace.company.roundRobin}
                disabled={!isOwner || busy}
              />
            </div>
            <div className="settings-assignment-members">
              {members.map((m) => (
                <div className="settings-member" key={m.userId}>
                  <div>
                    <strong>
                      <bdi>{t(m.user.name)}</bdi>
                    </strong>
                    <small>{t(m.role)}</small>
                  </div>
                  <Field label={t("Contact cap")}>
                    <Input
                      name={`contacts:${m.userId}`}
                      type="number"
                      min={0}
                      max={10000}
                      defaultValue={
                        data.workspace.company.ownerCaps?.[m.userId] ?? 10000
                      }
                      required
                      disabled={!isOwner || busy}
                    />
                  </Field>
                </div>
              ))}
            </div>
            {!members.length && (
              <EmptyState
                title={t("No eligible members")}
                text={t("Owners and operators can receive new contacts.")}
              />
            )}
            <p className="settings-note">
              {t(
                "Distribute new imports across owners and operators with the fewest active contacts. Existing owners are retained.",
              )}
            </p>
            <Button variant="primary" type="submit" disabled={!isOwner || busy}>
              {t("Save assignment")}
            </Button>
          </form>
        )}
        {section === "connectors" && !connector && (
          <>
            <ul className="settings-connections">
              <li>
                <div>
                  <h3>Twenty CRM</h3>
                  <p>{t("Native CRM records")}</p>
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
                <li key={c.provider}>
                  <div>
                    <h3>
                      <bdi>{c.provider}</bdi>
                    </h3>
                    <div className="badge-row">
                      <Badge tone={toneFor(c.mode)}>{t(c.mode)}</Badge>
                      <Badge tone={toneFor(c.status)}>{t(c.status)}</Badge>
                    </div>
                    {c.lastError && (
                      <p className="error-text">
                        {t(
                          "Connection needs attention. Check your credentials and try again.",
                        )}
                      </p>
                    )}
                  </div>
                  <Button
                    size="sm"
                    disabled={!isOwner || busy}
                    onClick={() => setProvider(c.provider)}
                  >
                    {t("Configure")}
                  </Button>
                </li>
              ))}
            </ul>
            {!data.connectors.length && (
              <EmptyState
                title={t("No providers available")}
                text={t("Available providers will appear here.")}
              />
            )}
            <p className="settings-note">
              {t(
                "Secrets are encrypted server-side. Saving credentials does not enable live sending.",
              )}
            </p>
          </>
        )}
        {section === "connectors" && connector && (
          <form
            className="settings-form settings-provider"
            key={connector.provider}
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              const form = e.currentTarget;
              void action(async () => {
                await client.workspace(
                  ws,
                  `/connectors/${connector.provider}`,
                  {
                    method: "POST",
                    body: JSON.stringify({ secret: f.get("secret") }),
                  },
                );
                form.reset();
              }, t("Sandbox credential saved for validation."));
            }}
          >
            <Field label={t("Provider")}>
              <Input value={connector.provider} readOnly dir="ltr" />
            </Field>
            <Field
              label={t("API key")}
              hint={
                connector.provider === "predictleads"
                  ? t("Enter JSON with key and token.")
                  : undefined
              }
            >
              <Input
                aria-label={`${connector.provider} secret`}
                name="secret"
                type="password"
                placeholder={t("Enter your provider key")}
                autoComplete="off"
                minLength={10}
                maxLength={4000}
                required
                disabled={!isOwner || busy}
              />
            </Field>
            <p className="settings-note">
              {t(
                "Secrets are encrypted server-side. Saving credentials does not enable live sending.",
              )}
            </p>
            <div className="button-row">
              <Button
                variant="primary"
                type="submit"
                disabled={!isOwner || busy}
              >
                {t("Save")}
              </Button>
              <Button onClick={() => setProvider(null)}>{t("Cancel")}</Button>
            </div>
          </form>
        )}
        {section === "preflight" && (
          <>
            <p className="settings-intro">
              {t("Review sender readiness before preparing a sequence.")}
            </p>
            {Object.keys(data.workspace.preflight).length ? (
              <dl className="settings-checks">
                {Object.entries(data.workspace.preflight).map(
                  ([key, value]) => (
                    <div key={key}>
                      <dt>
                        <IconShieldCheck size={18} aria-hidden />
                        <span>{t(CHECK_LABELS[key] ?? key)}</span>
                      </dt>
                      <dd>
                        {typeof value === "boolean" ? (
                          <Badge
                            tone={
                              key === "simulated"
                                ? "info"
                                : value
                                  ? "ok"
                                  : "warn"
                            }
                          >
                            {t(value ? "Yes" : "No")}
                          </Badge>
                        ) : (
                          <bdi dir="ltr">
                            {key === "checkedAt" &&
                            typeof value === "string" &&
                            Number.isFinite(Date.parse(value))
                              ? new Date(value).toLocaleString(
                                  language === "ar" ? "ar-EG" : "en-US",
                                )
                              : String(value)}
                          </bdi>
                        )}
                      </dd>
                    </div>
                  ),
                )}
              </dl>
            ) : (
              <EmptyState
                icon={<IconShieldCheck size={20} />}
                title={t("No sender check yet")}
                text={t(
                  "Run a sender check to review mailbox and domain readiness.",
                )}
              />
            )}
            <Button
              variant="primary"
              disabled={!canWrite || busy}
              onClick={() => void propose("preflight")}
            >
              {t("Review sender check")}
            </Button>
          </>
        )}
        {section === "audit" &&
          (data.audit.length ? (
            <ul className="settings-audit">
              {data.audit.map((a) => (
                <li key={a.id}>
                  <IconHistory size={18} aria-hidden />
                  <div>
                    <strong dir="auto">{a.action}</strong>
                    <time dateTime={a.createdAt}>
                      {new Date(a.createdAt).toLocaleString(
                        language === "ar" ? "ar-EG" : "en-US",
                      )}
                    </time>
                  </div>
                  <Badge dot={false}>{t("Recorded")}</Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              icon={<IconHistory size={20} />}
              title={t("No audit activity yet")}
              text={t("Actions will appear here as you work.")}
            />
          ))}
      </section>
    </div>
  );
}
