import { db, Crm } from "../packages/backend/src/index.js";
const workspace = await db.workspace.findFirstOrThrow({
  where: { crmBinding: "A" },
});
const snapshot = {
  firstName: "Noura",
  lastName: "Demo",
  email: "noura@synthetic-demo.example",
  company: "Synthetic Growth Lab",
  website: "https://example.com",
  title: "Founder",
  employees: 15,
  hiring: true,
};
try {
  const crm = new Crm(workspace);
  const first = await crm.upsertPerson(snapshot.email, snapshot);
  const second = await crm.upsertPerson(snapshot.email, snapshot, first);
  console.log(
    "CRM create/update idempotent:",
    first.crmPersonId === second.crmPersonId,
  );
  console.log("Native CRM IDs", first);
} finally {
  await db.$disconnect();
}
