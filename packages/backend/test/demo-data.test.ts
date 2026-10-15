import { describe, expect, it } from "vitest";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { generateDemo, demoSummary, score } from "@revenue/backend";

const root = join(import.meta.dirname, "../../..");
const realDir = join(root, "GTM Files");

describe("synthetic demo data", () => {
  it("is deterministic and covers every plan tier and the agency client model", () => {
    expect(JSON.stringify(generateDemo())).toBe(JSON.stringify(generateDemo()));
    const data = generateDemo();
    const summary = demoSummary(data);
    expect(summary.workspaces).toBe(8);
    expect(summary.accounts).toBeGreaterThanOrEqual(150);
    expect(summary.contacts).toBeGreaterThanOrEqual(300);
    expect(new Set(data.map((w) => w.plan))).toEqual(
      new Set(["Free", "Solo", "Team", "Agency", "Enterprise"]),
    );
    expect(data.filter((w) => w.parentKey === "mirqab")).toHaveLength(3);
  });

  it("includes the edge cases the plays and de-duplication need", () => {
    const prospects = generateDemo().flatMap((w) => w.prospects);
    const tiers = new Set(
      prospects.filter((p) => p.scored).map((p) => score(p.snapshot).tier),
    );
    expect(tiers).toEqual(new Set(["A", "B", "C"]));
    for (const bucket of ["client", "partner", "drop", "existing"])
      expect(prospects.some((p) => p.snapshot.bucket === bucket)).toBe(true);
    for (const signal of ["hiring", "funding", "headcount-growth"])
      expect(prospects.some((p) => p.snapshot.signals?.includes(signal))).toBe(true);
    expect(
      prospects.some((p) => p.country !== "EG" && !p.snapshot.email),
    ).toBe(true);
    expect(prospects.some((p) => p.excluded)).toBe(true);
    // Near-duplicates share a person and company but have different source keys.
    const people = prospects.map(
      (p) => `${p.sourceKey.split(":")[0]}|${p.snapshot.company}|${p.snapshot.firstName}|${p.snapshot.lastName}`,
    );
    expect(new Set(people).size).toBeLessThan(people.length);
  });

  it("uses only reserved example domains and unique source keys per workspace", () => {
    for (const w of generateDemo()) {
      const keys = w.prospects.map((p) => p.sourceKey);
      expect(new Set(keys).size).toBe(keys.length);
      for (const p of w.prospects) {
        if (p.snapshot.email) expect(p.snapshot.email).toMatch(/@[a-z0-9-]+\.example$/);
        expect(p.snapshot.website).toMatch(/^https:\/\/[a-z0-9-]+\.example$/);
        for (const e of p.evidence) expect(new URL(e.url).hostname).toMatch(/\.example$/);
      }
    }
  });

  it.skipIf(!existsSync(realDir))(
    "contains no email, phone, person or company value from the real GTM files",
    () => {
      const generated = JSON.stringify(generateDemo()).toLowerCase();
      const values = new Set<string>();
      for (const file of readdirSync(realDir).filter((f) => f.endsWith(".csv"))) {
        const text = readFileSync(join(realDir, file), "utf8");
        for (const m of text.matchAll(/[\w.+-]+@[\w-]+\.[\w.-]+/g)) values.add(m[0].toLowerCase());
        for (const m of text.matchAll(/\+?\d[\d\s-]{8,}\d/g))
          values.add(m[0].replace(/\D/g, ""));
        const [header, ...rows] = text.split(/\r?\n/);
        const cols = (header ?? "").split(",").map((h) => h.trim().toLowerCase());
        const idx = (names: string[]) => cols.findIndex((c) => names.includes(c.replace(/^﻿/, "")));
        const first = idx(["first name", "firstname", "first_name"]);
        const last = idx(["last name", "lastname", "last_name"]);
        const company = idx(["company", "bank", "account", "account name", "name"]);
        for (const row of rows) {
          const cells = row.split(",");
          if (first >= 0 && last >= 0 && cells[first] && cells[last])
            values.add(`"firstname":"${cells[first].trim()}","lastname":"${cells[last].trim()}"`.toLowerCase());
          const name = company >= 0 ? cells[company]?.trim() : "";
          if (name && name.length >= 6) values.add(`"company":"${name.toLowerCase()}"`);
        }
      }
      const digits = generateDemo()
        .flatMap((w) => w.prospects.map((p) => (p.snapshot.phone ?? "").replace(/\D/g, "")))
        .join("|");
      const leaks = [...values].filter((v) =>
        /^\d+$/.test(v) ? v.length >= 9 && digits.includes(v.slice(-9)) : generated.includes(v),
      );
      expect(values.size).toBeGreaterThan(100);
      expect(leaks).toEqual([]);
    },
  );
});
