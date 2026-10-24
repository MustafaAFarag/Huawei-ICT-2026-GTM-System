// Offline build of the v2 brand kit assets (design doc call #8): cut out the chosen generated
// symbol, typeset the name in the headline font (EN + AR), export PNG at 2x and 3x, crop the
// image library, and write packages/backend/assets/brand-kits/manifest.json.
// Run: node scripts/brand-kits/build-assets.mjs <source dir with symbols/ and library/>
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { kits } from "./kits.mjs";
import { tints } from "./tints.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const backend = join(root, "packages/backend");
const out = join(backend, "assets/brand-kits");
const source = resolve(process.argv[2] ?? join(root, ".local/brand-kit-source-v2"));
const require = createRequire(join(backend, "package.json"));
const { chromium } = require("playwright");

const fontFile = (pkg, file) =>
  `data:font/woff2;base64,${readFileSync(require.resolve(`@fontsource/${pkg}/files/${file}`)).toString("base64")}`;
const fontFaces = (family, pkg, weight) =>
  ["latin", "arabic"]
    .map(
      (subset) =>
        `@font-face{font-family:"${family}";src:url(${fontFile(pkg, `${pkg}-${subset}-${weight}-normal.woff2`)}) format("woff2");font-weight:${weight}}`,
    )
    .join("");
const headline = {
  "Readex Pro": { pkg: "readex-pro", weight: 600 },
  Rubik: { pkg: "rubik", weight: 800 },
  Alexandria: { pkg: "alexandria", weight: 600 },
};

