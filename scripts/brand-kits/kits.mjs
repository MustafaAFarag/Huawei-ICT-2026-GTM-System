// Source of the v2 premium brand kits (spec: docs/superpowers/specs/2026-10-24-designed-deliverables-design.md §E).
// build-manifest.mjs turns this into packages/backend/assets/brand-kits/manifest.json.

export const kits = [
  {
    id: "sarafa-pay",
    brandName: "Sarafa Pay",
    brandNameAr: "صرافة باي",
    mood: "Precise and calm",
    palette: {
      primary: { name: "Ink navy", hex: "#0E2A47" },
      secondary: { name: "Mint teal", hex: "#3CCFB0" },
      tertiary: { name: "Deep ink", hex: "#0A1726" },
      neutral: { name: "Cloud", hex: "#F4F8FA" },
    },
    fonts: { headline: "Readex Pro", body: "IBM Plex Sans Arabic" },
    motif: "Fine-line Saudi geometric pattern",
    photography: "Riyadh shopkeepers, terminal and phone close-ups, cool daylight",
    direction: {
      do: [
        "Leave lots of white space; let navy carry structure",
        "Use mint teal only for the one thing to act on",
        "Keep the star pattern fine and quiet, never behind body text",
        "Cool daylight photos of real shop moments",
      ],
      dont: [
        "No gradients, glows or neon fintech effects",
        "No stock-photo handshakes over coins or cash piles",
        "No readable screens, card numbers or receipts",
        "Never put teal text on white for body copy",
      ],
    },
  },
  {
    id: "wasla-express",
    brandName: "Wasla Express",
    brandNameAr: "وصلة إكسبريس",
    mood: "Bold and fast",
    palette: {
      primary: { name: "Saffron", hex: "#F5B700" },
      secondary: { name: "Asphalt", hex: "#111111" },
      tertiary: { name: "Dust", hex: "#7A7268" },
      neutral: { name: "Bone", hex: "#F7F3EA" },
    },
    fonts: { headline: "Rubik", body: "Cairo" },
    motif: "Diagonal speed lines",
    photography: "Cairo streets, riders, parcels and vans at golden hour",
    direction: {
      do: [
        "Big heavy headlines, few words",
        "Saffron on black for the strongest moments",
        "Diagonal speed lines lean forward, left to right in English, right to left in Arabic",
        "Golden-hour motion: riders, vans, parcels in hand",
      ],
      dont: [
        "No thin or light type in headlines",
        "No readable plates, signs or shipping labels",
        "Never set saffron text on white",
        "No calm, empty studio shots; keep the street energy",
      ],
    },
  },
  {
    id: "ruwad-learning",
    brandName: "Ruwad Learning",
    brandNameAr: "رواد للتعلّم",
    mood: "Warm and optimistic",
    palette: {
      primary: { name: "Plum", hex: "#5B2A5E" },
      secondary: { name: "Apricot", hex: "#F4A261" },
      tertiary: { name: "Aubergine ink", hex: "#2A1530" },
      neutral: { name: "Cream", hex: "#FFF4E6" },
    },
    fonts: { headline: "Alexandria", body: "Tajawal" },
    motif: "Soft paper textures",
    photography: "Young professionals, bright studios, mentoring and laptops",
    direction: {
      do: [
        "Cream paper backgrounds with plum type",
        "Apricot for warmth and highlights, used in small doses",
        "Rounded, friendly shapes and soft paper cut-outs",
        "Real learning moments: mentoring, laughing, focused",
      ],
      dont: [
        "No cold blue corporate tones",
        "No graduation caps, apples or chalkboard clichés",
        "No pure white backgrounds; use cream",
        "No readable screens or certificate text",
      ],
    },
  },
];
