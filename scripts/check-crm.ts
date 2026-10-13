import { writeFile } from "node:fs/promises";
process.loadEnvFile(".env");
const key = process.env.TWENTY_A_API_KEY;
if (!key) throw new Error("Workspace A key not configured.");
for (const path of ["rest/companies?limit=1", "rest/open-api"]) {
  const response = await fetch(`http://127.0.0.1:3200/${path}`, {
    headers: { Authorization: `Bearer ${key}` },
  });
  console.log(path, response.status);
  const body = await response.json();
  if (path.includes("open-api"))
    await writeFile(".local/twenty-openapi.json", JSON.stringify(body), {
      mode: 0o600,
    });
  else console.log(JSON.stringify(body).slice(0, 1000));
}
