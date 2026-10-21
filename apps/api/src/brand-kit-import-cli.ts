import { db, runBrandKitImport } from "@revenue/backend";

async function main() {
  const args = process.argv.slice(2);
  if (args.length !== 1 || !["--dry-run", "--apply"].includes(args[0] ?? "")) {
    throw new Error("Use exactly one option: --dry-run or --apply.");
  }
  const result = await runBrandKitImport({ apply: args[0] === "--apply" });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
}

try {
  await main();
} catch (error) {
  process.stderr.write(
    `${error instanceof Error ? error.message : "Brand kit import failed."}\n`,
  );
  process.exitCode = 1;
} finally {
  await db.$disconnect();
}
