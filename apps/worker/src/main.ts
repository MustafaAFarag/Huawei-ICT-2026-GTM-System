import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { startWorker } from "@revenue/backend";
@Module({})
class WorkerModule {}
const app = await NestFactory.createApplicationContext(WorkerModule);
const close = startWorker();
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    await close();
    await app.close();
    process.exit(0);
  });
console.log("Revenue worker ready.");
