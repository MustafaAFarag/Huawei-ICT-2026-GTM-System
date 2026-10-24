"use client";
import { useState } from "react";
import { PACKS, PACK_IDS, type PackId } from "@revenue/contracts";
import { IconBuilding } from "@revenue/ui";
import { Badge, Button, EmptyState } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import { IconCheck } from "./icons";
import { CapabilityProfile } from "./CapabilityProfile";
import type { SectionId } from "./sections";

// Pack copy lives here, not in the pack data. The HR text names payroll, so it is only drawn
// for a workspace that is on the HR pack (or while the comparison is open on purpose).
const PACK_TEXT: Record<PackId, string | null> = {
  "hr-services":
    "Discovery asks about payroll set-up, HR maturity (P1a / P1b / P2) and headcount across Egypt and the GCC.",
  generic:
    "Neutral discovery questions and rubric for any B2B services provider.",
};

const HR_WORDING = /payroll|\bHR\b|human resources|الرواتب|الموارد البشرية/i;

function PackCompare() {
  const { t, language } = usePrefs();
  const { data } = useWorkspace();
  return (
    <div className="bc-compare" data-ai-target="pack-compare">
      <p className="bc-caption">
        {t("Same accounts, two packs. Each pack asks its own discovery questions.")}
      </p>
      <div className="bc-compare-grid">
        {PACK_IDS.map((id) => {
          const pack = PACKS[id];
          const rubric = pack.rubric;
          const clean =
            !pack.setupField &&
            !pack.discovery.some((q) => HR_WORDING.test(q.question[language]));
          return (
            <article className="bc-card" key={id}>
              <header className="bc-compare-head">
                <h3>{pack.label[language]}</h3>
                {data.pack.id === id && (
                  <Badge tone="ok">{t("This workspace")}</Badge>
                )}
              </header>
              <p className="bc-kicker">{t("Discovery questions")}</p>
              <ol className="bc-questions">
                {pack.discovery.map((q) => (
                  <li key={q.id}>{q.question[language]}</li>
                ))}
              </ol>
              <dl className="bc-facts">
                <div>
                  <dt>{t("Maturity dimension")}</dt>
                  <dd>{pack.maturity.dimension[language]}</dd>
                </div>
                <div>
                  <dt>{t("Rubric defaults")}</dt>
                  <dd>
                    {t("Title")} {rubric.role.points} · {t("size")}{" "}
                    {rubric.size.points} · {t("website")}{" "}
                    {rubric.website.points} · {t("signal")}{" "}
                    {rubric.signal.points}
                  </dd>
                </div>
              </dl>
              {id === "generic" && clean && (
                <p className="bc-note-ok">
                  <IconCheck size={14} />{" "}
                  {t("No set-up question. No sector-specific answer is required.")}
                </p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function WorkspaceSetup({
  onSection,
}: {
  onSection: (section: SectionId) => void;
}) {
  const { ws, data, busy, action, setTab } = useWorkspace();
  const { t, language } = usePrefs();
  const [comparing, setComparing] = useState(false);
  const isOwner = data.role === "owner";
  const current = data.pack.id;
  const offers = data.workspace.offers.filter((o) => o.approved);
  const proofs = (data.workspace.company.references ?? []).filter(
    (r) => r.consent,
  );
  const accounts = data.prospects.length;
  const checks = [
    {
      key: "offer",
      ok: offers.length > 0,
      title: t("Approved offer"),
      sub: offers[0]?.text ?? t("Approve an offer in Messaging"),
    },
    {
      key: "proof",
      ok: proofs.length > 0,
      title: t("One approved proof item"),
      sub: proofs[0]?.name ?? t("Record permission for a reference"),
    },
    {
      key: "list",
      ok: accounts >= 50 && accounts <= 200,
      title: t("Account list of 50–200 rows"),
      sub: `${accounts} ${t("accounts imported")}`,
    },
  ];
  const ready = checks.every((c) => c.ok);
  // The HR pack asks payroll and hiring questions; warn when the business says nothing about HR.
  const packMismatch =
    current === "hr-services" &&
    ![data.workspace.company.description, ...offers.map((o) => o.text)].some(
      (text) => text && HR_WORDING.test(text),
    );
  const choose = (id: PackId) => {
    if (id === current) return;
    void action(
      () =>
        client.workspace(ws, "/pack", {
          method: "PATCH",
          body: JSON.stringify({ pack: id }),
        }),
      t("Workflow pack changed. Your accounts are kept."),
    );
  };
  return (
    <div className="bc-setup">
      <div className="bc-setup-main">
        <p className="bc-lead">
          {t("Choose a workflow pack, then confirm what Nabil may say.")}
        </p>

        <section className="bc-section" aria-labelledby="bc-pack">
          <h2 id="bc-pack">
            <span className="bc-step">1</span> {t("Workflow pack")}
          </h2>
          <div
            className="bc-pack-grid"
            role="radiogroup"
            aria-label={t("Workflow pack")}
          >
            {PACK_IDS.map((id) => {
              const selected = id === current;
              const text = id === "hr-services" && !selected ? null : PACK_TEXT[id];
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  className="bc-pack"
                  disabled={!isOwner || busy}
                  onClick={() => choose(id)}
                  data-pack={id}
                >
                  <span className="bc-pack-head">
                    <span className="bc-pack-title">
                      {selected ? (
                        <IconCheck size={16} />
                      ) : (
                        <IconBuilding size={16} />
                      )}
                      {PACKS[id].label[language]}
                    </span>
                    {selected && <Badge tone="ok" dot={false}>{t("Selected")}</Badge>}
                  </span>
                  {text && <span className="bc-caption">{t(text)}</span>}
                </button>
              );
            })}
          </div>
          <p className="bc-caption">
            {t(
              "Choose the questions and guidance that fit your business. Switching packs keeps your accounts.",
            )}
          </p>
          {packMismatch && (
            <p className="bc-caption bc-warning" role="status">
              {t(
                "Your company and offer don't mention HR. The B2B services pack will ask questions that fit better.",
              )}
            </p>
          )}
          {!isOwner && (
            <p className="bc-caption">
              {t("Only the workspace owner can change the workflow pack.")}
            </p>
          )}
          <div>
            <Button
              size="sm"
              aria-expanded={comparing}
              onClick={() => setComparing((open) => !open)}
            >
              {comparing
                ? t("Hide the comparison")
                : t("Compare discovery questions")}
            </Button>
          </div>
          {comparing && <PackCompare />}
        </section>

        <section className="bc-section" aria-labelledby="bc-offer">
          <h2 id="bc-offer">
            <span className="bc-step">2</span> {t("Approved offer")}
          </h2>
          {offers.length ? (
            <ul className="bc-rows">
              {offers.map((offer) => (
                <li key={offer.id}>
                  <span dir="auto">{offer.text}</span>
                  <Badge tone="ok" dot={false}>
                    {t("Approved")}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t("No approved offer yet")}
              text={t("Drafts and profiles can only claim an approved offer.")}
              action={
                <Button size="sm" onClick={() => onSection("messaging")}>
                  {t("Open messaging")}
                </Button>
              }
            />
          )}
        </section>

        <section className="bc-section" aria-labelledby="bc-proof">
          <h2 id="bc-proof">
            <span className="bc-step">3</span> {t("Approved proof")}
          </h2>
          {proofs.length ? (
            <ul className="bc-rows">
              {proofs.map((ref, index) => (
                <li key={`${ref.name}-${index}`}>
                  <span dir="auto">{ref.name}</span>
                  <Badge tone="ok" dot={false}>
                    {t("Approved")}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState
              title={t("No approved proof yet")}
              text={t(
                "Add a customer name and record permission before using it as social proof.",
              )}
              action={
                <Button size="sm" onClick={() => onSection("references")}>
                  {t("Open references")}
                </Button>
              }
            />
          )}
          <p className="bc-caption">
            {t(
              "Drafts and profiles cannot claim anything outside approved proof.",
            )}
          </p>
        </section>

        <CapabilityProfile />
      </div>

      <aside className="bc-setup-side" aria-label={t("Ready for first batch")}>
        <div className="bc-card">
          <header className="bc-compare-head">
            <h2>{t("Ready for first batch")}</h2>
            <Badge tone={ready ? "ok" : "warn"} dot={false}>
              {ready ? t("Ready") : t("Not ready")}
            </Badge>
          </header>
          <ul className="bc-checks">
            {checks.map((check) => (
              <li key={check.key} data-ok={check.ok}>
                <span className="bc-check-mark" aria-hidden>
                  {check.ok ? <IconCheck size={14} /> : null}
                </span>
                <span>
                  <strong>{check.title}</strong>
                  <span className="bc-caption" dir="auto">
                    {check.sub}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          <p className="bc-caption">
            {t(
              "Your first approved batch needs an offer, one proof item and a list of 50 to 200 accounts you already work.",
            )}
          </p>
          <Button onClick={() => setTab("Accounts")}>
            {t("Import another list")}
          </Button>
        </div>
      </aside>
    </div>
  );
}
