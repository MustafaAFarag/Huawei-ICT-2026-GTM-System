import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { randomUUID } from "node:crypto";
import {
  db,
  json,
  Crm,
  WorkspaceService,
  ImportHistoryService,
} from "@revenue/backend";
const workspaceId = randomUUID(),
  userId = randomUUID();
const actor = { workspaceId, userId, role: "owner" as const };
const imports = new WorkspaceService(),
  history = new ImportHistoryService();
let firstId: string, secondId: string, secondKey: string;
const header = "firstName,lastName,email,company,website,title\n";
const first = Buffer.from(
  header +
    "Huda,Saeedi,huda@lumaro.example,Lumaro Pay,https://lumaro.example,Head of People\nTarek,Mansouri,tarek@lumaro.example,Lumaro Pay,https://lumaro.example,Founder\n",
);
const second = Buffer.from(
  header +
    "Huda,Saeedi,huda@lumaro.example,Lumaro Pay,https://lumaro.example,Finance Director\nTarek,Mansouri,tarek@lumaro.example,Lumaro Pay,https://lumaro.example,Founder\nReem,Nassar,reem@barix.example,Barix Logistics,https://barix.example,Operations Director\n",
);
beforeAll(async () => {
  await db.workspace.create({
    data: {
      id: workspaceId,
      name: "Import history test",
      crmBinding: "A",
      assetBinding: "A",
    },
  });
  await db.user.create({
    data: {
      id: userId,
      name: "Import tester",
      email: `${userId}@example.test`,
    },
  });
  await db.membership.create({ data: { workspaceId, userId, role: "owner" } });
  vi.spyOn(Crm.prototype, "upsertPerson").mockImplementation(
    async (_key, _snapshot, existing) => ({
      crmPersonId: existing?.crmPersonId ?? randomUUID(),
      crmCompanyId: existing?.crmCompanyId ?? randomUUID(),
    }),
  );
});
afterAll(async () => {
  vi.restoreAllMocks();
  for (const model of [db.importBatch, db.audit, db.draft, db.prospect])
    await (model.deleteMany as (args: object) => Promise<unknown>)({
      where: { workspaceId },
    });
  await db.workspace.delete({ where: { id: workspaceId } });
  await db.user.delete({ where: { id: userId } });
});
describe("import history and revisions", () => {
  it("records file revisions and field-level differences while preserving retry identity", async () => {
    const a = await imports.import(actor, first, "Leads.csv", randomUUID());
    firstId = a.id;
    const firstHistory = await history.detail(actor, firstId);
    expect(firstHistory.version).toBe(1);
    expect(firstHistory.counts).toMatchObject({
      added: 2,
      changed: 0,
      unchanged: 0,
    });
    secondKey = randomUUID();
    const b = await imports.import(actor, second, "leads.csv", secondKey);
    secondId = b.id;
    const secondHistory = await history.detail(actor, secondId);
    expect(secondHistory).toMatchObject({
      version: 2,
      previousId: firstId,
      rowCount: 3,
      legacy: false,
      status: "completed",
    });
    expect(secondHistory.counts).toMatchObject({
      added: 1,
      changed: 1,
      unchanged: 1,
    });
    expect(secondHistory.outcomes[0]!.changes).toContainEqual({
      field: "title",
      before: "Head of People",
      after: "Finance Director",
    });
    const retried = await imports.import(actor, second, "leads.csv", secondKey);
    expect(retried.id).toBe(secondId);
    expect(await db.importBatch.count({ where: { workspaceId } })).toBe(2);
    expect(await db.prospect.count({ where: { workspaceId } })).toBe(3);
  });
  it("allocates distinct versions under concurrent uploads", async () => {
    const results = await Promise.all([
      imports.import(actor, second, "leads.csv", randomUUID()),
      imports.import(actor, second, "leads.csv", randomUUID()),
    ]);
    const versions = await Promise.all(
      results.map((result) => history.detail(actor, result.id)),
    );
    expect(versions.map((v) => v.version).sort()).toEqual([3, 4]);
    expect(await db.prospect.count({ where: { workspaceId } })).toBe(3);
  });
  it("keeps legacy imports readable and reports interrupted processing honestly", async () => {
    const legacy = await db.importBatch.create({
      data: {
        workspaceId,
        requestKey: randomUUID(),
        digest: "legacy",
        outcomes: json([{ row: 2, state: "imported", message: "Unchanged" }]),
      },
    });
    expect(await history.detail(actor, legacy.id)).toMatchObject({
      legacy: true,
      filename: null,
      counts: { unchanged: 1 },
    });
    const interrupted = await db.importBatch.create({
      data: {
        workspaceId,
        requestKey: randomUUID(),
        digest: "interrupted",
        rowCount: 10,
        outcomes: [],
      },
    });
    expect((await history.detail(actor, interrupted.id)).status).toBe(
      "interrupted",
    );
  });
  it("paginates without leaking another workspace's history or file metadata", async () => {
    await db.importBatch.createMany({
      data: Array.from({ length: 21 }, () => ({
        workspaceId,
        requestKey: randomUUID(),
        digest: "pagination",
        outcomes: [],
      })),
    });
    const page = await history.list(actor);
    expect(page.batches).toHaveLength(20);
    expect(page.nextCursor).toBeTruthy();
    const next = await history.list(actor, page.nextCursor!);
    expect(
      next.batches.every((b) => !page.batches.some((p) => p.id === b.id)),
    ).toBe(true);
    const other = { ...actor, workspaceId: randomUUID() };
    expect((await history.list(other)).batches).toEqual([]);
    await expect(history.detail(other, firstId)).rejects.toThrow(
      "Import not found",
    );
    await expect(history.list(other, page.nextCursor!)).rejects.toThrow(
      "Import not found",
    );
  });
});
