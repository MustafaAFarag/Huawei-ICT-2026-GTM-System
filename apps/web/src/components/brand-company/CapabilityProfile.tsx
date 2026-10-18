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
        <span
          title={t(
            "Ships with an asset-vs-no-asset holdout: a share of sequences go out without this profile.",
          )}
        >
          <Badge tone="info">{t("In holdout test: asset vs no asset")}</Badge>
        </span>
        <Badge tone="neutral" dot={false}>
          {t("English")}
        </Badge>
        <Badge tone="neutral" dot={false}>
          {t("Arabic (RTL)")}
        </Badge>
      </div>
      <p className="bc-caption">
        {t(
          "About one in five sequences goes out without the profile so the effect can be measured. No lift is claimed from a single run.",
        )}
      </p>
      {profiles.length ? (
        <ul className="bc-rows">
          {profiles.map((asset) => (
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
                <span
                  title={t(
                    "Ships with an asset-vs-no-asset holdout: a share of sequences go out without this profile.",
                  )}
                >
                  <Badge tone="info">{t("Holdout test")}</Badge>
                </span>
                <Badge tone={asset.approvedAt ? "ok" : "warn"}>
                  {asset.approvedAt ? t("Approved") : t("Needs review")}
                </Badge>
                <Button size="sm" onClick={() => openAsset(asset)}>
                  {t("Open")}
                </Button>
              </span>
            </li>
          ))}
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
