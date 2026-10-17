import "reflect-metadata";
import {
  toolRequest,
  ASSET_FORMATS,
  type AssetTemplate,
} from "@revenue/contracts";
import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Req,
  Res,
  Body,
  Query,
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
  RubricService,
  WorkflowService,
  Storage,
  assertRole,
  digest,
  Vault,
  Crm,
  safeError,
  handleMcp,
  senderEvent,
  runAgentTurn,
  transcribeAudio,
  MAX_AUDIO_BYTES,
  AI_COSTS,
  aiLive,
  suggestCallOutcome,
  saveCallOutcome,
  GtmService,
  ExportBatchService,
  ImportHistoryService,
  ScheduleService,
  ThreadService,
  assetBasis,
  attachAssetToDraft,
  assetZip,
  isContentFormat,
  lintFor,
  oneSlide,
  pageCount,
  assetPng,
  assetPdf,
  normalizeAssetBidi,
  assertPngApprovalUnchanged,
} from "@revenue/backend";
import type { Actor } from "@revenue/contracts";

const gtm = new GtmService();
const exportBatches = new ExportBatchService();
const importHistory = new ImportHistoryService();
const schedules = new ScheduleService();
const threads = new ThreadService();
const rubrics = new RubricService();
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
@ApiTags("Caravan")
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
  @Get("workspaces/:workspaceId/rubric") async rubric(
    @Req() req: Request,
    @Param("workspaceId") id: string,
  ) {
    return rubrics.get(await actorFor(req.headers, id));
  }
  @Patch("workspaces/:workspaceId/rubric") async updateRubric(
    @Req() req: Request,
    @Param("workspaceId") id: string,
    @Body() body: unknown,
  ) {
    return rubrics.update(await actorFor(req.headers, id), body);
  }
  @Patch("workspaces/:workspaceId/pack") async setPack(
    @Req() req: Request,
    @Param("workspaceId") id: string,
    @Body() body: unknown,
  ) {
    return workspaceService.setPack(await actorFor(req.headers, id), body);
  }
  @Get("workspaces/:workspaceId/imports") async imports(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
  ) {
    const query = z.object({ cursor: z.uuid().optional() }).parse(req.query);
    return importHistory.list(await actorFor(req.headers, ws), query.cursor);
  }
  @Get("workspaces/:workspaceId/imports/:id") async importDetail(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    return importHistory.detail(await actorFor(req.headers, ws), z.uuid().parse(id));
  }
  @Get("workspaces/:workspaceId/schedules") async listSchedules(@Req() req: Request, @Param("workspaceId") ws: string) {
    return schedules.list(await actorFor(req.headers,ws));
  }
  @Post("workspaces/:workspaceId/schedules") async createSchedule(@Req() req: Request, @Param("workspaceId") ws: string, @Body() body: unknown) {
    return schedules.create(await actorFor(req.headers,ws),body);
  }
  @Patch("workspaces/:workspaceId/schedules/:id") async updateSchedule(@Req() req: Request, @Param("workspaceId") ws: string, @Param("id") id: string, @Body() body: unknown) {
    return schedules.update(await actorFor(req.headers,ws),z.uuid().parse(id),body);
  }
  @Get("workspaces/:workspaceId/scheduled-reviews") async scheduledReviews(@Req() req: Request, @Param("workspaceId") ws: string) {
    return schedules.reviews(await actorFor(req.headers,ws));
  }
  @Post("workspaces/:workspaceId/scheduled-reviews/:id/quote") async quoteScheduledReview(@Req() req: Request, @Param("workspaceId") ws: string, @Param("id") id: string) {
    return schedules.quote(await actorFor(req.headers,ws),z.uuid().parse(id));
  }
  @Post("workspaces/:workspaceId/scheduled-reviews/:id/dismiss") async dismissScheduledReview(@Req() req: Request, @Param("workspaceId") ws: string, @Param("id") id: string) {
    return schedules.dismiss(await actorFor(req.headers,ws),z.uuid().parse(id));
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
    const basis = await assetBasis(ws, asset);
    if (basis === null || asset.evidenceDigest !== digest(basis))
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
    return attachAssetToDraft(ws, id, input);
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
  @ApiOperation({ summary: "Deliverable page count, size and client compatibility checks" })
  @Get("workspaces/:workspaceId/assets/:id/meta") async assetMeta(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    await actorFor(req.headers, ws);
    const asset = await db.asset.findFirst({ where: { id, workspaceId: ws } });
    if (!asset) throw new HttpException("Asset not found.", 404);
    const html = (await storage.get(ws, asset.htmlKey)).toString("utf8");
    return {
      pages: pageCount(asset.template, html),
      bytes: Buffer.byteLength(html, "utf8"),
      lint: lintFor(asset.template, html),
    };
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
    const spec = asset ? ASSET_FORMATS[asset.template as AssetTemplate] : undefined;
    // html is the sandboxed preview; download, pdf, png and zip are approved exports.
    const allowed =
      format === "html" ||
      (format === "download" && spec?.exports.includes("html")) ||
      (["pdf", "png", "zip"].includes(format) &&
        spec?.exports.includes(format as "pdf"));
    if (!asset || !spec || !allowed) throw new HttpException("Asset not found.", 404);
    if (format !== "html") {
      const basis = await assetBasis(ws, asset);
      if (basis === null)
        throw new HttpException(
          "The source account no longer exists. Reload the workspace.",
          409,
        );
      if (!asset.approvedAt || asset.evidenceDigest !== digest(basis))
        throw new HttpException(
          "Review and approve this asset before exporting it.",
          409,
        );
    }
    const content = isContentFormat(asset.template);
    const raw = async () => (await storage.get(ws, asset.htmlKey)).toString("utf8");
    let bytes: Buffer;
    if (format === "png") bytes = await assetPng(ws, asset);
    else if (format === "zip") bytes = await assetZip(ws, asset);
    else if (format === "pdf") bytes = await assetPdf(ws, asset);
    else {
      let html = content ? await raw() : normalizeAssetBidi(await raw(), asset.language);
      const slide = Number(req.query.slide);
      if (format === "html" && spec.viewer === "slides" && slide > 0) html = oneSlide(html, slide);
      bytes = Buffer.from(html);
    }
    if (format !== "html") {
      const current = await db.asset.findFirst({ where: { id, workspaceId: ws } });
      assertPngApprovalUnchanged(asset, current, await assetBasis(ws, asset));
    }
    res.set("Cache-Control", "private, no-store");
    res.set(
      "Content-Type",
      format === "pdf"
        ? "application/pdf"
        : format === "png"
          ? "image/png"
          : format === "zip"
            ? "application/zip"
            : "text/html; charset=utf-8",
    );
    res.removeHeader("X-Frame-Options");
    // Only the trusted flipbook template runs script, and only in an opaque-origin sandbox.
    // Email previews may show hosted HTTPS images (brand logos), as the inbox would.
    res.set(
      "Content-Security-Policy",
      spec.viewer === "flipbook"
        ? "sandbox allow-scripts; frame-ancestors 'self'; default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; font-src data:"
        : `sandbox; frame-ancestors 'self'; default-src 'none'; style-src 'unsafe-inline'; img-src data:${spec.viewer === "email" ? " https:" : ""}; font-src data:`,
    );
    if (format !== "html")
      res.set(
        "Content-Disposition",
        `attachment; filename="${asset.template}-${asset.language}.${format === "download" ? "html" : format}"`,
      );
    res.send(bytes);
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
  @ApiOperation({ summary: "List the member's Nabil conversations" })
  @Get("workspaces/:workspaceId/threads") async threads(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
  ) {
    return threads.list(await actorFor(req.headers, ws));
  }
  @Post("workspaces/:workspaceId/threads") async createThread(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    const input = z
      .object({ title: z.string().max(200).optional() })
      .parse(body ?? {});
    return threads.create(await actorFor(req.headers, ws), input.title);
  }
  @Get("workspaces/:workspaceId/threads/:id/messages") async threadMessages(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    return threads.messages(await actorFor(req.headers, ws), id);
  }
  @Patch("workspaces/:workspaceId/threads/:id") async updateThread(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = z
      .object({
        title: z.string().min(1).max(200).optional(),
        archived: z.boolean().optional(),
      })
      .parse(body);
    return threads.update(await actorFor(req.headers, ws), id, input);
  }
  @Delete("workspaces/:workspaceId/threads/:id") async archiveThread(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    return threads.update(await actorFor(req.headers, ws), id, {
      archived: true,
    });
  }
  @Patch("workspaces/:workspaceId/chat/:id/feedback") async chatFeedback(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    const input = z
      .object({ value: z.enum(["up", "down"]).nullable() })
      .parse(body);
    return threads.feedback(await actorFor(req.headers, ws), id, input.value);
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
    // The non-streaming path files its exchange as a new conversation, like the stream does.
    const thread = await threads.forTurn(actor, input.content);
    await db.chatMessage.create({
      data: {
        workspaceId: ws,
        userId: actor.userId,
        threadId: thread.id,
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
        threadId: thread.id,
        role: "assistant",
        content,
        context: json({ ...input.context, tool }),
      },
    });
    return { content, tool, context: input.context };
  }
  @ApiOperation({ summary: "Triage a prospect: bucket, rationale, segment, owner" })
  @Patch("workspaces/:workspaceId/prospects/:id/triage") async triage(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return gtm.triage(await actorFor(req.headers, ws), id, body);
  }
  @Get("workspaces/:workspaceId/duplicates") async duplicates(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
  ) {
    return gtm.duplicates(await actorFor(req.headers, ws));
  }
  @Post("workspaces/:workspaceId/duplicates/resolve") async resolveDuplicates(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    return gtm.resolveDuplicate(await actorFor(req.headers, ws), body);
  }
  @ApiOperation({ summary: "Launch gate: holds that would block a sequence" })
  @Post("workspaces/:workspaceId/launch-gate") async launchGate(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    const input = z.object({ draftIds: z.array(z.uuid()).max(100) }).parse(body);
    return gtm.launchGate(await actorFor(req.headers, ws), input.draftIds);
  }
  @ApiOperation({
    summary: "Export approved, basis-cleared drafts for the customer's own sender",
  })
  @Post("workspaces/:workspaceId/exports") async createExport(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    return exportBatches.create(await actorFor(req.headers, ws), body);
  }
  @Get("workspaces/:workspaceId/exports") async listExports(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
  ) {
    return exportBatches.list(await actorFor(req.headers, ws));
  }
  @Get("workspaces/:workspaceId/exports/:exportId/file.csv") async exportFile(
    @Req() req: Request,
    @Res() res: Response,
    @Param("workspaceId") ws: string,
    @Param("exportId") exportId: string,
  ) {
    const file = await exportBatches.csv(await actorFor(req.headers, ws), exportId);
    res.set({
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${file.filename}"`,
      "Cache-Control": "private, no-store",
    });
    res.send(file.content);
  }
  @ApiOperation({ summary: "Funnel of distinct prospects; simulated events are excluded unless requested" })
  @Get("workspaces/:workspaceId/scorecard") async scorecard(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Query() query: unknown,
  ) {
    const date = z.union([z.iso.date(), z.iso.datetime()]);
    const input = z
      .object({
        batch: z.uuid().optional(),
        from: date.optional(),
        to: date.optional(),
        includeSimulated: z.enum(["true", "false"]).optional(),
      })
      .parse(query);
    return gtm.scorecard(await actorFor(req.headers, ws), {
      batchId: input.batch,
      from: input.from,
      to: input.to,
      includeSimulated: input.includeSimulated === "true",
    });
  }
  @ApiOperation({ summary: "A reviewer confirms whether a prospect's reply was positive, neutral or negative" })
  @Post("workspaces/:workspaceId/prospects/:prospectId/reply-label") async replyLabel(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("prospectId") prospectId: string,
    @Body() body: unknown,
  ) {
    return gtm.labelReply(await actorFor(req.headers, ws), prospectId, body);
  }
  @Get("workspaces/:workspaceId/sdr-kit") async sdrKit(
    @Req() req: Request,
    @Res() res: Response,
    @Param("workspaceId") ws: string,
  ) {
    const pdf = await gtm.sdrKit(await actorFor(req.headers, ws));
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="sdr-onboarding-kit.pdf"',
    });
    res.send(pdf);
  }
  @Post("workspaces/:workspaceId/prospects/:id/discovery") async discovery(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return gtm.discovery(await actorFor(req.headers, ws), id, body);
  }
  @Get("workspaces/:workspaceId/discovery") async discoverySummary(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
  ) {
    return gtm.discoverySummary(await actorFor(req.headers, ws));
  }
  @Get("workspaces/:workspaceId/prospects/:id/discovery-guide") async interviewGuide(
    @Req() req: Request,
    @Res() res: Response,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    const query = z.object({ language: z.enum(["en", "ar"]).default("en"), format: z.enum(["json", "pdf"]).default("json") }).parse(req.query);
    const result = await gtm.interviewGuide(await actorFor(req.headers, ws), id, query.language, query.format);
    if (query.format === "json") return res.json(result);
    return res.set({ "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="discovery-guide-${query.language}.pdf"`, "Cache-Control": "private, no-store" }).send(result);
  }
  @ApiOperation({
    summary: "Export the saved account research with dated citations",
  })
  @Get("workspaces/:workspaceId/prospects/:id/research-brief")
  async researchBrief(
    @Req() req: Request,
    @Res() res: Response,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
  ) {
    const query = z
      .object({
        language: z.enum(["en", "ar"]).default("en"),
        format: z.enum(["json", "pdf"]).default("json"),
      })
      .parse(req.query);
    const result = await gtm.researchBrief(
      await actorFor(req.headers, ws),
      id,
      query.language,
      query.format,
    );
    if (query.format === "json")
      return res.set("Cache-Control", "private, no-store").json(result);
    return res
      .set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="research-brief-${query.language}.pdf"`,
        "Cache-Control": "private, no-store",
      })
      .send(result);
  }
  @ApiOperation({ summary: "Propose a structured call outcome from a dictated note" })
  @Post("workspaces/:workspaceId/call-outcome/suggest") async suggestOutcome(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Body() body: unknown,
  ) {
    const input = z.object({ note: z.string().min(3).max(3000) }).parse(body);
    return suggestCallOutcome(await actorFor(req.headers, ws), input.note);
  }
  @Post("workspaces/:workspaceId/prospects/:id/call-outcome") async callOutcome(
    @Req() req: Request,
    @Param("workspaceId") ws: string,
    @Param("id") id: string,
    @Body() body: unknown,
  ) {
    return saveCallOutcome(await actorFor(req.headers, ws), id, body);
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
// EXP-01: outcomes the customer's own sender reported for an exported batch.
app
  .getHttpAdapter()
  .getInstance()
  .post(
    "/api/workspaces/:workspaceId/exports/:exportId/outcomes",
    upload.single("file"),
    async (req: Request, res: Response) => {
      try {
        const actor = await actorFor(
          req.headers,
          String(req.params.workspaceId),
        );
        if (!req.file) throw new HttpException("Choose a CSV file.", 400);
        res.json(
          await exportBatches.importOutcomes(
            actor,
            String(req.params.exportId),
            req.file.buffer,
          ),
        );
      } catch (error) {
        res
          .status(error instanceof HttpException ? error.getStatus() : 400)
          .json({ message: safeError(error) });
      }
    },
  );
// Streaming assistant turn (PRD AI-01). Server-sent events: meta, text, tool, quote,
// navigate, error, done. Action tools only ever produce quotes.
app
  .getHttpAdapter()
  .getInstance()
  .post(
    "/api/workspaces/:workspaceId/chat/stream",
    async (req: Request, res: Response) => {
      let actor: Actor;
      let input: {
        content: string;
        threadId?: string;
        context: {
          play: "P1" | "P2" | "P3" | "P4";
          prospectIds: string[];
          language?: "en" | "ar-EG" | "ar-Gulf" | "ar";
          uiLanguage?: "en" | "ar";
          screen?: string;
          activeProspectId?: string;
          activeAssetId?: string;
        };
      };
      try {
        actor = await actorFor(req.headers, String(req.params.workspaceId));
        assertRole(actor, "write");
        input = z
          .object({
            content: z.string().min(1).max(3000),
            threadId: z.uuid().optional(),
            context: z.object({
              play: z.enum(["P1", "P2", "P3", "P4"]),
              prospectIds: z.array(z.uuid()).max(100),
              language: z.enum(["en", "ar-EG", "ar-Gulf", "ar"]).optional(),
              uiLanguage: z.enum(["en", "ar"]).optional(),
              screen: z.enum(["Home", "Plays", "Accounts", "Review queue", "Asset Studio", "Sequences", "Company context", "Settings"]).optional(),
              activeProspectId: z.uuid().optional(),
              activeAssetId: z.uuid().optional(),
            }),
          })
          .parse(req.body);
      } catch (error) {
        res
          .status(
            error instanceof HttpException
              ? error.getStatus()
              : error instanceof ZodError
                ? 400
                : 401,
          )
          .json({ message: safeError(error) });
        return;
      }
      res.set({
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      });
      res.flushHeaders();
      const abort = new AbortController();
      res.on("close", () => abort.abort());
      try {
        const thread = await threads.forTurn(
          actor,
          input.content,
          input.threadId,
        );
        res.write(
          `data: ${JSON.stringify({ type: "thread", id: thread.id, title: thread.title })}\n\n`,
        );
        await runAgentTurn(
          actor,
          input.content,
          input.context,
          (event) => {
            if (!res.destroyed) res.write(`data: ${JSON.stringify(event)}\n\n`);
          },
          abort.signal,
          { threadId: thread.id },
        );
      } catch (error) {
        if (!res.destroyed)
          res.write(
            `data: ${JSON.stringify({ type: "error", message: safeError(error) })}\n\n`,
          );
      }
      res.end();
    },
  );
// Voice dictation: raw audio body, transcribed and discarded (PRD AI-04).
app
  .getHttpAdapter()
  .getInstance()
  .post(
    "/api/workspaces/:workspaceId/transcribe",
    express.raw({ type: "audio/*", limit: MAX_AUDIO_BYTES }),
    async (req: Request, res: Response) => {
      try {
        const actor = await actorFor(
          req.headers,
          String(req.params.workspaceId),
        );
        const language = z
          .enum(["en", "ar", "auto"])
          .catch("auto")
          .parse(req.query.language);
        res.json(
          await transcribeAudio(
            actor,
            Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0),
            String(req.headers["content-type"] ?? ""),
            language,
            req.query.model === "alt",
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
  .get("/api/ai/status", (_req: Request, res: Response) => {
    res.json({ live: aiLive(), costs: AI_COSTS });
  });
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
    .setTitle("Caravan API")
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
