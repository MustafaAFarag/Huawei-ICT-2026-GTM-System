"use client";
import { useState } from "react";
import { IconClock } from "@revenue/ui";
import { Badge, Button, Empty, toneFor } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import { BackLink, ListRow, SubTabs } from "../campaigns/parts";
import { Scorecard } from "../campaigns/Scorecard";
import { ExportBatches } from "../ExportBatches";
import "../../styles/pages/campaigns.css";

type Section = "sequences" | "results" | "export";
// The dashboard rows carry the touch day too; the shared type only declares what older code used.
type Step = { channel: string; body: string; state: string; day?: number };

export function Sequences() {
  const { data, setTab } = useWorkspace();
  const { t } = usePrefs();
  const [section, setSection] = useState<Section>("sequences");
  const [batch, setBatch] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const openScorecard = (batchId: string) => {
    setBatch(batchId);
    setSection("results");
  };
  return (
    <div className="cmp-page">
      <SubTabs
        label={t("Sequence sections")}
        value={section}
        onChange={(next) => {
          if (next !== "results") setBatch("");
          setSection(next);
        }}
        tabs={[
          { id: "sequences", label: t("Sequences") },
          { id: "results", label: t("Results") },
          { id: "export", label: t("Export and outcomes") },
        ]}
      />
      {section === "sequences" &&
        (openId && data.sequences.some((s) => s.id === openId) ? (
          <SequenceDetail id={openId} onBack={() => setOpenId(null)} />
        ) : !data.sequences.length ? (
          <Empty
            title={t("No sequences prepared yet")}
            icon={<IconClock size={18} />}
            action={
              <Button variant="primary" onClick={() => setTab("Review queue")}>
                {t("Open review queue")}
              </Button>
            }
          >
            {t(
              "Approve every touch, run sender pre-flight, and resolve country and consent holds before preparing a sequence.",
            )}
          </Empty>
        ) : (
          <section className="cmp-section" aria-label={t("Sequences")}>
            <div className="cmp-list">
              {data.sequences.map((s) => {
                const prospect = data.prospects.find(
                  (p) => p.id === s.prospectId,
                );
                const owner = data.members.find(
                  (m) => m.userId === prospect?.ownerId,
                )?.user.name;
                return (
                  <ListRow
                    key={s.id}
                    title={<span dir="auto">{prospect?.snapshot.company}</span>}
                    sub={
                      <>
                        <span dir="auto">
                          {prospect?.snapshot.firstName}{" "}
                          {prospect?.snapshot.lastName}
                        </span>{" "}
                        · {s.steps.length} {t("touches")}
                        {owner && (
                          <>
                            {" "}
                            · <span dir="auto">{owner}</span>
                          </>
                        )}
                      </>
                    }
                    trail={<Badge tone={toneFor(s.state)}>{s.state}</Badge>}
                    onOpen={() => setOpenId(s.id)}
                  />
                );
              })}
            </div>
            <p className="muted small">
              {t(
                "Prepared sequences stay paused until their sending requirements are satisfied.",
              )}
            </p>
          </section>
        ))}
      {section === "results" && (
        <Scorecard key={batch || "all"} initialBatch={batch} />
      )}
      {section === "export" && <ExportBatches onOpenScorecard={openScorecard} />}
    </div>
  );
}

function SequenceDetail({ id, onBack }: { id: string; onBack: () => void }) {
  const { ws, data, canWrite, busy, action, setProspect } = useWorkspace();
  const { t } = usePrefs();
  const s = data.sequences.find((x) => x.id === id)!;
  const prospect = data.prospects.find((p) => p.id === s.prospectId);
  const draft = data.drafts.find((d) => d.id === s.draftId);
  const profile = data.assets.find(
    (a) => a.id === draft?.assetId && a.template === "capability-profile",
  );
  return (
    <section className="cmp-section" aria-label={t("Sequence detail")}>
      <BackLink onClick={onBack}>{t("All sequences")}</BackLink>
      <div className="cmp-chips">
        <Badge tone={toneFor(s.state)}>{s.state}</Badge>
        <Badge tone={s.holdout ? "warn" : "info"} dot={false}>
          {s.holdout
            ? t("No asset · holdout assignment")
            : t("Asset group assignment")}
        </Badge>
        {profile && (
          <Badge tone={s.holdout ? "warn" : "info"} dot={false}>
            {s.holdout
              ? t("Holdout · profile withheld")
              : t("Capability profile attached")}
          </Badge>
        )}
      </div>
      <h2 className="cmp-heading" dir="auto">
        {prospect?.snapshot.company} · {prospect?.snapshot.firstName}{" "}
        {prospect?.snapshot.lastName}
      </h2>
      <ol className="cmp-touches">
        {(s.steps as Step[]).map((step, i) => (
          <li key={i} className="cmp-touch">
            <span className="cmp-step-index mono" aria-hidden>
              {i + 1}
            </span>
            <div className="cmp-touch-body">
              <strong>
                {step.day !== undefined
                  ? `${t("Day")} ${step.day} · `
                  : `${t("Touch")} ${i + 1} · `}
                {step.channel}
              </strong>
              <p dir="auto">{step.body}</p>
            </div>
            <Badge tone={toneFor(step.state)}>{step.state}</Badge>
          </li>
        ))}
      </ol>
      <div className="button-row">
        {prospect && (
          <Button variant="primary" onClick={() => setProspect(prospect)}>
            {t("Open account")}
          </Button>
        )}
        {data.fixture && (
          <Button
            disabled={!canWrite || busy || s.state === "cancelled"}
            onClick={() =>
              void action(
                () =>
                  client.workspace(ws, "/events/simulate", {
                    method: "POST",
                    body: JSON.stringify({
                      id: crypto.randomUUID(),
                      sequenceId: s.id,
                      kind: "replied",
                      occurredAt: new Date().toISOString(),
                    }),
                  }),
                t(
                  "Simulated reply recorded. Remaining touches across plays are cancelled.",
                ),
              )
            }
          >
            {t("Record simulated reply")}
          </Button>
        )}
        <Button
          variant="danger"
          disabled={!canWrite || busy}
          onClick={() =>
            void action(
              () =>
                client.workspace(ws, "/suppressions", {
                  method: "POST",
                  body: JSON.stringify({
                    identity: prospect?.snapshot.email,
                    reason: "User-recorded opt-out",
                  }),
                }),
              t(
                "Contact suppressed. Future touches across plays are cancelled.",
              ),
            )
          }
        >
          {t("Record opt-out")}
        </Button>
      </div>
    </section>
  );
}
