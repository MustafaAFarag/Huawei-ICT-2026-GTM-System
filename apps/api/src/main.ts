import "reflect-metadata";
import { toolRequest } from "@revenue/contracts";
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  Res,
  Body,
  Module,
  HttpException,
  BadRequestException,
  Catch,
  type ExceptionFilter,
  type ArgumentsHost,
} from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  SwaggerModule,
  DocumentBuilder,
  ApiTags,
  ApiOperation,
} from "@nestjs/swagger";
import express, { type Request, type Response } from "express";
import multer from "multer";
import { z, ZodError } from "zod";
import {
  actorFor,
  sessionUser,
  auth,
  toNodeHandler,
  db,
  json,
  config,
  WorkspaceService,
  WorkflowService,
  Storage,
  assertRole,
  digest,
  Vault,
  Crm,
  safeError,
  handleMcp,
  senderEvent,
  serializable,
} from "@revenue/backend";
import type { Actor } from "@revenue/contracts";

const workspaceService = new WorkspaceService(),
  workflows = new WorkflowService(),
  storage = new Storage();
@Catch()
class Errors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const status =
      error instanceof HttpException
        ? error.getStatus()
        : error instanceof ZodError
          ? 400
          : 500;
    response.status(status).json({
      message:
        error instanceof ZodError
          ? error.issues
              .map((i) => `${i.path.join(".")}: ${i.message}`)
              .join("; ")
          : error instanceof HttpException
            ? error.message
            : safeError(error),
    });
  }
}
@ApiTags("Revenue Workspace")
@Controller("api")
class ApiController {
  @Get("health") async health() {
    await db.$queryRaw`SELECT 1`;
    return { status: "ok", mode: config.fixture ? "fixture" : "live" };
  }
  @Get("me") async me(@Req() req: Request) {
    const user = await sessionUser(req.headers);
    return {
      user,
      workspaces: await db.membership.findMany({
        where: { userId: user.id },
        include: { workspace: { select: { id: true, name: true } } },
      }),
    };
  }
  @Get("workspaces/:workspaceId") async dashboard(
    @Req() req: Request,
    @Param("workspaceId") id: string,
  ) {
    return workspaceService.dashboard(await actorFor(req.headers, id));
  }
  @Patch("workspaces/:workspaceId") async configure(
    @Req() req: Request,
    @Param("workspaceId") id: string,
    @Body() body: unknown,
  ) {
    return workspaceService.configure(await actorFor(req.headers, id), body);
  }
  @Patch("workspaces/:workspaceId/prospects/:id") async prospect(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return workspaceService.reviewProspect(
      await actorFor(req.headers, ws),
      id,
      body,
    );
  }
  @Patch("workspaces/:workspaceId/drafts/:id") async draft(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return workspaceService.draft(
      await actorFor(req.headers, ws),
      id,
      body,
      false,
    );
  }
  @Post("workspaces/:workspaceId/drafts/:id/approve") async approveDraft(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return workspaceService.draft(
      await actorFor(req.headers, ws),
      id,
      body,
      true,
    );
  }
  @ApiOperation({
    summary: "Create a cost quote bound to audience, copy, evidence and sender",
  })
  @Post("workspaces/:workspaceId/quotes")
  async quote(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    return workflows.quote(await actorFor(req.headers, ws), body);
  }
  @Post("workspaces/:workspaceId/quotes/:id/approve") async approveQuote(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    return workflows.approveQuote(await actorFor(req.headers, ws), id);
  }
  @Post("workspaces/:workspaceId/runs") async run(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    return workflows.start(await actorFor(req.headers, ws), body);
  }
  @Post("workspaces/:workspaceId/runs/:id/cancel") async cancel(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    return workflows.cancel(await actorFor(req.headers, ws), id);
  }
  @Get("workspaces/:workspaceId/runs/:id/events") async events(
    @Req() req: Request,
    @Res() res: Response,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    const actor = await actorFor(req.headers, ws);
    let after = Number(req.headers["last-event-id"] || req.query.after || 0);
    if (!Number.isSafeInteger(after) || after < 0) after = 0;
    await workflows.events(actor, id, after);
    res.set({
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });
    res.flushHeaders();
    let busy = false;
    const tick = async () => {
      if (busy || res.destroyed) return;
      busy = true;
      try {
        await actorFor(req.headers, ws);
        const events = await workflows.events(actor, id, after);
        for (const event of events) {
          res.write(`id: ${event.id}\ndata: ${JSON.stringify(event)}\n\n`);
          after = event.id;
        }
        res.write(": heartbeat\n\n");
        const run = await db.run.findUnique({ where: { id } });
        if (run && ["failed", "succeeded"].includes(run.state)) {
          clearInterval(interval);
          res.end();
        }
      } catch {
        clearInterval(interval);
        res.end();
      } finally {
        busy = false;
      }
    };
    const interval = setInterval(tick, 1000);
    void tick();
    req.on("close", () => clearInterval(interval));
  }
  @Post("workspaces/:workspaceId/suppressions") async suppress(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    const input = z
      .object({
        identity: z.string().max(300),
        reason: z.string().min(1).max(500),
      })
      .parse(body);
    return workspaceService.suppress(
      await actorFor(req.headers, ws),
      input.identity,
      input.reason,
    );
  }
  @Post("workspaces/:workspaceId/assets/:id/approve") async assetApprove(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    const actor = await actorFor(req.headers, ws);
    assertRole(actor, "approve");
    const asset = await db.asset.findFirstOrThrow({
      where: { id, workspaceId: ws },
    });
    const prospect = await db.prospect.findFirstOrThrow({
      where: { id: asset.prospectId!, workspaceId: ws },
    });
    if (asset.evidenceDigest !== digest(prospect.evidence))
      throw new HttpException(
        "Evidence changed. Generate and review a new asset.",
        409,
      );
    return db.asset.update({
      where: { id },
      data: { approvedAt: new Date(), approvedBy: actor.userId },
    });
  }
  @Post("workspaces/:workspaceId/drafts/:id/asset") async attachAsset(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const actor = await actorFor(req.headers, ws);
    assertRole(actor, "write");
    const input = z
      .object({ assetId: z.uuid(), version: z.number().int().positive() })
      .parse(body);
    return serializable(async (tx) => {
      const draft = await tx.draft.findFirstOrThrow({
        where: { id, workspaceId: ws },
      });
      const asset = await tx.asset.findFirstOrThrow({
        where: {
          id: input.assetId,
          workspaceId: ws,
          prospectId: draft.prospectId,
          approvedAt: { not: null },
        },
      });
      if (draft.version !== input.version)
        throw new HttpException("This draft changed. Reload it.", 409);
      await tx.sequence.updateMany({
        where: {
          workspaceId: ws,
          draftId: id,
          state: { notIn: ["completed", "failed", "cancelled"] },
        },
        data: { state: "cancelled" },
      });
      return tx.draft.update({
        where: { id },
        data: {
          assetId: asset.id,
          version: { increment: 1 },
          approvedVersion: null,
          approvedAt: null,
          approvedBy: null,
        },
      });
    });
  }
  @Post("workspaces/:workspaceId/events/simulate") async simulate(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    if (!config.fixture)
      throw new HttpException(
        "Simulated events are available only in fixture mode.",
        403,
      );
    return senderEvent(await actorFor(req.headers, ws), body);
  }
  @Get("workspaces/:workspaceId/assets/:id/:format") async asset(
    @Req() req: Request,
    @Res() res: Response,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Param("format") format: string,
  ) {
    await actorFor(req.headers, ws);
    const asset = await db.asset.findFirst({ where: { id, workspaceId: ws } });
    if (!asset || !["html", "pdf"].includes(format))
      throw new HttpException("Asset not found.", 404);
    if (
      format === "pdf" &&
      (!asset.approvedAt ||
        asset.evidenceDigest !==
          digest(
            (
              await db.prospect.findFirstOrThrow({
                where: { id: asset.prospectId!, workspaceId: ws },
              })
            ).evidence,
          ))
    )
      throw new HttpException(
        "Review and approve this asset before exporting its PDF.",
        409,
      );
    const key = format === "pdf" ? asset.pdfKey : asset.htmlKey;
    if (!key)
      throw new HttpException("This export is still being prepared.", 409);
    res.set(
      "Content-Type",
      format === "pdf" ? "application/pdf" : "text/html; charset=utf-8",
    );
    res.removeHeader("X-Frame-Options");
    res.set(
      "Content-Security-Policy",
      "sandbox; frame-ancestors 'self'; default-src 'none'; style-src 'unsafe-inline'; img-src data:; font-src 'none'",
    );
    if (format === "pdf")
      res.set(
        "Content-Disposition",
        `attachment; filename="${asset.template}-${asset.language}.pdf"`,
      );
    res.send(await storage.get(ws, key));
  }
  @Get("workspaces/:workspaceId/chat") async history(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
  ) {
    const actor = await actorFor(req.headers, ws);
    return db.chatMessage.findMany({
      where: { workspaceId: ws, userId: actor.userId },
      orderBy: { createdAt: "asc" },
      take: 200,
    });
  }
  @Post("workspaces/:workspaceId/chat") async chat(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    const actor = await actorFor(req.headers, ws);
    assertRole(actor, "write");
    const input = z
      .object({
        content: z.string().min(1).max(3000),
        context: z.object({
          play: z.enum(["P1", "P2", "P3", "P4"]),
          prospectIds: z.array(z.uuid()).max(100),
        }),
      })
      .parse(body);
    await db.chatMessage.create({
      data: {
        workspaceId: ws,
        userId: actor.userId,
        role: "user",
        content: input.content,
        context: json(input.context),
      },
    });
    if (!config.modelFixture)
      return {
        content:
          "Review the assistant model cost before I prepare a proposed task.",
        tool: "assistant",
        context: input.context,
        requiresApproval: true,
      };
    const tool = /pre.flight|mailbox|inbox/i.test(input.content)
      ? "preflight"
      : /audit|website/i.test(input.content)
        ? "mini_audit"
        : /signal|hiring|fund/i.test(input.content)
          ? "find_signals"
          : /enrich/i.test(input.content)
            ? "enrich_contacts"
            : /asset|pdf|one.pager/i.test(input.content)
              ? "make_asset"
              : /draft|message/i.test(input.content)
                ? "draft_messages"
                : "score_accounts";
    const content = `I can prepare ${tool.replaceAll("_", " ")} for your selected records. Review the proposed action and its cost below. ${config.fixture ? "This is the fixture assistant; no model call or live message will be made." : "A model assistant is not activated until its gateway is verified."}`;
    await db.chatMessage.create({
      data: {
        workspaceId: ws,
        userId: actor.userId,
        role: "assistant",
        content,
        context: json({ ...input.context, tool }),
      },
    });
    return { content, tool, context: input.context };
  }
  @Post("workspaces/:workspaceId/connectors/:provider") async connector(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("provider") provider: string,
    @Body() body: unknown,
  ) {
    const actor = await actorFor(req.headers, ws);
    assertRole(actor, "admin");
    z.enum(["smartlead", "predictleads"]).parse(provider);
    const input = z
      .object({ secret: z.string().min(10).max(4000) })
      .parse(body);
    if (provider === "predictleads") {
      try {
        z.object({ key: z.string().min(1), token: z.string().min(1) }).parse(
          JSON.parse(input.secret),
        );
      } catch {
        throw new BadRequestException(
          "Enter PredictLeads credentials as JSON containing key and token.",
        );
      }
    }
    const ref = await new Vault().put(ws, input.secret);
    await db.connector.upsert({
      where: { workspaceId_provider: { workspaceId: ws, provider } },
      create: {
        workspaceId: ws,
        provider,
        secretRef: ref,
        status: "unverified",
        mode: "sandbox",
      },
      update: {
        secretRef: ref,
        status: "unverified",
        mode: "sandbox",
        lastError: null,
      },
    });
    return {
      status: "unverified",
      nextAction:
        "Sandbox credentials saved. Live submission remains disabled until validation.",
    };
  }
  @Post("workspaces/:workspaceId/connectors/crm/check") async crmCheck(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
  ) {
    const actor = await actorFor(req.headers, ws);
    assertRole(actor, "admin");
    const status = await new Crm(
      await workspaceService.workspace(actor),
    ).health();
    return { status };
  }
}
@Module({ controllers: [ApiController] })
class ApiModule {}
const app = await NestFactory.create(ApiModule, { bodyParser: false });
app.use((req: Request, res: Response, next: () => void) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  if (
    !["GET", "HEAD", "OPTIONS"].includes(req.method) &&
    req.headers.origin &&
    req.headers.origin !== config.webOrigin
  ) {
    res.status(403).json({ message: "This origin is not authorized." });
    return;
  }
  next();
});
app.use("/api/auth", toNodeHandler(auth));
app.use(express.json({ limit: "1mb" }));
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 3 },
});
app
  .getHttpAdapter()
  .getInstance()
  .post(
    "/api/workspaces/:workspaceId/imports",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const actor = await actorFor(
          req.headers,
          String(req.params.workspaceId),
        );
        if (!req.file)
          throw new HttpException("Choose a CSV or XLSX file.", 400);
        const mapping = z
          .record(z.string(), z.string())
          .parse(JSON.parse(req.body.mapping ?? "{}"));
        res.json(
          await workspaceService.import(
            actor,
            req.file.buffer,
            req.file.originalname,
            req.body.requestKey,
            mapping,
          ),
        );
      } catch (error) {
        res
          .status(error instanceof HttpException ? error.getStatus() : 400)
          .json({ message: safeError(error) });
      }
    },
  );
