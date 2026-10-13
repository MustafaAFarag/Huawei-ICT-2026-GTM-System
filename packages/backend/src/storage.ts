import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join, resolve, sep } from "node:path";
import { BlobServiceClient } from "@azure/storage-blob";
import { DefaultAzureCredential } from "@azure/identity";
import { config, required } from "./config.js";

export class Storage {
  private azure =
    process.env.STORAGE_DRIVER === "azure"
      ? new BlobServiceClient(
          required("AZURE_BLOB_ACCOUNT_URL"),
          new DefaultAzureCredential(),
        )
      : undefined;
  private key(workspaceId: string, key: string) {
    if (!/^[a-zA-Z0-9-]+$/.test(workspaceId) || !/^[a-zA-Z0-9.-]+$/.test(key))
      throw new Error("Invalid asset key.");
    return `${workspaceId}/${key}`;
  }
  async put(
    workspaceId: string,
    key: string,
    data: Buffer | string,
    contentType: string,
  ) {
    const blob = this.key(workspaceId, key);
    if (this.azure) {
      const container = this.azure.getContainerClient(
        process.env.AZURE_BLOB_CONTAINER ?? "assets",
      );
      await container.getBlockBlobClient(blob).uploadData(Buffer.from(data), {
        blobHTTPHeaders: { blobContentType: contentType },
      });
    } else {
      const root = resolve(config.storagePath);
      const target = resolve(root, blob);
      if (!target.startsWith(root + sep))
        throw new Error("Invalid asset path.");
      await mkdir(join(root, workspaceId), { recursive: true });
      await writeFile(target, data, { mode: 0o600 });
    }
    return key;
  }
  async get(workspaceId: string, key: string) {
    const blob = this.key(workspaceId, key);
    if (this.azure)
      return this.azure
        .getContainerClient(process.env.AZURE_BLOB_CONTAINER ?? "assets")
        .getBlockBlobClient(blob)
        .downloadToBuffer();
    return readFile(join(resolve(config.storagePath), blob));
  }
}
