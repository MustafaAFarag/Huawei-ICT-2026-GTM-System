import { randomUUID } from "node:crypto";
import {
  Crm,
  db,
  digest,
  generateDemo,
  json,
  month,
  required,
  score,
  type DemoProspect,
  type DemoWorkspace,
} from "@revenue/backend";
import { hashPassword } from "@revenue/backend";
import { PLAYS, type Evidence, type Touch } from "@revenue/contracts";

// Seeds the two isolation-test workspaces (Revenue Demo A/B) plus eight synthetic demo
// workspaces that cover every plan tier and the agency client model (research 11 §5).
// Usage: pnpm db:seed [-- --crm] — --crm also writes the hero workspace's people to Twenty.
const syncCrm = process.argv.includes("--crm");
const email = required("DEMO_EMAIL"),
  password = required("DEMO_PASSWORD");
const user = await db.user.upsert({
  where: { email },
  create: { id: randomUUID(), name: "Demo owner", email, emailVerified: true },
  update: {},
});
if (
  !(await db.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  }))
)
  await db.account.create({
    data: {
      id: randomUUID(),
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: await hashPassword(password),
    },
  });

async function baseline(workspaceId: string) {
  await db.membership.upsert({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
    create: { workspaceId, userId: user.id, role: "owner" },
    update: {},
  });
  for (const play of PLAYS)
    await db.playVersion.upsert({
      where: {
        workspaceId_play_version: { workspaceId, play: play.id, version: 1 },
      },
      create: { workspaceId, play: play.id, version: 1, config: json(play) },
      update: {},
    });
  for (const provider of ["smartlead", "predictleads"])
    await db.connector.upsert({
      where: { workspaceId_provider: { workspaceId, provider } },
      create: { workspaceId, provider },
      update: {},
    });
}

for (const binding of ["A", "B"]) {
  let workspace = await db.workspace.findFirst({
    where: { crmBinding: binding, name: `Revenue Demo ${binding}` },
  });
  workspace ??= await db.workspace.create({
    data: {
      name: `Revenue Demo ${binding}`,
      crmBinding: binding,
      assetBinding: binding,
      plan: "Free",
      company: json({
        description: "Synthetic business growth consultancy",
        icp: "Founder-led B2B teams with 1–200 staff",
        marketingLicence: false,
      }),
      brand: json({
        name: `Revenue Demo ${binding}`,
        primary: "#252525",
        accent: "#6B7365",
        website: "https://example.com",
      }),
      offers: json([
        {
          id: "growth",
          text: "We help teams review their website and prepare a focused growth experiment.",
          approved: false,
        },
      ]),
    },
  });
  await baseline(workspace.id);
}

function draftContent(p: DemoProspect, offer: string): Touch[] {
  const fact = p.evidence.find((e) => e.approved && e.kind === "fact")!;
  const s = p.snapshot;
  const arabic = p.language !== "en";
  const opener =
    s.register === "founder"
      ? arabic
        ? "إحنا الاتنين بنبني شركات لنفس العملاء."
        : "We are both building for the same kind of companies."
      : arabic
        ? "بنشغّل الوظيفة دي كخدمة لشركات زيكم."
        : "We run this function as a service for teams like yours.";
  return [
    {
      channel: "email",
      day: 0,
      subject: arabic ? `فكرة لفريق ${s.company}` : `An idea for ${s.company}`,
      body: arabic
        ? `أهلًا ${s.firstName}\n\n${fact.claim}\n\n${opener} ${offer}\n\nتحب نتكلم عشر دقايق؟\nلو مش حابب تستقبل رسائل تانية رد بكلمة توقف`
        : `Hi ${s.firstName},\n\n${fact.claim}\n\n${opener} ${offer}\n\nWould a ten-minute conversation be useful?\nReply stop if you do not want further messages.`,
      evidenceIds: [fact.id],
    },
    {
      channel: "linkedin",
      day: 3,
      body: arabic
        ? `أهلًا ${s.firstName}، ${s.angle ?? offer}`
        : `Hi ${s.firstName}, ${s.angle ?? offer}. Open to comparing notes?`,
      evidenceIds: [],
    },
    {
      channel: "call",
      day: 7,
      body: arabic
        ? `اتصل واسأل عن الوقت المناسب لمناقشة: ${s.angle ?? offer}. راجع أساس التواصل قبل الاتصال.`
        : `Call to ask for a suitable time to discuss: ${s.angle ?? offer}. Check the communication basis before calling.`,
      evidenceIds: [],
    },
  ];
}

