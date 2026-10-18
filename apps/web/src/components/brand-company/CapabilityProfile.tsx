"use client";
import type { ToolRequest } from "@revenue/contracts";
import { Badge, Button, EmptyState } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import type { Proposal } from "../Modals";
import { IconFileText } from "@revenue/ui";

const HOLDOUT_PERCENT = 20;

// Entry point for the brand-level capability profile (asset template "capability-profile").
// It uses the same quote, cost approval and run flow as every other deliverable.
export function CapabilityProfile() {
  const { ws, data, busy, canWrite, action, showProposal, openAsset } =
    useWorkspace();
  const { t } = usePrefs();
  const hasOffer = data.workspace.offers.some((o) => o.approved);
  const profiles = data.assets.filter(
    (a) => a.template === "capability-profile" && !a.prospectId,
  );
  const assignmentCounts = (assetId: string) => {
    const draftIds = new Set(
      data.drafts
        .filter((draft) => draft.assetId === assetId)
        .map((draft) => draft.id),
    );
    const assigned = data.sequences.filter(
      (sequence) => sequence.draftId && draftIds.has(sequence.draftId),
    );
    return {
      withProfile: assigned.filter((sequence) => !sequence.holdout).length,
      withoutProfile: assigned.filter((sequence) => sequence.holdout).length,
      total: assigned.length,
    };
  };
  const blocked = !canWrite || !hasOffer;
  const create = (lang: ToolRequest["language"]) =>
    action(async () => {
      const input: ToolRequest = {
        tool: "make_asset",
        requestKey: crypto.randomUUID(),
        prospectIds: [],
        draftIds: [],
        play: "P1",
        language: lang,
        template: "capability-profile",
        approvedSpend: false,
        holdoutPercent: HOLDOUT_PERCENT,
      };
      const quote = await client.workspace<Proposal["quote"]>(ws, "/quotes", {
        method: "POST",
        body: JSON.stringify(input),
      });
      showProposal({ input, quote });
    });
  return (
    <section className="bc-section" aria-labelledby="bc-capability">
      <h2 id="bc-capability">
        <span className="bc-step">4</span> {t("Capability profile")}
      </h2>
      <p className="bc-lead">
        {t(
          "A4 profile built only from your approved offer and references with recorded permission.",
        )}
      </p>
      <div className="badge-row">
        <Badge tone="neutral" dot={false}>
          {t("English")}
        </Badge>
        <Badge tone="neutral" dot={false}>
          {t("Arabic (RTL)")}
        </Badge>
      </div>
      <p className="bc-caption">
        {t(
          "Use a holdout group when you want to compare sequences with this profile to sequences without it. The comparison is optional; a single run does not establish a lift.",
        )}
      </p>
      {profiles.length ? (
        <ul className="bc-rows">
          {profiles.map((asset) => {
            const assignments = assignmentCounts(asset.id);
            return (
              <li key={asset.id}>
                <span className="bc-row-main">
                  <span className="bc-row-icon" aria-hidden>
                    <IconFileText size={16} />
                  </span>
                  <span>
                    <strong dir="auto">{asset.title}</strong>
                    <bdi className="bc-caption mono">
                      {asset.language} · v{asset.version ?? 1}
                    </bdi>
                  </span>
                </span>
                <span className="bc-row-actions">
                  {assignments.total === 0 ? (
                    <Badge tone="neutral" dot={false}>
                      {t("Holdout available")}
                    </Badge>
                  ) : (
                    <>
                      <Badge tone="info" dot={false}>
                        {t("With profile")} <bdi dir="ltr">{assignments.withProfile}</bdi>
                      </Badge>
                      <Badge tone="warn" dot={false}>
                        {t("Without profile")} <bdi dir="ltr">{assignments.withoutProfile}</bdi>
                      </Badge>
                    </>
                  )}
                  <Badge tone={asset.approvedAt ? "ok" : "warn"}>
                    {asset.approvedAt ? t("Approved") : t("Needs review")}
                  </Badge>
                  <Button size="sm" onClick={() => openAsset(asset)}>
                    {t("Open")}
                  </Button>
                </span>
              </li>
            );
          })}
        </ul>
      ) : (
        <EmptyState
          title={t("No capability profile yet")}
          text={t(
            hasOffer
              ? "Create one in English or Arabic. You review it before anything is attached to a draft."
              : "Approve an offer in Messaging first. The profile is built from approved claims only.",
          )}
        />
      )}
      <div className="button-row">
        <Button
          variant="primary"
          disabled={blocked || busy}
          onClick={() => void create("en")}
        >
          {t("Create English profile")}
        </Button>
        <Button
          disabled={blocked || busy}
          onClick={() => void create("ar")}
        >
          {t("Create Arabic profile")}
        </Button>
      </div>
      {!canWrite && (
        <p className="bc-caption">
          {t("Your role can view this but not create deliverables.")}
        </p>
      )}
    </section>
  );
}
