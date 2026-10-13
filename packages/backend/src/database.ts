import { createDatabase, Prisma, type PrismaClient } from "@revenue/database";

export const db: PrismaClient = createDatabase();
export const json = (value: unknown): Prisma.InputJsonValue =>
  JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;

export async function serializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.$transaction(operation, {
        isolationLevel: "Serializable",
        timeout: 30000,
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        ["P2034", "P2002"].includes(error.code) &&
        attempt < 4
      )
        continue;
      throw error;
    }
  }
  throw new Error("Transaction could not finish. Retry this action.");
}
