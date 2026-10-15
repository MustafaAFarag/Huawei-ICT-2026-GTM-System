"use client";
import { useState } from "react";
import { IconSparkles } from "@revenue/ui";
import { Button, Check, Field, Input, Panel, Textarea } from "../primitives";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";

import { ReferenceLibrary, SdrKit } from "../ReferenceLibrary";

export function ContextForm() {
  const { ws, data, busy, action, propose } = useWorkspace();
  const { t } = usePrefs();
  const [description, setDescription] = useState(
    data.workspace.company.description,
  );
  const onboarding = data.runs.find(
    (r) => r.tool === "onboard" && r.state === "succeeded",
  )?.output as
    | {
        proposedDescription?: string;
        website?: string;
        brand?: {
          name: string;
          primary: string | null;
          accent: string | null;
          logo: string | null;
          website: string;
        };
      }[]
    | undefined;
  const brand = onboarding?.[0]?.brand;
  const isOwner = data.role === "owner";
  return (
    <div className="detail-grid">
      <form
        className="detail-main"
        onSubmit={(e) => {
          e.preventDefault();
          const f = new FormData(e.currentTarget);
          void action(
            () =>
              client.workspace(ws, "", {
                method: "PATCH",
                body: JSON.stringify({
                  name: f.get("name"),
                  company: {
                    description: f.get("description"),
                    icp: f.get("icp"),
                    marketingLicence: f.get("licence") === "on",
                  },
                  brand: {
                    name: f.get("brand"),
                    website: f.get("website"),
                    primary: f.get("primary"),
                    accent: data.workspace.brand.accent || "#6B7365",
                  },
                  offers: [
                    {
                      id: "growth",
                      text: f.get("offer"),
                      approved: f.get("offerApproved") === "on",
                    },
                  ],
                }),
              }),
            t("Company context saved. Existing approvals were invalidated."),
          );
        }}
      >
        <Panel eyebrow={t("Brand kit")} title={t("Company and brand")}>
          <div className="form-grid two">
            <Field label={t("Workspace name")}>
              <Input name="name" defaultValue={data.workspace.name} required />
            </Field>
            <Field label={t("Brand name")}>
              <Input
                name="brand"
                defaultValue={data.workspace.brand.name}
                required
              />
            </Field>
            <Field label={t("Website")}>
              <Input
                name="website"
                type="url"
                defaultValue={data.workspace.brand.website}
                required
              />
            </Field>
            <Field label={t("Brand color")}>
              <span className="color-field">
                <span
                  className="swatch"
                  style={{ background: data.workspace.brand.primary }}
                  aria-hidden
                />
                <Input
                  name="primary"
                  defaultValue={data.workspace.brand.primary}
                  pattern="#[0-9a-fA-F]{6}"
                  required
                />
              </span>
            </Field>
          </div>
        </Panel>
        <Panel
          eyebrow={t("Positioning")}
          title={t("What you sell and to whom")}
        >
          <div className="stack">
            <Field label={t("What your company does")}>
              <Textarea
                name="description"
                dir="auto"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
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
                defaultValue={data.workspace.offers[0]?.text}
                required
              />
            </Field>
            <Check
              name="offerApproved"
              label={t(
                "I reviewed this offer; it does not claim an unverified result",
              )}
              defaultChecked={data.workspace.offers[0]?.approved}
            />
            <Check
              name="licence"
              label={t("Egypt electronic marketing licence recorded")}
              defaultChecked={data.workspace.company.marketingLicence}
            />
            <div>
              <Button
                type="submit"
                variant="primary"
                disabled={busy || !isOwner}
              >
                {t("Save company context")}
              </Button>
            </div>
          </div>
        </Panel>
      </form>
      <aside className="detail-side">
        <SdrKit />
        <ReferenceLibrary />
        <Panel
          eyebrow={t("AI research")}
          title={t("Suggest context from website")}
        >
          <form
            className="stack"
            onSubmit={(e) => {
              e.preventDefault();
              void propose(
                "onboard",
                [],
                String(new FormData(e.currentTarget).get("url")),
              );
            }}
          >
            <Field label={t("Website URL")}>
              <Input name="url" type="url" required placeholder="https://" />
            </Field>
            <Button
              type="submit"
              variant="ai"
              startIcon={<IconSparkles size={14} />}
              disabled={busy || !["owner", "operator"].includes(data.role)}
            >
              {t("Review website research")}
            </Button>
            <p className="muted small">
              {t(
                "Website text is untrusted research. A person reviews it before it becomes approved company context.",
              )}
            </p>
          </form>
        </Panel>
        {brand && (
          <Panel eyebrow={t("Brand kit from website")} title={brand.name}>
            <div className="brand-proposal">
              {[brand.primary, brand.accent].filter(Boolean).map((color) => (
                <span key={color} className="brand-chip">
                  <span
                    className="swatch"
                    style={{ background: color! }}
                    aria-hidden
                  />
                  <bdi className="mono">{color}</bdi>
                </span>
              ))}
              {brand.logo && (
                <bdi className="mono muted small truncate" title={brand.logo}>
                  {new URL(brand.logo).hostname}
                </bdi>
              )}
            </div>
            <p className="muted small">
              {t(
                "Colours and name were read from the website. Review before using them on assets.",
              )}
            </p>
            <Button
              disabled={!isOwner || busy || !brand.primary}
              onClick={() =>
                void action(
                  () =>
                    client.workspace(ws, "", {
                      method: "PATCH",
                      body: JSON.stringify({
                        brand: {
                          name: brand.name,
                          website: brand.website,
                          primary: brand.primary,
                          accent: brand.accent ?? data.workspace.brand.accent,
                          ...(brand.logo ? { logo: brand.logo } : {}),
                        },
                      }),
                    }),
                  t("Brand kit saved. Existing approvals were invalidated."),
                )
              }
            >
              {t("Use this brand kit")}
            </Button>
          </Panel>
        )}
        {onboarding?.[0]?.proposedDescription && (
          <Panel eyebrow={t("Proposal")} title={t("Website context proposal")}>
            <p dir="auto" className="ai-text">
              {onboarding[0].proposedDescription}
            </p>
            <p className="muted small">
              {t("Source")}: <bdi>{onboarding[0].website}</bdi>.{" "}
              {t("Review this text before saving it as company context.")}
            </p>
            <Button
              disabled={!isOwner}
              onClick={() => setDescription(onboarding[0].proposedDescription!)}
            >
              {t("Use proposal for review")}
            </Button>
          </Panel>
        )}
      </aside>
    </div>
  );
}