app
  .getHttpAdapter()
  .getInstance()
  .post(
    "/api/workspaces/:workspaceId/mcp",
    async (req: Request, res: Response) => {
      try {
        await handleMcp(
          await actorFor(req.headers, String(req.params.workspaceId)),
          req,
          res,
        );
      } catch (error) {
        if (!res.headersSent)
          res
            .status(error instanceof HttpException ? error.getStatus() : 400)
            .json({ message: safeError(error) });
      }
    },
  );
app.useGlobalFilters(new Errors());
app.enableShutdownHooks();
const document = SwaggerModule.createDocument(
  app,
  new DocumentBuilder()
    .setTitle("Revenue Workspace")
    .setVersion("0.1.0")
    .addCookieAuth()
    .build(),
);
const toolSchema = z.toJSONSchema(toolRequest, { target: "openapi-3.0" });
for (const path of [
  "/api/workspaces/{workspaceId}/quotes",
  "/api/workspaces/{workspaceId}/runs",
]) {
  const operation = document.paths[path]?.post;
  if (operation)
    operation.requestBody = {
      required: true,
      content: {
        "application/json": {
          schema: toolSchema as import("@nestjs/swagger").SchemaObject,
        },
      },
    };
}
document.paths["/api/workspaces/{workspaceId}/imports"] = {
  post: {
    summary:
      "Import a bounded CSV/XLSX file with an idempotency key and optional column mapping",
    requestBody: {
      required: true,
      content: {
        "multipart/form-data": {
          schema: {
            type: "object",
            required: ["file", "requestKey"],
            properties: {
              file: { type: "string", format: "binary" },
              requestKey: { type: "string", minLength: 8 },
              mapping: {
                type: "string",
                description:
                  "JSON object mapping product field names to source column headings.",
              },
            },
          },
        },
      },
    },
    responses: {
      "200": {
        description:
          "Persisted row outcomes; an in-progress retry does not acquire another import lease.",
      },
      "400": { description: "Invalid file, mapping or reused request key." },
    },
  },
};
SwaggerModule.setup("api/docs", app, document, {
  jsonDocumentUrl: "api/openapi.json",
});
await app.listen(config.apiPort, process.env.API_HOST ?? "127.0.0.1");
