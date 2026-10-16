import type { Asset } from "./types";
export function assetLabel(asset: Asset, t: (text: string) => string) {
  if (!asset.title.startsWith(`${asset.template} — `)) return asset.title;
  const template = t(
    asset.template === "mini-audit" ? "Mini-audit report" : "Offer one-pager",
  );
  return asset.title
    .replace(asset.template, template)
    .replace(" · revision", ` · ${t("Revision")}`);
}
