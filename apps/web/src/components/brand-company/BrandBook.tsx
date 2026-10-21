"use client";
import { useState } from "react";
import "../../styles/pages/accounts.css";
import { IconGlobe, IconPalette, IconSparkles } from "./icons";
import {
  Badge,
  Button,
  ErrorState,
  Field,
  Input,
  LoadingState,
} from "../primitives";
import { Modal } from "../accounts/Modal";
import { useWorkspace } from "../workspace-context";
import { usePrefs } from "../../lib/prefs";
import { client } from "../../lib/client";
import { brandVars, isHex } from "./color";
import { BrandImage } from "./BrandMedia";

export type BrandProposal = {
  name: string;
  primary: string | null;
  accent: string | null;
  logo: string | null;
  website: string;
};

function hostOf(url: string) {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

// Visual identity: the brand board, plus the website route that proposes a new brand kit.
export function BrandBook({
  proposal,
  onMessaging,
}: {
  proposal: BrandProposal | undefined;
  onMessaging: () => void;
}) {
  const { ws, data, busy, action, propose } = useWorkspace();
  const { t } = usePrefs();
  const [editing, setEditing] = useState(false);
  const isOwner = data.role === "owner";
  const canResearch = ["owner", "operator"].includes(data.role);
  const brand = data.workspace.brand;
  const kit = brand.media;
  const kitPrimary = kit?.logo ?? kit?.mark;
  const kitMark = kit?.logo && kit.mark ? kit.mark : undefined;
  const gallery = kit?.gallery ?? [];
  const palette = (brand.palette ?? []).filter(
    (color) =>
      ![brand.primary, brand.accent].some(
        (base) => base.toLowerCase() === color.toLowerCase(),
      ),
  );
  const direction = [brand.visualDirection, brand.photoDirection].filter(
    (text, index, all): text is string => Boolean(text) && all.indexOf(text) === index,
  );
  const offer = data.workspace.offers.find((o) => o.approved)?.text;
  const description = data.workspace.company.description;
  const tagline = description || hostOf(brand.website);
  const latestOnboard = data.runs.find((r) => r.tool === "onboard");
  const reading =
    latestOnboard && ["queued", "running"].includes(latestOnboard.state);
  const failed = latestOnboard?.state === "failed";
  return (
    <div className="bc-stack">
      <div className="bc-toolbar">
        <p className="bc-lead">
          {t("Your identity, together in one place.")}
        </p>
        <div className="button-row">
          <Button variant="secondary" onClick={onMessaging}>
            {t("Messaging")}
          </Button>
          <Button
            variant="primary"
            aria-haspopup="dialog"
            onClick={() => setEditing(true)}
          >
            {t("Update brand")}
          </Button>
        </div>
      </div>

      {editing && (
        <Modal
          title={t("Bring your brand into Caravan")}
          subtitle={t(
            "You review the proposed brand before it is used in new deliverables.",
          )}
          onClose={() => setEditing(false)}
        >
          <div className="bc-update-grid">
            <form
              className="bc-option"
              onSubmit={(e) => {
                e.preventDefault();
                void propose(
                  "onboard",
                  [],
                  String(new FormData(e.currentTarget).get("url")),
                );
              }}
            >
              <span className="bc-option-icon" aria-hidden>
                <IconGlobe size={18} />
              </span>
              <h3>{t("Use your website")}</h3>
              <p className="bc-caption">
                {t(
                  "Find your logo, colors and company messaging from your website.",
                )}
              </p>
              <Field label={t("Website URL")}>
                <Input
                  name="url"
                  type="url"
                  required
                  placeholder="https://"
                  dir="ltr"
                  defaultValue={brand.website}
                />
              </Field>
              <div>
                <Button
                  type="submit"
                  variant="ai"
                  startIcon={<IconSparkles size={14} />}
                  disabled={busy || !canResearch}
                >
                  {t("Review website research")}
                </Button>
              </div>
              <p className="bc-caption">
                {t(
                  "Website text is untrusted research. A person reviews it before it becomes approved company context.",
                )}
              </p>
            </form>

            <form
              className="bc-option"
              onSubmit={(e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const name = String(f.get("name"));
                const brandName = String(f.get("brand"));
                const website = String(f.get("website"));
                const primary = String(f.get("primary"));
                // Send only what changed. Media is never sent, so the saved kit survives.
                const nameChanged = name !== data.workspace.name;
                const brandChanged =
                  brandName !== brand.name ||
                  website !== brand.website ||
                  primary.toLowerCase() !== brand.primary.toLowerCase();
                let saved = false;
                void action(
                  async () => {
                    if (nameChanged || brandChanged)
                      await client.workspace(ws, "", {
                        method: "PATCH",
                        body: JSON.stringify({
                          ...(nameChanged ? { name } : {}),
                          ...(brandChanged
                            ? {
                                brand: {
                                  name: brandName,
                                  website,
                                  primary,
                                  accent: brand.accent,
                                  ...(brand.logo ? { logo: brand.logo } : {}),
                                },
                              }
                            : {}),
                        }),
                      });
                    saved = true;
                  },
                  brandChanged
                    ? t("Brand kit saved. Existing approvals were invalidated.")
                    : nameChanged
                      ? t("Workspace name saved.")
                      : t("Brand details are up to date. No changes to save."),
                ).then(() => saved && setEditing(false));
              }}
            >
              <span className="bc-option-icon" aria-hidden>
                <IconPalette size={18} />
              </span>
              <h3>{t("Company and brand")}</h3>
              <div className="form-grid two">
                <Field label={t("Workspace name")}>
                  <Input name="name" defaultValue={data.workspace.name} required />
                </Field>
                <Field label={t("Brand name")}>
                  <Input name="brand" defaultValue={brand.name} required />
                </Field>
                <Field label={t("Website")}>
                  <Input
                    name="website"
                    type="url"
                    dir="ltr"
                    defaultValue={brand.website}
                    required
                  />
                </Field>
                <Field label={t("Brand color")}>
                  <span className="color-field">
                    <span
                      className="swatch"
                      style={{ background: brand.primary }}
                      aria-hidden
                    />
                    <Input
                      name="primary"
                      dir="ltr"
                      defaultValue={brand.primary}
                      pattern="#[0-9a-fA-F]{6}"
                      required
                    />
                  </span>
                </Field>
              </div>
              <div>
                <Button
                  type="submit"
                  variant="primary"
                  disabled={busy || !isOwner}
                >
                  {t("Save brand")}
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      <div className="bc-board" data-ai-target="brand-board">
        <article className="bc-card bc-hero" style={brandVars(brand.primary)}>
          <h2 dir="auto">{brand.name}</h2>
          <p dir="auto">{tagline}</p>
        </article>
        <article className="bc-card">
          <h3>{t("Color palette")}</h3>
          <ul className="bc-palette">
            {[
              [t("Primary"), brand.primary],
              [t("Accent"), brand.accent],
              ...palette.map((color) => [t("Palette color"), color]),
            ]
              .filter(([, color]) => isHex(color))
              .map(([label, color]) => (
                <li key={`${label}${color}`}>
                  <span
                    className="bc-swatch"
                    style={{ background: color }}
                    aria-hidden
                  />
                  <span className="bc-swatch-label">{label}</span>
                  <bdi className="mono bc-swatch-hex">{color}</bdi>
                </li>
              ))}
          </ul>
          <p className="bc-caption">{t("Primary and supporting colors")}</p>
        </article>
        <article className="bc-card">
          <h3>{t("Typography")}</h3>
          <p className="bc-type-latin" lang="en" dir="ltr">
            Aa
          </p>
          <p className="bc-caption">Inter · {t("Heading and body")}</p>
          <p className="bc-type-arabic" lang="ar" dir="rtl">
            ناس أولاً
          </p>
          <p className="bc-caption">
            IBM Plex Sans Arabic · {t("Arabic type")}
          </p>
        </article>
        <article className="bc-card">
          <h3>{t("In an email")}</h3>
          <div className="bc-email" style={brandVars(brand.primary)}>
            <p className="bc-email-brand" dir="auto">
              {brand.name}
            </p>
            <p className="bc-email-headline" dir="auto">
              {offer ?? description ?? brand.name}
            </p>
            <span className="bc-email-button">{t("Learn more")}</span>
          </div>
          <p className="bc-caption">
            {t("Preview built from your brand and approved offer")}
          </p>
        </article>
        {kitPrimary && (
          <article className="bc-card">
            <h3>{kitMark ? t("Logo and mark") : t("Logo")}</h3>
            <div className="bc-logos">
              <BrandImage media={kitPrimary} className="is-logo" />
              {kitMark && <BrandImage media={kitMark} className="is-logo" />}
            </div>
            <p className="bc-caption">{t("Saved with this client's brand kit")}</p>
          </article>
        )}
        {direction.length > 0 && (
          <article className="bc-card">
            <h3>{t("Visual direction")}</h3>
            {direction.map((text) => (
              <p key={text} className="bc-direction" dir="auto">
                {text}
              </p>
            ))}
          </article>
        )}
      </div>

      {gallery.length > 0 && (
        <section className="bc-card bc-gallery" aria-label={t("Client brand gallery")}>
          <h3>{t("Client brand gallery")}</h3>
          <ul className="bc-gallery-grid">
            {gallery.map((media) => (
              <li key={media.id}>
                <BrandImage media={media} className="is-gallery" />
              </li>
            ))}
          </ul>
          <p className="bc-caption">
            {t("Imagery for this client's deliverables, not their prospects.")}
          </p>
        </section>
      )}

      {reading && (
        <LoadingState
          title={t("Reading your website")}
          caption={t(
            "This takes a moment. Progress is saved if you leave this page.",
          )}
          rows={3}
        />
      )}
      {failed && !reading && (
        <ErrorState
          title={t("We couldn’t read that website")}
          message={
            latestOnboard?.error ??
            t("Check the address and try again. Nothing was changed.")
          }
        />
      )}

      {proposal && !reading && (
        <section className="bc-proposal" aria-label={t("Brand kit from website")}>
          <div className="bc-proposal-head">
            <div>
              <p className="eyebrow">{t("Brand kit from website")}</p>
              <h2 dir="auto">{proposal.name}</h2>
            </div>
            <Button
              variant="primary"
              disabled={!isOwner || busy || !proposal.primary}
              onClick={() =>
                void action(
                  () =>
                    client.workspace(ws, "", {
                      method: "PATCH",
                      body: JSON.stringify({
                        brand: {
                          name: proposal.name,
                          website: proposal.website,
                          primary: proposal.primary,
                          accent: proposal.accent ?? brand.accent,
                          ...(proposal.logo ? { logo: proposal.logo } : {}),
                        },
                      }),
                    }),
                  t("Brand kit saved. Existing approvals were invalidated."),
                )
              }
            >
              {t("Use this brand kit")}
            </Button>
          </div>
          <div className="bc-proposal-body">
            <article
              className="bc-card bc-hero"
              style={brandVars(proposal.primary)}
            >
              <h2 dir="auto">{proposal.name}</h2>
              <p dir="auto">{hostOf(proposal.website)}</p>
            </article>
            <ul className="bc-rows">
              {[
                {
                  key: "logo",
                  title: t("Logo"),
                  sub: proposal.logo
                    ? hostOf(proposal.logo)
                    : t("No logo found on the page"),
                  found: Boolean(proposal.logo),
                },
                {
                  key: "primary",
                  title: t("Primary color"),
                  sub: proposal.primary ?? t("Not found, pick one by hand"),
                  found: Boolean(proposal.primary),
                },
                {
                  key: "accent",
                  title: t("Accent color"),
                  sub: proposal.accent ?? t("Not found, the current one stays"),
                  found: Boolean(proposal.accent),
                },
              ].map((row) => (
                <li key={row.key}>
                  <span>
                    <strong>{row.title}</strong>
                    <bdi className="bc-caption mono">{row.sub}</bdi>
                  </span>
                  <Badge tone={row.found ? "ok" : "warn"}>
                    {row.found ? t("Extracted") : t("Review")}
                  </Badge>
                </li>
              ))}
            </ul>
          </div>
          <p className="bc-caption">
            {t(
              "Colours and name were read from the website. Review before using them on assets.",
            )}
          </p>
        </section>
      )}
    </div>
  );
}
