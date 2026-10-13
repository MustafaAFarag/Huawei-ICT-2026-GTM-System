import { spawn } from "node:child_process";
import { mkdir, chmod, copyFile, writeFile, stat } from "node:fs/promises";
import { createWriteStream } from "node:fs";
import { pipeline } from "node:stream/promises";
import { resolve, join } from "node:path";
// Invoke from the repository root after pausing product execution; private backups are ignored by Git.
const directory = resolve(
  ".local/backups",
  new Date().toISOString().replaceAll(":", "-"),
);
await mkdir(directory, { recursive: true, mode: 0o700 });
async function capture(args, filename) {
  const process = spawn("docker", args, { stdio: ["ignore", "pipe", "pipe"] });
  let failure = "";
  process.stderr.on("data", (chunk) => (failure += chunk));
  const completion = new Promise((resolve, reject) => {
    process.once("error", reject);
    process.once("exit", (code) =>
      code === 0
        ? resolve()
        : reject(
            new Error(`Backup failed (${code}): ${failure.slice(0, 200)}`),
          ),
    );
  });
  await Promise.all([
    pipeline(
      process.stdout,
      createWriteStream(join(directory, filename), { mode: 0o600 }),
    ),
    completion,
  ]);
}
for (const name of ["revenue", "twenty"])
  await capture(
    [
      "compose",
      "exec",
      "-T",
      "postgres",
      "pg_dump",
      "-U",
      "revenue",
      "-Fc",
      name,
    ],
    `${name}.dump`,
  );
await capture(
  [
    "run",
    "--rm",
    "--network=none",
    "--mount",
    `type=bind,source=${resolve(".local/assets")},target=/assets,readonly`,
    "--mount",
    `type=bind,source=${resolve(".local/vault")},target=/vault,readonly`,
    "postgres:16.10-alpine",
    "tar",
    "-czf",
    "-",
    "-C",
    "/",
    "assets",
    "vault",
  ],
  "product-files.tar.gz",
);
await copyFile(".env", join(directory, "local-secrets.env"));
await chmod(join(directory, "local-secrets.env"), 0o600);
await writeFile(
  join(directory, "manifest.json"),
  JSON.stringify(
    {
      createdAt: new Date().toISOString(),
      productDatabase: "revenue",
      crmDatabase: "twenty",
      encryptedConnectorVaultIncluded: true,
      privateLocalEnvironmentIncluded: true,
      upstreamEngineVolumesIncluded: false,
      files: await Promise.all(
        ["revenue.dump", "twenty.dump", "product-files.tar.gz"].map(
          async (name) => ({
            name,
            bytes: (await stat(join(directory, name))).size,
          }),
        ),
      ),
    },
    null,
    2,
  ),
  { mode: 0o600 },
);
console.log(
  `Private backup saved to ${directory}. Upstream file volumes require a separate quiesced snapshot; see docs/OPERATIONS.md.`,
);
