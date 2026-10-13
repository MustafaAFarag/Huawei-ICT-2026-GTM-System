import {
  randomBytes,
  randomUUID,
  createCipheriv,
  createDecipheriv,
  createHash,
} from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { DefaultAzureCredential } from "@azure/identity";
import { SecretClient } from "@azure/keyvault-secrets";
import { ROOT, required } from "./config.js";

export class Vault {
  private azure =
    process.env.SECRET_DRIVER === "azure"
      ? new SecretClient(
          required("AZURE_KEY_VAULT_URL"),
          new DefaultAzureCredential(),
        )
      : undefined;
  async put(workspaceId: string, value: string) {
    const ref = `rw-${workspaceId}-${randomUUID()}`;
    if (this.azure) {
      await this.azure.setSecret(ref, value);
      return ref;
    }
    const directory = join(ROOT, ".local/vault");
    await mkdir(directory, { recursive: true, mode: 0o700 });
    const iv = randomBytes(12);
    const cipher = createCipheriv(
      "aes-256-gcm",
      createHash("sha256").update(required("BETTER_AUTH_SECRET")).digest(),
      iv,
    );
    const encrypted = Buffer.concat([
      cipher.update(value, "utf8"),
      cipher.final(),
    ]);
    await writeFile(
      join(directory, ref),
      Buffer.concat([iv, cipher.getAuthTag(), encrypted]),
      { mode: 0o600 },
    );
    return ref;
  }
  async get(workspaceId: string, ref: string) {
    if (!ref.startsWith(`rw-${workspaceId}-`) || !/^[a-zA-Z0-9-]+$/.test(ref))
      throw new Error("Credential does not belong to this workspace.");
    if (this.azure) return (await this.azure.getSecret(ref)).value ?? "";
    const content = await readFile(join(ROOT, ".local/vault", ref));
    const decipher = createDecipheriv(
      "aes-256-gcm",
      createHash("sha256").update(required("BETTER_AUTH_SECRET")).digest(),
      content.subarray(0, 12),
    );
    decipher.setAuthTag(content.subarray(12, 28));
    return Buffer.concat([
      decipher.update(content.subarray(28)),
      decipher.final(),
    ]).toString("utf8");
  }
}
