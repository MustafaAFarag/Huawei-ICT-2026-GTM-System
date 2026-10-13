import { readFile, writeFile } from "node:fs/promises";
process.loadEnvFile(".env");
const binding = process.argv[2] ?? "A";
const key = process.env[`TWENTY_${binding}_API_KEY`];
async function gql(query: string, variables = {}) {
  const response = await fetch("http://127.0.0.1:3200/metadata", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });
  const result = await response.json();
  if (result.errors) throw new Error(JSON.stringify(result.errors));
  return result.data;
}
const schema = await gql(
  'query { __type(name:"CreateApplicationRegistrationInput") { inputFields { name type { kind name ofType {kind name} } } } }',
);
console.log(JSON.stringify(schema));
if (process.argv[3] === "create") {
  const manifest = JSON.parse(
    await readFile("twenty-app/.twenty/output/manifest.json", "utf8"),
  );
  const result = await gql(
    "mutation($input: CreateApplicationRegistrationInput!) { createApplicationRegistration(input:$input) { applicationRegistration { id universalIdentifier oAuthClientId } } }",
    {
      input: {
        name: "Revenue Workspace",
        universalIdentifier: manifest.application.universalIdentifier,
        oAuthRedirectUris: [],
        oAuthScopes: [],
      },
    },
  );
  await writeFile(
    `.local/twenty-registration-${binding}.json`,
    JSON.stringify(result),
    { mode: 0o600 },
  );
  console.log(`Native app registered for workspace ${binding}.`);
}