async function seedWorkspace(
  spec: DemoWorkspace,
  ids: Map<string, string>,
) {
  let workspace = await db.workspace.findFirst({
    where: { company: { path: ["demoKey"], equals: spec.key } },
  });
  const company = {
    ...spec.company,
    demoKey: spec.key,
    synthetic: true,
    ...(spec.parentKey
      ? { agencyClientOf: ids.get(spec.parentKey) ?? spec.parentKey }
      : {}),
  };
  const data = {
    name: spec.name,
    plan: spec.plan,
    crmBinding: spec.crmBinding,
    assetBinding: spec.crmBinding,
    timezone: spec.timezone,
    company: json(company),
    brand: json(spec.brand),
    offers: json(spec.offers),
    planLimits: json(spec.planLimits ?? {}),
  };
  workspace = workspace
    ? await db.workspace.update({ where: { id: workspace.id }, data })
    : await db.workspace.create({ data });
  ids.set(spec.key, workspace.id);
  await baseline(workspace.id);
  const m = month();
  for (const member of spec.members) {
    const u = await db.user.upsert({
      where: { email: member.email },
      create: {
        id: randomUUID(),
        name: member.name,
        email: member.email,
        emailVerified: true,
      },
      update: { name: member.name },
    });
    ids.set(member.key, u.id);
    await db.membership.upsert({
      where: { workspaceId_userId: { workspaceId: workspace.id, userId: u.id } },
      create: {
        workspaceId: workspace.id,
        userId: u.id,
        role: member.role,
        creditCap: member.creditCap,
      },
      update: { role: member.role, creditCap: member.creditCap ?? null },
    });
    if (member.creditCap !== undefined) {
      const id = `${workspace.id}:${u.id}:${m}`;
      await db.budget.upsert({
        where: { id },
        create: { id, workspaceId: workspace.id, userId: u.id, month: m, cap: member.creditCap },
        update: { cap: member.creditCap },
      });
    }
  }
  const budgetId = `${workspace.id}:${m}`;
  await db.budget.upsert({
    where: { id: budgetId },
    create: { id: budgetId, workspaceId: workspace.id, month: m, cap: spec.budget.cap, used: spec.budget.used },
    update: { cap: spec.budget.cap, used: spec.budget.used },
  });
  for (const q of spec.quotas) {
    const id = `${workspace.id}:${m}:${q.kind}`;
    await db.quota.upsert({
      where: { id },
      create: { id, workspaceId: workspace.id, month: m, kind: q.kind, cap: q.cap, used: q.used },
      update: { cap: q.cap, used: q.used },
    });
  }
  for (const s of spec.suppressions)
    await db.suppression.upsert({
      where: { workspaceId_identity: { workspaceId: workspace.id, identity: s.identity.toLowerCase() } },
      create: { workspaceId: workspace.id, identity: s.identity.toLowerCase(), reason: s.reason },
      update: {},
    });
  const saved = [];
  for (const p of spec.prospects) {
    const result = p.scored ? score(p.snapshot) : null;
    const ownerId = (p.snapshot.owner && ids.get(p.snapshot.owner)) || user.id;
    const row = {
      snapshot: json(p.snapshot),
      evidence: json(p.evidence),
      score: result?.score ?? null,
      breakdown: json(result ?? []),
      language: p.language,
      ownerId,
      lawfulBasis: p.lawfulBasis,
      consentAt: p.consentAt ? new Date(p.consentAt) : null,
      country: p.country,
      excluded: p.excluded,
    };
    saved.push(
      await db.prospect.upsert({
        where: { workspaceId_sourceKey: { workspaceId: workspace.id, sourceKey: p.sourceKey } },
        create: { workspaceId: workspace.id, sourceKey: p.sourceKey, ...row },
        update: row,
      }),
    );
  }
  // Seed a review queue from prospects that already have a reviewed fact.
  const offer = spec.offers.find((o) => o.approved)?.text;
  const ready = offer
    ? spec.prospects
        .map((p, i) => ({ p, row: saved[i]! }))
        .filter(({ p }) => !p.excluded && p.lawfulBasis && p.evidence.some((e) => e.approved && e.kind === "fact"))
        .slice(0, spec.drafts.pending + spec.drafts.approved)
    : [];
  const play = await db.playVersion.findFirst({ where: { workspaceId: workspace.id, play: "P3" } });
  for (const [index, { p, row }] of ready.entries()) {
    const requestKey = `seed:${spec.key}:draft:${p.sourceKey}`;
    const existing = await db.run.findUnique({
      where: { workspaceId_requestKey: { workspaceId: workspace.id, requestKey } },
    });
    if (existing) continue;
    const run = await db.run.create({
      data: {
        workspaceId: workspace.id,
        userId: user.id,
        tool: "draft_messages",
        requestKey,
        inputDigest: digest(requestKey),
        input: json({ tool: "draft_messages", play: "P3", prospectIds: [row.id], seeded: true }),
        state: "succeeded",
        estimate: 4,
        actualCost: 4,
        playVersionId: play?.id,
      },
    });
    const approved = index >= spec.drafts.pending;
    await db.draft.create({
      data: {
        workspaceId: workspace.id,
        prospectId: row.id,
        playVersionId: play!.id,
        runId: run.id,
        content: json(draftContent(p, offer!)),
        evidenceDigest: digest(row.evidence as Evidence[]),
        approvedVersion: approved ? 1 : null,
        approvedBy: approved ? user.id : null,
        approvedAt: approved ? new Date() : null,
      },
    });
  }
  if (syncCrm && spec.key === "qimam") {
    const crm = new Crm(workspace);
    let synced = 0;
    for (const row of saved) {
      if (row.crmPersonId) continue;
      // Twenty rate-limits bursts; back off and retry instead of failing the seed.
      let ids2: { crmPersonId: string; crmCompanyId: string } | undefined;
      for (let attempt = 0; !ids2; attempt++) {
        try {
          ids2 = await crm.upsertPerson(row.sourceKey, row.snapshot as never);
        } catch (error) {
          if (attempt >= 6 || !String(error).includes("429")) throw error;
          await new Promise((r) => setTimeout(r, 5000 * (attempt + 1)));
        }
      }
      await new Promise((r) => setTimeout(r, 150));
      await db.prospect.update({ where: { id: row.id }, data: ids2 });
      synced++;
    }
    console.log(`  CRM: ${synced} people written to Twenty ${spec.crmBinding}.`);
  }
  console.log(
    `  ${spec.name} (${spec.plan}): ${saved.length} contacts, ${ready.length} drafts, ${spec.suppressions.length} suppressions`,
  );
}

const ids = new Map<string, string>();
console.log("Seeding synthetic demo workspaces:");
for (const spec of generateDemo()) await seedWorkspace(spec, ids);
console.log(
  "Demo workspaces ready. Sign in with DEMO_EMAIL and DEMO_PASSWORD from the local .env file.",
);
await db.$disconnect();
