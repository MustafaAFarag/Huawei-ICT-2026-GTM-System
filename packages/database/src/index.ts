import { PrismaClient, Prisma } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export { PrismaClient, Prisma };
export type * from "@prisma/client";

export function createDatabase(url = process.env.DATABASE_URL): PrismaClient {
  if (!url) throw new Error("DATABASE_URL is required. Run local setup first.");
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: url,
      connectionTimeoutMillis: 5000,
      query_timeout: 15000,
      max: 10,
    }),
  });
}
