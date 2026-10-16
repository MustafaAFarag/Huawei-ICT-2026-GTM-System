import { describe, expect, it } from "vitest";
import { callDateContext } from "../src/agent/call-date.js";
describe("call date context", () => {
  it("uses the workspace-local day at a UTC date boundary", () => {
    const now = new Date("2026-10-15T22:30:00Z");
    const cairo = callDateContext("Africa/Cairo", now),
      utc = callDateContext("UTC", now);
    expect(cairo.today).toBe("2026-10-16");
    expect(utc.today).toBe("2026-10-15");
    expect(cairo.weekdays.find((day) => day.en === "Sunday")?.daysUntil).toBe(
      2,
    );
    expect(utc.weekdays.find((day) => day.en === "Sunday")?.daysUntil).toBe(3);
  });
  it("keeps a same-day weekday at zero and rejects an invalid zone", () => {
    expect(
      callDateContext("UTC", new Date("2026-10-18T12:00:00Z")).weekdays.find(
        (day) => day.en === "Sunday",
      )?.daysUntil,
    ).toBe(0);
    expect(() => callDateContext("Invalid/Zone")).toThrow(/time zone/);
  });
});
