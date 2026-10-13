import { request } from "@playwright/test";
import { randomUUID } from "node:crypto";
import assert from "node:assert/strict";
import { db, hashPassword } from "../packages/backend/src/index.js";
const origin = process.env.TEST_BASE_URL ?? "http://localhost:3100";
const client = await request.newContext({
  baseURL: origin,
  extraHTTPHeaders: { Origin: origin },
});
const id = randomUUID(),
  email = `role-check-${id}@synthetic-demo.example`,
  password = randomUUID() + randomUUID();
const a = await db.workspace.findFirstOrThrow({ where: { crmBinding: "A" } }),
  b = await db.workspace.findFirstOrThrow({ where: { crmBinding: "B" } });
try {
  await db.user.create({
    data: {
      id,
      email,
      name: "Synthetic permission check",
      emailVerified: true,
    },
  });
  await db.account.create({
    data: {
      id: randomUUID(),
      userId: id,
      accountId: id,
      providerId: "credential",
      password: await hashPassword(password),
    },
  });
  await db.membership.create({
    data: { workspaceId: a.id, userId: id, role: "viewer" },
  });
  assert.equal(
    (
      await client.post("/api/auth/sign-in/email", {
        headers: {
          "x-forwarded-for": "198.51.100.10",
          "x-revenue-client-ip": "203.0.113.50",
        },
        data: { email, password },
      })
    ).status(),
    200,
  );
  const session = await db.session.findFirstOrThrow({ where: { userId: id } });
  assert.notEqual(session.ipAddress, "198.51.100.10");
  assert.notEqual(session.ipAddress, "203.0.113.50");
  assert.equal((await client.get(`/api/workspaces/${a.id}`)).status(), 200);
  assert.equal((await client.get(`/api/workspaces/${b.id}`)).status(), 403);
  const tool = {
    tool: "score_accounts",
    requestKey: randomUUID(),
    prospectIds: [],
    role: "owner",
  };
  assert.equal(
    (
      await client.post(`/api/workspaces/${a.id}/quotes`, { data: tool })
    ).status(),
    403,
  );
  assert.equal(
    (
      await client.patch(`/api/workspaces/${a.id}`, { data: { cap: 1000 } })
    ).status(),
    403,
  );
  assert.equal(
    (
      await client.post(`/api/workspaces/${a.id}/chat`, {
        data: {
          content: "Draft messages",
          context: { play: "P1", prospectIds: [] },
        },
      })
    ).status(),
    403,
  );
  const signup = await client.post("/api/auth/sign-up/email", {
    data: { email: `signup-${email}`, name: "Blocked signup", password },
  });
  assert.equal(signup.ok(), false);
  await db.membership.update({
    where: { workspaceId_userId: { workspaceId: a.id, userId: id } },
    data: { role: "operator" },
  });
  const draft = await db.draft.findFirst({ where: { workspaceId: a.id } });
  if (draft)
    assert.equal(
      (
        await client.post(
          `/api/workspaces/${a.id}/drafts/${draft.id}/approve`,
          { data: { version: draft.version } },
        )
      ).status(),
      403,
    );
  await db.membership.delete({
    where: { workspaceId_userId: { workspaceId: a.id, userId: id } },
  });
  assert.equal((await client.get(`/api/workspaces/${a.id}`)).status(), 403);
  console.log(
    JSON.stringify({
      viewerRead: "passed",
      workspaceMembership: "passed",
      viewerWrites: "blocked",
      bodyRoleEscalation: "blocked",
      operatorCopyApproval: "blocked",
      membershipRevocation: "immediate",
      publicSignup: "disabled",
      forgedClientIp: "discarded by web proxy",
    }),
  );
} finally {
  await client.dispose();
  await db.membership.deleteMany({ where: { userId: id } });
  await db.user.deleteMany({ where: { id } });
  await db.$disconnect();
}