const generator = "Codex Skylink built-in image_gen";
const promptsFrom = (file) =>
  new Map(
    readFileSync(join(source, file), "utf8")
      .trim()
      .split("\n")
      .map((line) => line.split("\t"))
      .map(([path, prompt]) => [path.replace(/^.*\//, "").replace(/\.png$/, ""), prompt]),
  );
const symbolPrompts = promptsFrom("symbols.tsv");
const libraryPrompts = promptsFrom("library.tsv");
const sourceIdFor = (logDir, name) => {
  try {
    return readFileSync(join(logDir, `${name}.log`), "utf8").match(/exec-[0-9a-f-]{36}/)?.[0] ?? name;
  } catch {
    return name;
  }
};

// Picks confirmed by the owner on 24 Oct 2026; the dark variant swaps the ink colour.
const symbols = {
  "sarafa-pay": { option: "sarafa-b", ink: "#0E2A47", inkDark: "#FFFFFF", text: "#0E2A47", textDark: "#FFFFFF" },
  "wasla-express": { option: "wasla-a", ink: "#111111", inkDark: "#FFFFFF", text: "#111111", textDark: "#FFFFFF" },
  "ruwad-learning": { option: "ruwad-a", ink: "#5B2A5E", inkDark: "#FFF4E6", text: "#5B2A5E", textDark: "#FFF4E6" },
};
// Workspace ids on the demo database (TASKS.md, 24 Oct); kits are matched by id, not name.
const workspaceIds = {
  "sarafa-pay": "8099320e-1cd4-4546-8f83-46230633158d",
  "wasla-express": "a14a01ac-902e-49dd-8931-89b85e24f5f5",
  "ruwad-learning": "4b177155-50eb-4aa0-a1b4-998a879d78fe",
};

// Library crop sizes per role (design doc §E).
const sizes = { hero: "1200x600", photo: "1200x800", texture: "800x800", cover: "1080x1080" };
const roleOf = (name) => name.split("-")[1];

const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable" });
const page = await browser.newPage();

// Unmultiply the white background into alpha, trim, and optionally recolour the ink.
async function cutout(png, ink, inkTo) {
  return page.evaluate(
    async ({ src, ink, inkTo }) => {
      const image = new Image();
      image.src = src;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext("2d");
      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      const px = data.data;
      const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
      const [ir, ig, ib] = hex(ink);
      const target = inkTo ? hex(inkTo) : null;
      let [minX, minY, maxX, maxY] = [canvas.width, canvas.height, 0, 0];
      for (let i = 0; i < px.length; i += 4) {
        const alpha = Math.max(255 - px[i], 255 - px[i + 1], 255 - px[i + 2]) / 255;
        // Light brand colours (mint, apricot) sit near alpha 0.6, so full coverage starts at 0.5;
        // only anti-aliased edges below that become partly transparent.
        const a = alpha < 0.04 ? 0 : Math.min(1, (alpha - 0.04) / 0.46);
        if (a === 0) {
          px[i + 3] = 0;
          continue;
        }
        if (a < 1) for (let c = 0; c < 3; c++) px[i + c] = Math.max(0, Math.min(255, (px[i + c] - 255 * (1 - a)) / a));
        if (target && Math.hypot(px[i] - ir, px[i + 1] - ig, px[i + 2] - ib) < 90)
          [px[i], px[i + 1], px[i + 2]] = target;
        px[i + 3] = Math.round(a * 255);
        const p = i / 4;
        const [x, y] = [p % canvas.width, Math.floor(p / canvas.width)];
        if (a > 0.1) {
          minX = Math.min(minX, x);
          minY = Math.min(minY, y);
          maxX = Math.max(maxX, x);
          maxY = Math.max(maxY, y);
        }
      }
      context.putImageData(data, 0, 0);
      const side = Math.max(maxX - minX, maxY - minY) + 1;
      const square = document.createElement("canvas");
      square.width = square.height = side;
      square
        .getContext("2d")
        .drawImage(canvas, minX, minY, maxX - minX + 1, maxY - minY + 1, (side - (maxX - minX + 1)) / 2, (side - (maxY - minY + 1)) / 2, maxX - minX + 1, maxY - minY + 1);
      return square.toDataURL("image/png");
    },
    { src: `data:image/png;base64,${png.toString("base64")}`, ink, inkTo },
  );
}

async function shot(html, scale, file) {
  const context = await browser.newContext({ deviceScaleFactor: scale });
  const tab = await context.newPage();
  await tab.setContent(html);
  await tab.evaluate(() => document.fonts.ready);
  await tab.locator("#art").screenshot({ path: file, omitBackground: true });
  await context.close();
}

const manifest = { version: 2, kits: [] };
for (const kit of kits) {
  const pick = symbols[kit.id];
  const dir = join(out, kit.id);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const raw = readFileSync(join(source, "symbols", `${pick.option}.png`));
  const light = await cutout(raw, pick.ink, null);
  const dark = await cutout(raw, pick.ink, pick.inkDark);
  const font = headline[kit.fonts.headline];
  const css = `${fontFaces(kit.fonts.headline, font.pkg, font.weight)}html,body{margin:0;background:transparent}
#art{display:inline-flex;align-items:center;gap:18px;padding:4px;font:${font.weight} 34px/1 "${kit.fonts.headline}";white-space:nowrap}
#art img{width:64px;height:64px;display:block}#art.symbol img{width:128px;height:128px}`;
  const variants = [];
  const render = async (name, body, alt, variant, lang) => {
    for (const scale of [2, 3]) {
      const file = `${kit.id}/${name}-${scale}x.png`;
      await shot(`<!doctype html><meta charset="utf-8"><style>${css}</style>${body}`, scale, join(out, file));
      variants.push({ id: `${kit.id}-${name}-${scale}x`, file, alt, variant, lang, scale });
    }
  };
  await render("symbol", `<div id="art" class="symbol"><img src="${light}" alt=""></div>`, `${kit.brandName} symbol`, "symbol", null);
  await render("symbol-dark", `<div id="art" class="symbol"><img src="${dark}" alt=""></div>`, `${kit.brandName} symbol for dark backgrounds`, "symbol-dark", null);
  for (const [lang, name, dir_] of [["en", kit.brandName, "ltr"], ["ar", kit.brandNameAr, "rtl"]])
    for (const [tone, img, color] of [["light", light, pick.text], ["dark", dark, pick.textDark]])
      await render(
        `lockup-${lang}-${tone}`,
        `<div id="art" dir="${dir_}" lang="${lang}" style="color:${color}"><img src="${img}" alt=""><span>${name}</span></div>`,
        `${kit.brandName} logo${lang === "ar" ? " in Arabic" : ""}${tone === "dark" ? " for dark backgrounds" : ""}`,
        tone,
        lang,
      );

  const symbolLog = join(source, "logs");
  const gallery = [];
  for (const [name, prompt] of libraryPrompts) {
    if (!name.startsWith(kit.id.split("-")[0])) continue;
    if (!existsSync(join(source, "library", `${name}.png`))) {
      console.warn(`missing library image: ${name}`);
      continue;
    }
    const role = roleOf(name);
    const file = `${kit.id}/${name.split("-").slice(1).join("-")}.webp`;
    execFileSync("magick", [
      join(source, "library", `${name}.png`),
      "-resize", `${sizes[role]}^`, "-gravity", "center", "-extent", sizes[role],
      "-strip", "-quality", role === "texture" ? "80" : "78",
      join(out, file),
    ]);
    gallery.push({
      id: `${kit.id.split("-")[0]}-${name.split("-").slice(1).join("-")}`,
      file,
      alt: altText(prompt),
      role,
      tags: tagsFor(prompt, role, kit),
      provenance: "generated",
      prompt,
      generator,
      sourceId: sourceIdFor(symbolLog, name),
    });
  }

  manifest.kits.push({
    id: kit.id,
    workspaceId: workspaceIds[kit.id],
    brandName: kit.brandName,
    brandNameAr: kit.brandNameAr,
    mood: kit.mood,
    palette: Object.fromEntries(
      Object.entries(kit.palette).map(([role, { name, hex }]) => [role, { name, hex, tints: tints(hex) }]),
    ),
    fonts: kit.fonts,
    motif: kit.motif,
    photography: kit.photography,
    direction: kit.direction,
    symbol: {
      option: pick.option,
      prompt: symbolPrompts.get(pick.option),
      generator,
      sourceId: sourceIdFor(symbolLog, pick.option),
    },
    logo: { file: `${kit.id}/lockup-en-light-2x.png`, alt: `${kit.brandName} logo` },
    mark: { file: `${kit.id}/symbol-2x.png`, alt: `${kit.brandName} symbol` },
    logoVariants: variants,
    gallery,
  });
}
await browser.close();
writeFileSync(join(out, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(manifest.kits.map((k) => `${k.id}: ${k.logoVariants.length} logo files, ${k.gallery.length} images`).join("\n"));

// Alt text: the scene sentence of the prompt, without the shared style boilerplate.
function altText(prompt) {
  const scene = prompt
    .split(/(?<=\.)\s+/)
    .filter((s) => !/^(Photorealistic|Wide landscape|Landscape 3:2|Square 1:1|Seamless flat|No text|candid)/i.test(s))
    .join(" ")
    .replace(/#[0-9A-F]{6}/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return `Illustrative generated brand image: ${scene}`.slice(0, 290);
}

function tagsFor(prompt, role, kit) {
  const words = ["people", "product", "place", "pattern", "close-up", "team", "street", "office", "parcel", "terminal", "laptop", "mentoring"];
  const lower = prompt.toLowerCase();
  const tags = words.filter((w) => lower.includes(w.replace("-", " ")) || lower.includes(w));
  if (/\b(man|woman|owner|rider|courier|worker|mentor|professionals|colleague|barista|partners|dispatcher|learners?)\b/.test(lower)) tags.push("people");
  return [...new Set([role, kit.mood.toLowerCase(), ...tags])].slice(0, 8);
}
