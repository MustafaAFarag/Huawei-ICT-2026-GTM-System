import { describe, expect, it } from "vitest";
import { detectLanguage } from "../src/agent/detect-language.js";

// Nabil picks the content language from the request itself; no language selector needed.
describe("content language detection", () => {
  it.each([
    ["Create an Instagram carousel about clinic websites", "en"],
    ["Find accounts in Saudi Arabia with hiring signals", "en"],
    ["عايز إيميل للعيادات عن المراجعة المجانية", "ar-EG"],
    ["ابغى كاروسيل لينكدإن عن خدمة الرواتب", "ar-Gulf"],
    ["أنشئ كتيبًا تعريفيًا عن خدمة الرواتب للشركات", "ar"],
    ["Write the email in Egyptian Arabic", "ar-EG"],
    ["اكتبها بالإنجليزي من فضلك", "en"],
    ["Draft it in Arabic for the Riyadh team", "ar"],
  ])("%s → %s", (text, expected) => {
    expect(detectLanguage(text)).toBe(expected);
  });
});
