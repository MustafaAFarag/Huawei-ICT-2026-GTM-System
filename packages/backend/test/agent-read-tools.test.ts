import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { db, json } from "@revenue/backend";
import { readTools, uiTools } from "../src/agent/tools.js";

const ws = randomUUID(),
  userId = randomUUID();
const actor = { userId, workspaceId: ws, role: "owner" as const };
let prospectId: string, draftId: string;
async function run(name: string, input: unknown, workspaceId = ws) {
  const fn = readTools({ ...actor, workspaceId })[name]!.execute! as (
    input: unknown,
    context: unknown,
  ) => Promise<any>;
  return fn(input, { toolCallId: "test", messages: [] });
}
beforeAll(async () => {
  await db.workspace.create({
    data: {
      id: ws,
      name: "Read tool tests",
      crmBinding: "A",
      assetBinding: "A",
    },
  });
  await db.prospect.createMany({
    data: Array.from({ length: 101 }, (_, i) => ({
      workspaceId: ws,
      ownerId: userId,
      sourceKey: `${i}@read-tool.example`,
      lawfulBasis: i === 0 ? "consent" : null,
      snapshot: json({
        firstName: `Person ${i}`,
        lastName: "Test",
        email: `${i}@read-tool.example`,
        company: "Batch Test",
        website: "https://batch.example",
        title: "Founder",
      }),
    })),
  });
  const prospect = await db.prospect.findFirstOrThrow({
    where: { workspaceId: ws },
  });
  prospectId = prospect.id;
  await db.prospect.update({
    where: { id: prospectId },
    data: {
      evidence: json([
        {
          id: "approved",
          approved: true,
          kind: "fact",
          claim: "Reviewed source",
          date: "2026-10-10",
          url: "https://source.example",
          source: "Synthetic",
        },
      ]),
    },
  });
  const draft = await db.draft.create({
    data: {
      workspaceId: ws,
      prospectId,
      playVersionId: randomUUID(),
      runId: randomUUID(),
      content: json([
        {
          channel: "email",
          day: 0,
          subject: "Saved",
          body: "Actual saved copy. Reply stop.",
          evidenceIds: ["approved"],
        },
      ]),
      evidenceDigest: "test",
    },
  });
  draftId = draft.id;
});
afterAll(async () => {
  await db.draft.deleteMany({ where: { workspaceId: ws } });
  await db.prospect.deleteMany({ where: { workspaceId: ws } });
  await db.workspace.delete({ where: { id: ws } });
});
describe("grounded assistant read tools", () => {
  it("makes batch truncation explicit and pages without dropping IDs", async () => {
    const first = await run("search_accounts", { query: "Batch Test" });
    expect(first.total).toBe(101);
    expect(first.allIds).toHaveLength(100);
    expect(first.batch).toMatchObject({
      count: 100,
      hasMore: true,
      nextOffset: 100,
    });
    const second = await run("search_accounts", {
      query: "Batch Test",
      offset: 100,
    });
    expect(second.allIds).toHaveLength(1);
    expect(new Set([...first.allIds, ...second.allIds]).size).toBe(101);
    expect(second.batch.hasMore).toBe(false);
  });
  it("returns the reviewed source date/URL and actual draft content", async () => {
    const account = await run("get_account", { prospectId });
    expect(account.evidence[0]).toMatchObject({
      date: "2026-10-10",
      url: "https://source.example",
    });
    const draft = await run("get_draft", { draftId });
    expect(draft.approved).toBe(false);
    expect(draft.touches[0].body).toEqual({
      untrusted: true,
      text: "Actual saved copy. Reply stop.",
      truncated: false,
    });
    expect(draft.sources[0].id).toBe("approved");
  });
  it("finds the latest saved draft from an actual prospect ID, without guessing draft IDs", async () => {
    const draft = await run("get_draft", { prospectId });
    expect(draft.draftId).toBe(draftId);
    expect(draft.communicationBasisRecorded).toBe(true);
    expect((await run("get_draft", {})).error).toBeTruthy();
  });
  it("only emits navigation for records in this workspace", async () => {
    const events: unknown[] = [];
    const tools = uiTools(actor, (event) => events.push(event));
    const exec = (name: string, input: unknown) =>
      (tools[name]!.execute! as any)(input, {
        toolCallId: "test",
        messages: [],
      });
    expect(
      await exec("open_account", { prospectId: randomUUID() }),
    ).toHaveProperty("error");
    expect(await exec("open_asset", { assetId: randomUUID() })).toHaveProperty(
      "error",
    );
    expect(
      await exec("select_accounts", {
        prospectIds: [prospectId, randomUUID()],
      }),
    ).toHaveProperty("error");
    expect(events).toHaveLength(0);
    await exec("open_account", { prospectId });
    await exec("open_screen", { screen: "Settings" });
    expect(events).toEqual([
      { kind: "open_account", prospectId },
      { kind: "navigate", screen: "Settings" },
    ]);
    expect(await run("list_assets", {}, randomUUID())).toEqual([]);
    expect(
      (await run("get_asset", { assetId: randomUUID() })).error,
    ).toBeTruthy();
  });
  it("does not disclose another workspace's accounts, drafts or runs", async () => {
    const other = randomUUID();
    expect(
      (await run("get_account", { prospectId }, other)).error,
    ).toBeTruthy();
    expect((await run("get_draft", { draftId }, other)).error).toBeTruthy();
    expect((await run("recent_runs", {}, other)).runs).toEqual([]);
  });
});
