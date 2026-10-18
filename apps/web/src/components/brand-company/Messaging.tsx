"use client";
import { Button, Check, Field, Textarea } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";

// Company messaging: what Nabil is allowed to say. One form, one save.
export function Messaging({
  description,
  onDescription,
  proposedDescription,
  proposalSource,
}: {
  description: string;
  onDescription: (value: string) => void;
  proposedDescription?: string;
  proposalSource?: string;
}) {
  const { ws, data, busy, action } = useWorkspace();
  const { t } = usePrefs();
  const isOwner = data.role === "owner";
  const offers = data.workspace.offers;
  return (
    <div className="bc-stack">
      <form
        className="bc-form"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          const [first, ...rest] = offers;
          void action(
            () =>
              client.workspace(ws, "", {
                method: "PATCH",
                body: JSON.stringify({
                  company: {
                    description: f.get("description"),
                    icp: f.get("icp"),
                    marketingLicence: f.get("licence") === "on",
                  },
                  offers: [
                    {
                      id: first?.id ?? "growth",
                      text: f.get("offer"),
                      approved: f.get("offerApproved") === "on",
                    },
                    ...rest,
                  ],
                }),
              }),
            t("Company context saved. Existing approvals were invalidated."),
          );
        }}
      >
        <p className="bc-lead">
          {t("The context Nabil uses to prepare grounded work.")}
        </p>
        <Field label={t("What your company does")}>
          <Textarea
            name="description"
            dir="auto"
            rows={3}
            value={description}
            onChange={(e) => onDescription(e.target.value)}
          />
        </Field>
        <Field label={t("Ideal customer")}>
          <Textarea
            name="icp"
            dir="auto"
            rows={3}
            defaultValue={data.workspace.company.icp}
          />
        </Field>
        <Field label={t("Offer hypothesis")}>
          <Textarea
            name="offer"
            dir="auto"
            rows={3}
            defaultValue={offers[0]?.text}
            required
          />
        </Field>
        <Check
          name="offerApproved"
          label={t(
            "I reviewed this offer; it does not claim an unverified result",
          )}
          defaultChecked={offers[0]?.approved}
        />
        <Check
          name="licence"
          label={t("Egypt electronic marketing licence recorded")}
          defaultChecked={data.workspace.company.marketingLicence}
        />
        {!isOwner && (
          <p className="bc-caption">
            {t("Only the workspace owner can save company context.")}
          </p>
        )}
        <div>
          <Button
            type="submit"
            variant="primary"
            disabled={busy || !isOwner}
          >
            {t("Save company context")}
          </Button>
        </div>
      </form>

      {proposedDescription && (
        <section className="bc-proposal" aria-label={t("Website context proposal")}>
          <p className="eyebrow">{t("Proposal")}</p>
          <h2>{t("Website context proposal")}</h2>
          <p dir="auto" className="ai-text">
            {proposedDescription}
          </p>
          <p className="bc-caption">
            {t("Source")}: <bdi>{proposalSource}</bdi>.{" "}
            {t("Review this text before saving it as company context.")}
          </p>
          <div>
            <Button
              disabled={!isOwner}
              onClick={() => onDescription(proposedDescription)}
            >
              {t("Use proposal for review")}
            </Button>
          </div>
        </section>
      )}
    </div>
  );
}
