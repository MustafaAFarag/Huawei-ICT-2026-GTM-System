import "reflect-metadata";
import { Module } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { createServer } from "node:http";
import { startWorker, workerHealth } from "@revenue/backend";
@Module({})
class WorkerModule {}
const app = await NestFactory.createApplicationContext(WorkerModule);
const close = startWorker();
const health = createServer(async (request, response) => {
  if (request.url !== "/health") {
    response.writeHead(404).end();
    return;
  }
  try {
    await workerHealth();
    response
      .writeHead(200, { "Content-Type": "application/json" })
      .end('{"status":"ok"}');
  } catch {
    response.writeHead(503).end('{"status":"unavailable"}');
  }
});
health.listen(
  Number(process.env.WORKER_PORT ?? 4101),
  process.env.API_HOST ?? "127.0.0.1",
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, async () => {
    health.close();
    await close();
    await app.close();
    process.exit(0);
  });
console.log("Revenue worker ready.");
