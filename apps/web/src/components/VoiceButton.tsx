"use client";
import { useEffect, useRef, useState } from "react";
import { IconMicrophone, IconPlayerStopFilled, IconLoader2 } from "@revenue/ui";
import { usePrefs } from "../lib/prefs";

const LIMIT_SECONDS = 60;

// Records up to 60 s with MediaRecorder and returns the transcript. Audio is sent once
// to the API for transcription and not kept (PRD AI-04).
export function VoiceButton({
  ws,
  language,
  onText,
  onError,
  disabled,
  onStateChange,
}: {
  ws: string;
  language: "en" | "ar" | "auto";
  onText: (text: string) => void;
  onError: (message: string) => void;
  disabled?: boolean;
  onStateChange?: (state: "idle" | "recording" | "working") => void;
}) {
  const { t } = usePrefs();
  const [state, setState] = useState<"idle" | "recording" | "working">("idle");
  const stateListener = useRef(onStateChange);
  stateListener.current = onStateChange;
  useEffect(() => stateListener.current?.(state), [state]);
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearInterval(timer.current);
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    },
    [],
  );
  const stop = () => {
    if (timer.current) clearInterval(timer.current);
    if (recorder.current?.state === "recording") recorder.current.stop();
  };
  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      onError(t("Voice input is not available in this browser."));
      return;
    }
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      onError(t("Allow microphone access to dictate."));
      return;
    }
    const mime = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find(
      (type) => MediaRecorder.isTypeSupported(type),
    );
    const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
    const chunks: Blob[] = [];
    rec.ondataavailable = (event) => event.data.size && chunks.push(event.data);
    rec.onstop = async () => {
      stream.getTracks().forEach((track) => track.stop());
      setState("working");
      try {
        const type = (rec.mimeType || "audio/webm").split(";")[0]!;
        const response = await fetch(
          `/api/workspaces/${ws}/transcribe?language=${language}`,
          { method: "POST", headers: { "Content-Type": type }, body: new Blob(chunks, { type }) },
        );
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        if (result.text) onText(result.text);
      } catch (error) {
        onError(error instanceof Error ? error.message : t("Transcription failed."));
      } finally {
        setState("idle");
      }
    };
    recorder.current = rec;
    rec.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((value) => {
        if (value + 1 >= LIMIT_SECONDS) stop();
        return value + 1;
      });
    }, 1000);
  };
  return (
    <button
      type="button"
      className={`voice-button ${state}`}
      aria-label={state === "recording" ? t("Stop recording") : t("Dictate with your voice")}
      title={`${t("Dictate with your voice")} · 1 cr`}
      disabled={disabled || state === "working"}
      onClick={() => (state === "recording" ? stop() : void start())}
    >
      {state === "recording" ? (
        <>
          <IconPlayerStopFilled size={12} />
          <span className="mono">0:{String(seconds).padStart(2, "0")}</span>
        </>
      ) : state === "working" ? (
        <IconLoader2 size={15} className="spin" />
      ) : (
        <IconMicrophone size={15} />
      )}
    </button>
  );
}
