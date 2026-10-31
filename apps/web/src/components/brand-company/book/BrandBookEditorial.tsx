"use client";
import type { CSSProperties, ReactNode } from "react";
import type { BrandMediaRef } from "@revenue/contracts";
import "@fontsource/readex-pro/300.css";
import "@fontsource/readex-pro/500.css";
import "@fontsource/readex-pro/700.css";
import "@fontsource/rubik/500.css";
import "@fontsource/rubik/800.css";
import "@fontsource/rubik/900.css";
import "@fontsource/alexandria/500.css";
import "@fontsource/alexandria/700.css";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/700.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/700.css";
import "../../../styles/pages/brandbook.css";
import { useWorkspace } from "../../workspace-context";
import { usePrefs } from "../../../lib/prefs";
import { BrandImage } from "../BrandMedia";
import { contrast, rgbOf } from "../color";
import { bookCopy, type BookCopy } from "./copy";
import { MotifArt, Rings } from "./MotifArt";
import { Applications } from "./Applications";
import {
  bookVars,
  directionParts,
  motifOf,
  pickImages,
  positioning,
  readableOn,
  rolesOf,
  type BookRole,
} from "./style";

type ChapterId = keyof BookCopy["chapters"];
const CHAPTERS: ChapterId[] = [
  "story",
  "logo",
  "colour",
  "type",
  "motif",
  "imagery",
  "caravan",
  "rules",
];
const RATIO: Record<string, number> = {
  neutral: 55,
  primary: 25,
  tertiary: 12,
  secondary: 8,
};

const Img = ({
  media,
  className = "",
}: {
  media?: BrandMediaRef;
  className?: string;
}) => (media ? <BrandImage media={media} className={className} /> : null);

function Title({ parts }: { parts: [string, string, string] }) {
  return (
    <>
      {parts[0]}
      <em>{parts[1]}</em>
      {parts[2]}
    </>
  );
}

