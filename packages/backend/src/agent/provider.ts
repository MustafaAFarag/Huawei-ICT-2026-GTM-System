import type { LanguageModel, TranscriptionModel } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { config, required } from "../config.js";

// Provider adapter (PRD AI-03). Azure OpenAI now; any OpenAI-compatible endpoint
// (for example Huawei ModelArts MaaS) through AI_PROVIDER=openai-compatible later.
export function aiProvider() {
  return process.env.AI_PROVIDER ?? "azure";
}

export function aiLive() {
  return !config.modelFixture;
}

let azure: ReturnType<typeof createAzure> | undefined;
let azureSpeech: ReturnType<typeof createAzure> | undefined;
// Audio transcription on Azure is served on deployment-based URLs, not the v1 path.
function azureSpeechProvider() {
  azureSpeech ??= createAzure({
    resourceName: required("AZURE_OPENAI_RESOURCE"),
    apiKey: required("AZURE_OPENAI_API_KEY"),
    useDeploymentBasedUrls: true,
    apiVersion:
      process.env.AZURE_OPENAI_AUDIO_API_VERSION?.trim() ||
      "2025-03-01-preview",
  });
  return azureSpeech;
}
function azureProvider() {
  azure ??= createAzure({
    resourceName: required("AZURE_OPENAI_RESOURCE"),
    apiKey: required("AZURE_OPENAI_API_KEY"),
  });
  return azure;
}

export function chatModel(): LanguageModel {
  const deployment = process.env.AI_CHAT_DEPLOYMENT ?? required("MODEL_ID");
  if (aiProvider() === "openai-compatible")
    return createOpenAICompatible({
      name: "maas",
      baseURL: required("MODEL_BASE_URL"),
      apiKey: required("MODEL_API_KEY"),
    }).chatModel(deployment);
  // gpt-6.x accepts function tools with reasoning only on the Responses API.
  return process.env.AI_CHAT_API === "responses"
    ? azureProvider().responses(deployment)
    : azureProvider().chat(deployment);
}

export function chatModelId() {
  return process.env.AI_CHAT_DEPLOYMENT ?? process.env.MODEL_ID ?? "fixture";
}

export function transcriptionModel(alternative = false): {
  id: string;
  model: TranscriptionModel;
} {
  const deployment = alternative
    ? (process.env.AI_TRANSCRIBE_ALT_DEPLOYMENT ?? "whisper")
    : (process.env.AI_TRANSCRIBE_DEPLOYMENT ?? "gpt-4o-transcribe");
  return {
    id: deployment,
    model: azureSpeechProvider().transcription(deployment),
  };
}
