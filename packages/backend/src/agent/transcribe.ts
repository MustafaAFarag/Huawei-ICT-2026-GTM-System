import { transcribe } from "ai";
import { BadRequestException } from "@nestjs/common";
import type { Actor } from "@revenue/contracts";
import { safeError } from "../policy.js";
import { aiLive, transcriptionModel } from "./provider.js";
import { chargeCredits, refundCredits } from "./metering.js";

// Voice dictation (PRD AI-04, GAP-08). Audio is transcribed and discarded: it is never
// written to storage or logs. Residency for voice is an open gap (PRD v3.1 §12).
export const MAX_AUDIO_BYTES = 4 * 1024 * 1024;
const ALLOWED = /^audio\/(webm|ogg|mpeg|mp4|wav|x-wav|m4a|x-m4a)(;.*)?$/;

export async function transcribeAudio(
  actor: Actor,
  audio: Buffer,
  mediaType: string,
  language: "en" | "ar" | "auto" = "auto",
  alternative = false,
) {
  if (!audio.length) throw new BadRequestException("The recording is empty.");
  if (audio.length > MAX_AUDIO_BYTES)
    throw new BadRequestException("Recordings are limited to about 60 seconds.");
  if (!ALLOWED.test(mediaType))
    throw new BadRequestException("Unsupported audio format.");
  if (!aiLive())
    return {
      text: language === "ar" ? "نص تجريبي من التسجيل الصوتي." : "Fixture transcript of the recording.",
      language,
      model: "fixture",
      credits: 0,
      durationInSeconds: null as number | null,
    };
  const charge = await chargeCredits(actor, "transcription", { bytes: audio.length });
  const { id, model } = transcriptionModel(alternative);
  try {
    const options = language === "auto" ? {} : { language };
    const started = Date.now();
    const result = await transcribe({
      model,
      audio,
      providerOptions: { azure: options, openai: options },
      abortSignal: AbortSignal.timeout(60000),
    });
    return {
      text: result.text.trim(),
      language: result.language ?? language,
      model: id,
      credits: charge.credits,
      durationInSeconds: result.durationInSeconds ?? null,
      latencyMs: Date.now() - started,
    };
  } catch (error) {
    await refundCredits(actor, charge.usageId);
    throw new BadRequestException(`Transcription failed: ${safeError(error)}`);
  }
}
