import type { ReactNode } from "react";
import type { BrandMediaRef } from "@revenue/contracts";
import { BrandImage } from "../BrandMedia";
import { MotifArt, Rings } from "./MotifArt";
import type { BookCopy } from "./copy";
import type { Motif } from "./style";

export type AppData = {
  nameShown: string;
  offer: string;
  positioning: string;
  icp: string;
  motif: Motif;
  logoLight?: BrandMediaRef;
  logoDark?: BrandMediaRef;
  mark?: BrandMediaRef;
  markDark?: BrandMediaRef;
  images: {
    cover?: BrandMediaRef;
    poster?: BrandMediaRef;
    object?: BrandMediaRef;
    scene?: BrandMediaRef;
    sceneAlt?: BrandMediaRef;
    texture?: BrandMediaRef;
  };
};

function Frame({
  id,
  copy,
  children,
  className,
}: {
  id: string;
  copy: BookCopy;
  children: ReactNode;
  className: string;
}) {
  const [title, caption] = copy.apps[id];
  return (
    <figure className={`bb-app ${className}`} data-app={id}>
      <div className="bb-app-stage">{children}</div>
      <figcaption>
        <strong>{title}</strong>
        <span>{caption}</span>
      </figcaption>
    </figure>
  );
}

const Img = ({
  media,
  className = "",
}: {
  media?: BrandMediaRef;
  className?: string;
}) =>
  media ? (
    <BrandImage media={media} className={className} />
  ) : (
    <span className={`bb-img-empty ${className}`} aria-hidden />
  );

export function Applications({
  copy,
  data,
}: {
  copy: BookCopy;
  data: AppData;
}) {
  const { images } = data;
  return (
    <div className="bb-apps">
      <Frame id="email" copy={copy} className="is-email">
        <div className="bb-email">
          <div className="bb-email-head">
            <Img media={data.logoLight} className="is-lockup" />
          </div>
          <Img media={images.scene} className="bb-email-hero" />
          <div className="bb-email-body">
            <p className="bb-email-hello">{copy.emailHello}</p>
            <p className="bb-email-headline" dir="auto">
              {data.offer}
            </p>
            <p className="bb-email-text">{copy.emailBody}</p>
            <span className="bb-email-cta">{copy.learnMore}</span>
          </div>
          <p className="bb-email-foot">{copy.unsubscribe}</p>
        </div>
      </Frame>

      <Frame id="infographic" copy={copy} className="is-infographic">
        <div className="bb-info">
          <div className="bb-info-top">
            <span className="bb-clip">
              <Rings className="bb-info-rings" color="var(--bb-on-block)" />
            </span>
            <Img media={data.markDark} className="bb-info-mark" />
            <p className="bb-info-title" dir="auto">
              {data.nameShown} <em>{copy.atAGlance}</em>
            </p>
            <p className="bb-info-sub" dir="auto">
              {data.positioning}
            </p>
            <Img media={images.object} className="bb-info-circle" />
          </div>
          <div className="bb-info-card">
            <span className="bb-info-pill">{copy.offer}</span>
            <p dir="auto">{data.offer}</p>
          </div>
          <ol className="bb-info-steps">
            {copy.steps.map((step, i) => (
              <li key={step}>
                <span className="bb-info-num">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <strong>{step}</strong>
                <span>{copy.stepsNote[i]}</span>
              </li>
            ))}
          </ol>
          <p className="bb-info-foot" dir="auto">
            {copy.audience}: {data.icp}
          </p>
        </div>
      </Frame>

      <Frame id="carousel" copy={copy} className="is-carousel">
        <div className="bb-carousel">
          <Img media={images.poster} className="bb-carousel-bg" />
          <span className="bb-carousel-count">{copy.slide}</span>
          <div className="bb-carousel-panel">
            <Img media={data.markDark} className="bb-carousel-mark" />
            <p dir="auto">{data.offer}</p>
            <span className="bb-carousel-swipe">{copy.swipe} →</span>
          </div>
        </div>
      </Frame>

      <Frame id="onepager" copy={copy} className="is-onepager">
        <div className="bb-onepager">
          <div className="bb-onepager-art">
            <Img media={images.texture} />
          </div>
          <div className="bb-onepager-body">
            <span className="bb-onepager-kicker">{copy.profile}</span>
            <p className="bb-onepager-name" dir="auto">
              {data.nameShown}
            </p>
            <p className="bb-onepager-pos" dir="auto">
              {data.positioning}
            </p>
            <div className="bb-onepager-rule" />
            <div className="bb-onepager-thumbs">
              <Img media={images.sceneAlt} />
              <Img media={images.object} />
              <Img media={images.scene} />
            </div>
            <Img
              media={data.logoLight}
              className="bb-onepager-logo is-lockup"
            />
          </div>
        </div>
      </Frame>

      <Frame id="deck" copy={copy} className="is-deck">
        <div className="bb-deck">
          <div className="bb-deck-panel">
            <span className="bb-clip">
              <MotifArt
                kind={data.motif}
                color="var(--bb-highlight)"
                className="bb-deck-motif"
              />
            </span>
            <Img media={data.logoDark} className="bb-deck-logo is-lockup" />
            <span className="bb-deck-kicker">{copy.deckTitle}</span>
            <p className="bb-deck-title" dir="auto">
              {data.offer}
            </p>
          </div>
          <Img media={images.cover} className="bb-deck-img" />
        </div>
      </Frame>
    </div>
  );
}
