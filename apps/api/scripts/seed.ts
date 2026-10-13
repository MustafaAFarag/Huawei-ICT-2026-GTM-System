import { randomUUID } from "node:crypto";
import { db, json, required } from "@revenue/backend";
import { hashPassword } from "@revenue/backend";
import { PLAYS, PLANS } from "@revenue/contracts";
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
for (const binding of ["A", "B"]) {
  let workspace = await db.workspace.findFirst({
    where: { crmBinding: binding },
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
  await db.membership.upsert({
    where: {
      workspaceId_userId: { workspaceId: workspace.id, userId: user.id },
    },
    create: { workspaceId: workspace.id, userId: user.id, role: "owner" },
    update: {},
  });
  for (const play of PLAYS)
    await db.playVersion.upsert({
      where: {
        workspaceId_play_version: {
          workspaceId: workspace.id,
          play: play.id,
          version: 1,
        },
      },
      create: {
        workspaceId: workspace.id,
        play: play.id,
        version: 1,
        config: json(play),
      },
      update: {},
    });
  for (const provider of ["smartlead", "predictleads"])
    await db.connector.upsert({
      where: { workspaceId_provider: { workspaceId: workspace.id, provider } },
      create: { workspaceId: workspace.id, provider },
      update: {},
    });
}
console.log(
  "Two demo workspaces ready. Sign in with DEMO_EMAIL and DEMO_PASSWORD from the local .env file.",
);
await db.$disconnect();