function Chapter({
  id,
  copy,
  tone = "paper",
  children,
}: {
  id: ChapterId;
  copy: BookCopy;
  tone?: "paper" | "block" | "neutral";
  children: ReactNode;
}) {
  const n = String(CHAPTERS.indexOf(id) + 1).padStart(2, "0");
  return (
    <section
      id={`bb-${id}`}
      className={`bb-chapter is-${tone}`}
      aria-labelledby={`bb-${id}-title`}
    >
      <header className="bb-ch-head">
        <span className="bb-ch-num" aria-hidden>
          {n}
        </span>
        <div>
          <h2 id={`bb-${id}-title`}>
            <Title parts={copy.chapters[id]} />
          </h2>
          <p>{copy.leads[id]}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

function Swatches({ roles, copy }: { roles: BookRole[]; copy: BookCopy }) {
  const total = roles.reduce((sum, r) => sum + (RATIO[r.key] ?? 10), 0);
  return (
    <>
      <div className="bb-swatches">
        {roles.map((role) => (
          <div
            key={role.key}
            className="bb-swatch"
            style={{
              background: role.hex,
              color: readableOn(role.hex),
              flexGrow: RATIO[role.key] ?? 10,
            }}
          >
            <span className="bb-swatch-role">{copy.roles[role.key]}</span>
            <span className="bb-swatch-name" dir="auto">
              {role.name}
            </span>
            <span className="bb-swatch-codes">
              <bdi>{role.hex.toUpperCase()}</bdi>
              <bdi>RGB {rgbOf(role.hex)}</bdi>
            </span>
          </div>
        ))}
      </div>
      <div className="bb-ratio" aria-label={copy.ratio}>
        <span className="bb-label">{copy.ratio}</span>
        <div className="bb-ratio-bar">
          {roles.map((role) => (
            <span
              key={role.key}
              style={{
                background: role.hex,
                color: readableOn(role.hex),
                flexBasis: `${((RATIO[role.key] ?? 10) / total) * 100}%`,
              }}
            >
              {Math.round(((RATIO[role.key] ?? 10) / total) * 100)}%
            </span>
          ))}
        </div>
      </div>
      {roles.some((r) => r.tints.length) && (
        <div className="bb-tints">
          <span className="bb-label">{copy.tints}</span>
          {roles.map((role) => (
            <div key={role.key} className="bb-tint-row">
              <span className="bb-tint-name">{copy.roles[role.key]}</span>
              <ol>
                {role.tints.map(([step, hex]) => (
                  <li
                    key={step}
                    style={{ background: hex, color: readableOn(hex) }}
                    title={hex}
                  >
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function Pairings({
  pairs,
  copy,
}: {
  pairs: [string, string][];
  copy: BookCopy;
}) {
  return (
    <div className="bb-pairs">
      <span className="bb-label">{copy.pairings}</span>
      <ul>
        {pairs.map(([fg, bg]) => {
          const ratio = contrast(fg, bg);
          const status =
            ratio >= 4.5 ? copy.pass : ratio >= 3 ? copy.passLarge : copy.fail;
          return (
            <li key={`${fg}${bg}`} style={{ background: bg, color: fg }}>
              <span className="bb-pair-aa">Aa</span>
              <span className="bb-pair-meta">
                <bdi>{ratio.toFixed(1)} : 1</bdi>
                <span>{status}</span>
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function BrandBookEditorial() {
  const { ws, data } = useWorkspace();
  const { language } = usePrefs();
  const copy = bookCopy(language === "ar" ? "ar" : "en");
  const brand = data.workspace.brand;
  const kit = brand.media;
  const variants = kit?.variants ?? [];
  const variant = (part: string) =>
    variants.find((m) => m.id.endsWith(`${part}-2x`)) ??
    variants.find((m) => m.id.includes(part));
  const logoLight = kit?.logo ?? variant("lockup-en-light");
  const logoDark = variant("lockup-en-dark") ?? logoLight;
  const arLight = variant("lockup-ar-light");
  const arDark = variant("lockup-ar-dark");
  const mark = kit?.mark ?? variant("symbol");
  const markDark = variant("symbol-dark") ?? mark;
  const roles = rolesOf(brand);
  const vars = bookVars(brand, roles);
  const motif = motifOf(brand);
  const parts = directionParts(brand);
  const img = pickImages(kit?.gallery ?? []);
  const ar = language === "ar";
  const nameShown = ar ? (brand.nameAr ?? brand.name) : brand.name;
  const nameOther = ar ? brand.name : brand.nameAr;
  const pos = positioning(data.workspace.company.description || brand.name);
  const offer = data.workspace.offers.find((o) => o.approved)?.text ?? pos;
  const icp = data.workspace.company.icp;
  const v = vars as Record<string, string>;
  const pairs: [string, string][] = [
    [v["--bb-ink"], v["--bb-paper"]],
    [v["--bb-paper"], v["--bb-block"]],
    [v["--bb-highlight"], v["--bb-block"]],
    [v["--bb-highlight"], v["--bb-paper"]],
  ];
  const date = new Intl.DateTimeFormat(ar ? "ar" : "en", {
    month: "long",
    year: "numeric",
  }).format(new Date());
  const go = (id: ChapterId) =>
    document
      .getElementById(`bb-${id}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  // While switching workspaces the id changes before the data does; wait so images match their workspace.
  if (data.workspace.id !== ws) return null;

  return (
    <article
      className={`bb is-${motif}`}
      style={vars}
      data-ai-target="brand-board"
      aria-label={`${brand.name} ${copy.edition}`}
    >
      <header className="bb-cover">
        <div className="bb-cover-panel">
          <span className="bb-clip">
            <MotifArt
              kind={motif}
              color="var(--bb-highlight)"
              className="bb-cover-motif"
            />
          </span>
          <div className="bb-cover-top">
            <Img media={markDark} className="bb-cover-mark" />
            <span>{copy.edition}</span>
          </div>
          <h1
            className="bb-cover-name"
            dir="auto"
            style={
              {
                "--bb-name-chars": Math.max(
                  4,
                  ...nameShown.split(/\s+/).map((word) => word.length),
                ),
              } as CSSProperties
            }
          >
            {nameShown}
          </h1>
          {nameOther && (
            <p className="bb-cover-alt" dir="auto">
              {nameOther}
            </p>
          )}
          <p className="bb-cover-pos" dir="auto">
            {pos}
          </p>
          <div className="bb-cover-foot">
            <span>{copy.prepared}</span>
            <span>{date}</span>
          </div>
        </div>
        <div className="bb-cover-art">
          <Img media={img.cover} />
        </div>
        {img.object && (
          <div className="bb-cover-circle">
            <Img media={img.object} />
          </div>
        )}
      </header>

      <nav className="bb-contents" aria-label={copy.contents}>
        <span className="bb-label">{copy.contents}</span>
        <ol>
          {CHAPTERS.map((id, i) => (
            <li key={id}>
              <button type="button" onClick={() => go(id)}>
                <span>{String(i + 1).padStart(2, "0")}</span>
                {copy.short[id]}
              </button>
            </li>
          ))}
        </ol>
      </nav>

      <Chapter id="story" copy={copy}>
        <div className="bb-story">
          <div className="bb-story-text">
            {parts.mood && (
              <p className="bb-statement" dir="auto">
                {parts.mood}.
              </p>
            )}
            <p className="bb-story-pos" dir="auto">
              {pos}
            </p>
            <dl className="bb-facts">
              {parts.mood && (
                <div>
                  <dt>{copy.mood}</dt>
                  <dd dir="auto">{parts.mood}</dd>
                </div>
              )}
              {parts.motif && (
                <div>
                  <dt>{copy.motifLabel}</dt>
                  <dd dir="auto">{parts.motif}</dd>
                </div>
              )}
              {brand.photoDirection && (
                <div>
                  <dt>{copy.photography}</dt>
                  <dd dir="auto">{brand.photoDirection}</dd>
                </div>
              )}
              {icp && (
                <div>
                  <dt>{copy.audience}</dt>
                  <dd dir="auto">{icp}</dd>
                </div>
              )}
            </dl>
          </div>
          <div className="bb-story-visual">
            <span className="bb-clip">
              <Rings className="bb-story-rings" color="var(--bb-on-block)" />
            </span>
            <Img media={img.heroes[0] ?? img.scene} className="bb-story-img" />
            <div className="bb-story-card">
              <span className="bb-pill">{copy.offer}</span>
              <p dir="auto">{offer}</p>
            </div>
          </div>
        </div>
      </Chapter>

      <Chapter id="logo" copy={copy} tone="neutral">
        <div className="bb-logo-grid">
          <div className="bb-logo-tile is-hero is-paper">
            <div className="bb-clear">
              <Img media={logoLight} className="is-lockup" />
            </div>
            <p className="bb-tile-note">
              <strong>{copy.clearSpace}</strong> {copy.clearSpaceNote}
            </p>
          </div>
          <div className="bb-logo-tile is-block">
            <Img media={logoDark} className="is-lockup" />
            <span className="bb-tile-label">{copy.onDark}</span>
          </div>
          {arLight && (
            <div className="bb-logo-tile is-paper">
              <Img media={arLight} className="is-lockup" />
              <span className="bb-tile-label">{copy.arabic}</span>
            </div>
          )}
          <div className="bb-logo-tile is-highlight">
            <Img media={mark} className="is-symbol" />
            <span className="bb-tile-label">{copy.symbol}</span>
          </div>
          {arDark && (
            <div className="bb-logo-tile is-ink">
              <Img media={arDark} className="is-lockup" />
              <span className="bb-tile-label">
                {copy.arabic} · {copy.onDark}
              </span>
            </div>
          )}
        </div>
        <div className="bb-logo-rules">
          <div className="bb-minsize">
            <span className="bb-label">{copy.minSize}</span>
            <div className="bb-minsize-row">
              <Img media={logoLight} className="is-lockup is-min" />
              <Img media={mark} className="is-symbol is-min" />
            </div>
            <p>{copy.minSizeNote}</p>
          </div>
          <ul className="bb-misuse" aria-label={copy.misuse}>
            {copy.misuses.map((label, i) => (
              <li key={label} className={`is-m${i}`}>
                <div className="bb-misuse-stage">
                  {i === 3 && (
                    <Img
                      media={img.textures[0] ?? img.scene}
                      className="bb-misuse-bg"
                    />
                  )}
                  <Img media={logoLight} className="is-lockup" />
                </div>
                <span>
                  <b aria-hidden>✕</b> {copy.misuse}: {label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </Chapter>

      <Chapter id="colour" copy={copy}>
        <Swatches roles={roles} copy={copy} />
        <Pairings pairs={pairs} copy={copy} />
      </Chapter>

      <Chapter id="type" copy={copy} tone="neutral">
        <div className="bb-type">
          {[
            ["head", copy.headline, brand.fonts?.headline ?? "Inter"],
            ["body", copy.body, brand.fonts?.body ?? "Inter"],
          ].map(([key, label, font]) => (
            <div key={key} className={`bb-type-card is-${key}`}>
              <span className="bb-label">{label}</span>
              <span className="bb-type-aa" lang="en" dir="ltr">
                Aa
              </span>
              <span className="bb-type-ar" lang="ar" dir="rtl">
                أب
              </span>
              <span className="bb-type-font">{font}</span>
              <span className="bb-type-set" lang="en" dir="ltr">
                ABCDEFGHIJKLM abcdefghijklm 0123456789
              </span>
              <span className="bb-type-set" lang="ar" dir="rtl">
                أ ب ت ث ج ح خ د ذ ر ز س ش ص ض ط ظ ع غ ف ق ك ل م ن ه و ي
                ٠١٢٣٤٥٦٧٨٩
              </span>
            </div>
          ))}
        </div>
        <ol className="bb-scale" aria-label={copy.scale}>
          {copy.scaleRows.map(([label, size], i) => (
            <li key={label} className={`is-s${i}`}>
              <span className="bb-scale-meta">
                <strong>{label}</strong>
                <bdi>{size}</bdi>
              </span>
              <span className="bb-scale-sample" lang={ar ? "ar" : "en"}>
                {ar ? copy.specimenAr : copy.specimenEn}
              </span>
            </li>
          ))}
        </ol>
        <div className="bb-bilingual">
          <p lang="en" dir="ltr">
            {copy.specimenEn}
          </p>
          <p lang="ar" dir="rtl">
            {copy.specimenAr}
          </p>
        </div>
      </Chapter>

      <Chapter id="motif" copy={copy}>
        <div className="bb-motif-grid">
          <div className="bb-motif-hero">
            <MotifArt kind={motif} color="var(--bb-highlight)" />
            <p dir="auto">{parts.motif ?? brand.visualDirection}</p>
          </div>
          <div className="bb-motif-paper">
            <MotifArt
              kind={motif}
              color="var(--bb-block)"
              density={motif === "lattice" ? 0.6 : 1}
            />
          </div>
          {img.textures.slice(0, 2).map((media) => (
            <Img key={media.id} media={media} className="bb-motif-tex" />
          ))}
        </div>
        <div className="bb-motif-rules">
          <ol>
            {copy.motifRules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ol>
          {brand.visualDirection && (
            <p className="bb-direction" dir="auto">
              {brand.visualDirection}
            </p>
          )}
        </div>
      </Chapter>

      <Chapter id="imagery" copy={copy} tone="neutral">
        <div className="bb-imagery">
          <Img media={img.scene} className="is-a" />
          <Img media={img.sceneAlt} className="is-b" />
          <Img media={img.still} className="is-c" />
          {img.poster && <Img media={img.poster} className="is-d" />}
          {img.object && (
            <div className="is-e">
              <Img media={img.object} />
            </div>
          )}
        </div>
        {brand.photoDirection && (
          <p className="bb-photo-direction" dir="auto">
            <span className="bb-label">{copy.photography}</span>
            {brand.photoDirection}
          </p>
        )}
        {img.all.length > 0 && (
          <section className="bb-library" aria-label={copy.library}>
            <span className="bb-label">{copy.library}</span>
            <ul>
              {img.all.map((media) => (
                <li key={media.id} className={`is-${media.role}`}>
                  <BrandImage media={media} className="is-gallery" />
                </li>
              ))}
            </ul>
            <p className="bb-note">{copy.libraryNote}</p>
          </section>
        )}
      </Chapter>

      <Chapter id="caravan" copy={copy} tone="block">
        <Applications
          copy={copy}
          data={{
            nameShown,
            offer,
            positioning: pos,
            icp,
            motif,
            logoLight,
            logoDark,
            mark,
            markDark,
            images: {
              cover: img.cover,
              poster: img.poster,
              object: img.object,
              scene: img.scene,
              sceneAlt: img.sceneAlt,
              texture: img.textures[0],
            },
          }}
        />
      </Chapter>

      {brand.direction && (
        <Chapter id="rules" copy={copy}>
          <div className="bb-rules">
            {(["do", "dont"] as const).map((side) => (
              <div key={side} className={`bb-rule-col is-${side}`}>
                <span className="bb-rule-head">
                  <b aria-hidden>{side === "do" ? "✓" : "✕"}</b>
                  {side === "do" ? copy.doLabel : copy.dontLabel}
                </span>
                <ol>
                  {brand.direction![side].map((rule) => (
                    <li key={rule} dir="auto">
                      {rule}
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Chapter>
      )}

      <footer className="bb-colophon">
        <Img media={mark} className="bb-colophon-mark" />
        <p>{copy.colophon}</p>
      </footer>
    </article>
  );
}
