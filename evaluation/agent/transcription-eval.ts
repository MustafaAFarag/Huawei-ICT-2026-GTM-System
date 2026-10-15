// Transcription check (PRD AI-05): synthesises 10 English/Arabic clips with the test-only
// TTS deployment, transcribes them with Whisper and GPT-4o transcribe, and reports WER.
// TTS voices are not native dialect speakers, so this verifies the pipeline and gives a
// floor, not real Egyptian/Gulf accuracy. Usage: tsx evaluation/agent/transcription-eval.ts
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createAzure } from "@ai-sdk/azure";
import { experimental_generateSpeech as generateSpeechExp, transcribe } from "ai";
import * as ai from "ai";

process.loadEnvFile(".env");
const azure = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
});
const azureAudio = createAzure({
  resourceName: process.env.AZURE_OPENAI_RESOURCE!,
  apiKey: process.env.AZURE_OPENAI_API_KEY!,
  useDeploymentBasedUrls: true,
  apiVersion: "2025-03-01-preview",
});
const generateSpeech =
  (ai as unknown as { generateSpeech?: typeof generateSpeechExp }).generateSpeech ?? generateSpeechExp;
const dir = "evaluation/agent/clips";
const clips = JSON.parse(await readFile("evaluation/agent/clips.json", "utf8")) as {
  id: string;
  language: "en" | "ar";
  text: string;
}[];

// Normalise before WER: lowercase, strip punctuation and Arabic diacritics, unify alef/ya/ta marbuta.
function words(text: string) {
  return text
    .toLowerCase()
    .replace(/[ً-ْـ]/g, "")
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter(Boolean);
}
function wer(reference: string, hypothesis: string) {
  const r = words(reference),
    h = words(hypothesis);
  const d = Array.from({ length: r.length + 1 }, (_, i) =>
    Array.from({ length: h.length + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0)),
  );
  for (let i = 1; i <= r.length; i++)
    for (let j = 1; j <= h.length; j++)
      d[i]![j] = Math.min(
        d[i - 1]![j]! + 1,
        d[i]![j - 1]! + 1,
        d[i - 1]![j - 1]! + (r[i - 1] === h[j - 1] ? 0 : 1),
      );
  return r.length ? d[r.length]![h.length]! / r.length : 0;
}

await mkdir(dir, { recursive: true });
for (const clip of clips) {
  const path = `${dir}/${clip.id}.mp3`;
  if (existsSync(path)) continue;
  const speech = await generateSpeech({
    model: azure.speech("tts"),
    text: clip.text,
    voice: clip.language === "ar" ? "onyx" : "alloy",
  });
  await writeFile(path, speech.audio.uint8Array);
}

const models = [
  { id: "whisper", label: "Whisper" },
  { id: "gpt-4o-transcribe", label: "GPT-4o transcribe" },
];
const rows: Record<string, unknown>[] = [];
for (const model of models)
  for (const clip of clips) {
    const audio = await readFile(`${dir}/${clip.id}.mp3`);
    const started = Date.now();
    try {
      const result = await transcribe({
        model: azureAudio.transcription(model.id),
        audio,
        providerOptions: { azure: { language: clip.language }, openai: { language: clip.language } },
      });
      rows.push({
        model: model.id,
        clip: clip.id,
        language: clip.language,
        wer: Number(wer(clip.text, result.text).toFixed(3)),
        ms: Date.now() - started,
        transcript: result.text,
      });
    } catch (error) {
      rows.push({ model: model.id, clip: clip.id, error: String(error).slice(0, 200) });
    }
    await new Promise((r) => setTimeout(r, model.id === "whisper" ? 21000 : 500));
  }

const summary = models.map((m) => {
  const ok = rows.filter((r) => r.model === m.id && typeof r.wer === "number") as {
    wer: number;
    ms: number;
    language: string;
  }[];
  const avg = (list: typeof ok) =>
    list.length ? Number((list.reduce((s, r) => s + r.wer, 0) / list.length).toFixed(3)) : null;
  return {
    model: m.id,
    clips: ok.length,
    werEnglish: avg(ok.filter((r) => r.language === "en")),
    werArabic: avg(ok.filter((r) => r.language === "ar")),
    medianMs: ok.map((r) => r.ms).sort((a, b) => a - b)[Math.floor(ok.length / 2)] ?? null,
  };
});
await mkdir("evaluation/agent/results", { recursive: true });
const date = new Date().toISOString().slice(0, 10);
await writeFile(
  `evaluation/agent/results/transcription-${date}.json`,
  JSON.stringify({ date, note: "Synthetic TTS clips; not native-speaker dialect accuracy.", summary, rows }, null, 2),
);
console.table(summary);
