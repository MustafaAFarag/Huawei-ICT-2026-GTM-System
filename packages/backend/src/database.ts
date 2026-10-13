import { createDatabase, Prisma, type PrismaClient } from "@revenue/database";
import { setTimeout as pause } from "node:timers/promises";

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
      const meta =
        error instanceof Prisma.PrismaClientKnownRequestError
          ? (error.meta as
              | {
                  code?: string;
                  driverAdapterError?: { cause?: { originalCode?: string } };
                }
              | undefined)
          : undefined;
      const sqlState =
        meta?.code ?? meta?.driverAdapterError?.cause?.originalCode;
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (["P2034", "P2002"].includes(error.code) ||
          (error.code === "P2010" &&
            ["40001", "40P01"].includes(sqlState ?? ""))) &&
        attempt < 4
      ) {
        await pause(10 * 2 ** attempt + Math.floor(Math.random() * 10));
        continue;
      }
      throw error;
    }
  }
  throw new Error("Transaction could not finish. Retry this action.");
}
