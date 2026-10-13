import { db, Crm } from "../packages/backend/src/index.js";
const [a, b] = await Promise.all(
  ["A", "B"].map((crmBinding) =>
    db.workspace.findFirstOrThrow({ where: { crmBinding } }),
  ),
);
try {
  const crmA = new Crm(a),
    crmB = new Crm(b);
  const people = await crmA.request<{ data: { people: { id: string }[] } }>(
    "people?filter=" +
      encodeURIComponent(
        "emails.primaryEmail[eq]:noura@synthetic-demo.example",
      ),
  );
  const id = people.data.people[0]!.id;
  const others = await crmB.request<{ data: { people: { id: string }[] } }>(
    "people?filter=" + encodeURIComponent(`id[eq]:${id}`),
  );
  if (others.data.people.length)
    throw new Error("CRM workspace isolation failed.");
  console.log("Native CRM record from workspace A is absent from workspace B.");
} finally {
  await db.$disconnect();
}
