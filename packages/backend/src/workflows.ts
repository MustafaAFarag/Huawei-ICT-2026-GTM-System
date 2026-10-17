import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { randomUUID } from "node:crypto";
import type {
  Actor,
  Evidence,
  ProspectSnapshot,
  Preflight,
  ToolRequest,
  Touch,
} from "@revenue/contracts";
import {
  toolRequest,
  PLANS,
  draftChecks,
  ASSET_FORMATS,
  COSTS,
} from "@revenue/contracts";
import { config, required } from "./config.js";
import { db, json, serializable } from "./database.js";
import {
  assertRole,
  digest,
  estimate,
  month,
  score,
  validateEvidence,
  preflightHolds,
  channelHolds,
  safeError,
} from "./policy.js";
import { Providers, OpenDesign, renderPdf, Crm } from "./providers.js";
import { resolveRubric } from "./rubric-core.js";
import { Storage } from "./storage.js";
import {
  deliverableModelId,
  formatContext,
  generateDeliverable,
  isContentFormat,
  promptFor,
  type ContentFormat,
} from "./formats/index.js";
import { WorkspaceService } from "./workspace.js";
import { promptVersions } from "./agent/prompts.js";
import { chatModelId } from "./agent/provider.js";

export class WorkflowService {
  private workspaces = new WorkspaceService();
  private providers = new Providers();
  private storage = new Storage();
  private async scope(actor: Actor, input: ToolRequest) {
    const workspace = await this.workspaces.workspace(actor);
    const prospects = await db.prospect.findMany({
      where: { workspaceId: actor.workspaceId, id: { in: input.prospectIds } },
      orderBy: { id: "asc" },
    });
    const drafts = await db.draft.findMany({
      where: { workspaceId: actor.workspaceId, id: { in: input.draftIds } },
      orderBy: { id: "asc" },
    });
    if (
      prospects.length !== new Set(input.prospectIds).size ||
      drafts.length !== new Set(input.draftIds).size
    )
      throw new NotFoundException(
        "A selected record is unavailable in this workspace.",
      );
    const workspaceDeliverable =
      input.tool === "make_asset" && isContentFormat(input.template);
    if (
      !["preflight", "onboard", "queue_sequence", "assistant"].includes(
        input.tool,
      ) &&
      !workspaceDeliverable &&
      !prospects.length
    )
      throw new BadRequestException("Select at least one prospect.");
    if (input.tool === "queue_sequence" && !drafts.length)
      throw new BadRequestException("Select at least one approved draft.");
    const sourceAsset = input.sourceAssetId
      ? await db.asset.findFirst({
          where: { id: input.sourceAssetId, workspaceId: actor.workspaceId },
        })
      : null;
    if (
      input.sourceAssetId &&
      (!sourceAsset ||
        input.tool !== "make_asset" ||
        prospects.length > 1 ||
        (sourceAsset.prospectId ?? null) !== (prospects[0]?.id ?? null) ||
        sourceAsset.template !== input.template ||
        sourceAsset.language !== input.language)
    )
      throw new BadRequestException(
        "The asset revision must match one source asset, account, template and language in this workspace.",
      );
    if (sourceAsset && !input.message?.trim())
      throw new BadRequestException(
        "Describe the change before requesting an asset revision.",
      );
    if (
      sourceAsset &&
      sourceAsset.evidenceDigest !==
        digest(
          deliverableBasis(
            sourceAsset.template,
            await this.workspaces.workspace(actor),
            prospects[0]?.evidence ?? null,
          ),
        )
    )
      throw new BadRequestException(
        "Evidence changed. Generate a new asset from the current sources before editing.",
      );
    const {
      requestKey,
      spendApprovalId,
      approvedSpend,
      expectedEstimate,
      ...operation
    } = input;
    const limits = {
      ...(PLANS[workspace.plan as keyof typeof PLANS] ?? PLANS.Free),
      ...(workspace.planLimits as object),
    };
    const [workspaceBudget, memberBudget, member] = await Promise.all([
      db.budget.findUnique({
        where: { id: `${workspace.id}:${month()}` },
        select: { cap: true },
      }),
      db.budget.findUnique({
        where: { id: `${workspace.id}:${actor.userId}:${month()}` },
        select: { cap: true },
      }),
      db.membership.findUnique({
        where: {
          workspaceId_userId: {
            workspaceId: workspace.id,
            userId: actor.userId,
          },
        },
        select: { creditCap: true },
      }),
    ]);
    const scopeDigest = digest({
      operation,
      sourceAsset: sourceAsset
        ? {
            id: sourceAsset.id,
            version: sourceAsset.version,
            htmlKey: sourceAsset.htmlKey,
            evidenceDigest: sourceAsset.evidenceDigest,
          }
        : null,
      spending: {
        plan: workspace.plan,
        limits,
        workspaceCap: workspaceBudget?.cap ?? limits.aiCredits,
        memberCap: memberBudget?.cap ?? member?.creditCap ?? limits.aiCredits,
      },
      prospects: prospects.map((p) => ({
        id: p.id,
        updatedAt: p.updatedAt,
        evidence: p.evidence,
      })),
      drafts: drafts.map((d) => ({
        id: d.id,
        version: d.version,
        approvedAt: d.approvedAt,
        assetId: d.assetId,
        content: d.content,
      })),
      workspace: {
        company: workspace.company,
        brand: workspace.brand,
        offers: workspace.offers,
        preflight: workspace.preflight,
      },
    });
    return { workspace, prospects, drafts, scopeDigest };
  }
  async quote(actor: Actor, value: unknown) {
    assertRole(actor, "write");
    const input = toolRequest.parse(value);
    const scope = await this.scope(actor, input);
    const approval = await db.spendApproval.create({
      data: {
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        digest: scope.scopeDigest,
        estimate: estimate(input),
        expiresAt: new Date(Date.now() + 15 * 60000),
      },
    });
    return {
      id: approval.id,
      estimate: approval.estimate,
      expiresAt: approval.expiresAt,
      tool: input.tool,
      audience: scope.prospects.length || scope.drafts.length,
      simulated: process.env.PROVIDER_MODE !== "live",
    };
  }
  async approveQuote(actor: Actor, id: string) {
    assertRole(actor, "write");
    const approval = await db.spendApproval.findFirst({
      where: {
        id,
        workspaceId: actor.workspaceId,
        userId: actor.userId,
        expiresAt: { gt: new Date() },
        runId: null,
      },
    });
    if (!approval)
      throw new BadRequestException(
        "This cost approval expired or was already used. Review a new quote.",
      );
    return db.spendApproval.update({
      where: { id },
      data: { approvedAt: new Date() },
    });
  }
  async start(actor: Actor, value: unknown) {
    assertRole(actor, "write");
    const input = toolRequest.parse(value);
    const inputDigest = digest({
      ...input,
      approvedSpend: false,
      expectedEstimate: undefined,
      spendApprovalId: undefined,
    });
    const existing = await db.run.findUnique({
      where: {
        workspaceId_requestKey: {
          workspaceId: actor.workspaceId,
          requestKey: input.requestKey,
        },
      },
    });
    if (existing) {
      if (
        existing.inputDigest !== inputDigest ||
        existing.userId !== actor.userId
      )
        throw new BadRequestException(
          "This request key was used for a different action.",
        );
      return existing;
    }
    const scope = await this.scope(actor, input);
    const amount = estimate(input);
    const limits = {
      ...(PLANS[scope.workspace.plan as keyof typeof PLANS] ?? PLANS.Free),
      ...(scope.workspace.planLimits as object),
    };
    return serializable(async (tx) => {
      const duplicate = await tx.run.findUnique({
        where: {
          workspaceId_requestKey: {
            workspaceId: actor.workspaceId,
            requestKey: input.requestKey,
          },
        },
      });
      if (duplicate) {
        if (
          duplicate.inputDigest !== inputDigest ||
          duplicate.userId !== actor.userId
        )
          throw new BadRequestException(
            "This request key was used for a different action.",
          );
        return duplicate;
      }
      const approval = input.spendApprovalId
        ? await tx.spendApproval.findFirst({
            where: {
              id: input.spendApprovalId,
              workspaceId: actor.workspaceId,
              userId: actor.userId,
              digest: scope.scopeDigest,
              estimate: amount,
              approvedAt: { not: null },
              expiresAt: { gt: new Date() },
              runId: null,
            },
          })
        : null;
      if (amount > 0 && !approval)
        throw new ForbiddenException(
          "Review and approve the current cost and scope before running this action.",
        );
      const budgetIds = [
        `${actor.workspaceId}:${month()}`,
        `${actor.workspaceId}:${actor.userId}:${month()}`,
      ];
      for (const id of budgetIds) {
        const member = await tx.membership.findUnique({
          where: {
            workspaceId_userId: {
              workspaceId: actor.workspaceId,
              userId: actor.userId,
            },
          },
        });
        if (!member || !["owner", "operator"].includes(member.role))
          throw new ForbiddenException(
            "Your workspace role changed. Reload before starting a new action.",
          );
        await tx.budget.upsert({
          where: { id },
          create: {
            id,
            workspaceId: actor.workspaceId,
            userId: id === budgetIds[0] ? null : actor.userId,
            month: month(),
            cap:
              id === budgetIds[0]
                ? limits.aiCredits
                : (member.creditCap ?? limits.aiCredits),
          },
          update: {},
        });
        const reserved =
          await tx.$executeRaw`UPDATE "Budget" SET reserved = reserved + ${amount} WHERE id = ${id} AND (${amount} = 0 OR used + reserved + ${amount} <= cap)`;
        if (reserved !== 1)
          throw new ForbiddenException(
            "The workspace or member spending cap would be exceeded. Ask the owner to review the cap.",
          );
      }
      const play = await tx.playVersion.findFirst({
        where: { workspaceId: actor.workspaceId, play: input.play },
        orderBy: { version: "desc" },
      });
      const run = await tx.run.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          tool: input.tool,
          queueName: config.queueName,
          requestKey: input.requestKey,
          inputDigest,
          input: json(input),
          estimate: amount,
          playVersionId: play?.id,
        },
      });
      const resourceQuotas =
        input.tool === "enrich_contacts"
          ? [
              {
                kind: "enrichmentCredits",
                units: input.prospectIds.length,
                cap: limits.enrichmentCredits,
              },
            ]
          : input.tool === "make_asset"
            ? [
                {
                  kind: "exports",
                  units: input.prospectIds.length,
                  cap: limits.exports,
                },
              ]
            : input.tool === "queue_sequence"
              ? [
                  {
                    kind: "sends",
                    units: input.draftIds.length,
                    cap: limits.sends,
                  },
                ]
              : [];
      const quotas = [
        ...(amount
          ? [{ kind: "aiCredits", units: amount, cap: limits.aiCredits }]
          : []),
        ...resourceQuotas,
      ];
      for (const item of quotas) {
        const id = `${actor.workspaceId}:${month()}:${item.kind}`;
        await tx.quota.upsert({
          where: { id },
          create: {
            id,
            workspaceId: actor.workspaceId,
            month: month(),
            kind: item.kind,
            cap: item.cap,
          },
          update: { cap: item.cap },
        });
        const reserved =
          await tx.$executeRaw`UPDATE "Quota" SET reserved = reserved + ${item.units} WHERE id = ${id} AND used + reserved + ${item.units} <= cap`;
        if (reserved !== 1)
          throw new ForbiddenException(
            `The ${item.kind} plan quota would be exceeded.`,
          );
        await tx.quotaReservation.create({
          data: {
            runId: run.id,
            workspaceId: actor.workspaceId,
            kind: item.kind,
            reserved: item.units,
          },
        });
      }
      if (approval)
        await tx.spendApproval.update({
          where: { id: approval.id },
          data: { runId: run.id },
        });
      await tx.usage.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          runId: run.id,
          action: input.tool,
          reserved: amount,
          plan: scope.workspace.plan,
        },
      });
      await tx.outbox.create({
        data: { runId: run.id, queueName: config.queueName },
      });
      await tx.runEvent.create({
        data: {
          runId: run.id,
          kind: "queued",
          message:
            "Queued. You can leave this page and return to the saved progress.",
        },
      });
      await tx.audit.create({
        data: {
          workspaceId: actor.workspaceId,
          userId: actor.userId,
          action: "run.requested",
          targetId: run.id,
          details: json({ tool: input.tool, estimate: amount }),
        },
      });
      return run;
    });
  }
  async events(actor: Actor, id: string, after = 0) {
    if (
      !(await db.run.findFirst({
        where: { id, workspaceId: actor.workspaceId },
      }))
    )
      throw new NotFoundException("Run not found.");
    return db.runEvent.findMany({
      where: { runId: id, id: { gt: after } },
      orderBy: { id: "asc" },
    });
  }
  async cancel(actor: Actor, id: string) {
    assertRole(actor, "write");
    const run = await db.run.findFirst({
      where: { id, workspaceId: actor.workspaceId },
    });
    if (!run) throw new NotFoundException("Run not found.");
    return db.run.update({ where: { id }, data: { cancelledAt: new Date() } });
  }
  // Email, carousel and flipbook deliverables: model-written content JSON rendered by
  // trusted templates, stored with its content so revisions can start from it.
  private async makeContentAsset(
    workspace: Awaited<ReturnType<WorkspaceService["workspace"]>>,
    input: ToolRequest,
    runId: string,
    prospect: { id: string; snapshot: unknown; evidence: unknown } | null,
  ) {
    const template = input.template as ContentFormat;
    const evidence = (prospect?.evidence as Evidence[] | undefined) ?? [];
    const snapshot = prospect?.snapshot as ProspectSnapshot | undefined;
    await this.event(runId, "model", "Deliverable model and prompt versions recorded.", {
      model: config.modelFixture ? "fixture" : deliverableModelId(),
      prompts: promptVersions(promptFor(template).id as "format-email", "language"),
    });
    const source = input.sourceAssetId
      ? await db.asset.findFirstOrThrow({
          where: { id: input.sourceAssetId, workspaceId: workspace.id },
        })
      : null;
    const previous = source
      ? JSON.parse(
          (await this.storage.get(workspace.id, `${source.id}.json`)).toString("utf8"),
        )
      : undefined;
    const context = formatContext({
      workspace,
      snapshot,
      evidence,
      language: input.language,
      holdoutPercent: input.holdoutPercent,
    });
    const generated = await generateDeliverable(template, context, {
      instructions: input.message,
      slides: input.slides,
      previous,
    });
    const assetId = randomUUID();
    const htmlKey = `${assetId}.html`;
    await this.storage.put(workspace.id, htmlKey, Buffer.from(generated.html), "text/html");
    await this.storage.put(
      workspace.id,
      `${assetId}.json`,
      Buffer.from(JSON.stringify(generated.content)),
      "application/json",
    );
    if (generated.printHtml)
      await this.storage.put(
        workspace.id,
        `${assetId}.print.html`,
        Buffer.from(generated.printHtml),
        "text/html",
      );
    const label = ASSET_FORMATS[template].label;
    const subject = snapshot?.company ?? workspace.name;
    const title = `${(generated.content as { title?: string; subject?: string }).title ?? (generated.content as { subject?: string }).subject ?? label}`.slice(0, 120);
    const engine = await new OpenDesign(workspace)
      .save(title, generated.html)
      .catch(() => null);
    const created = await db.asset.create({
      data: {
        id: assetId,
        workspaceId: workspace.id,
        prospectId: prospect?.id ?? null,
        runId,
        template,
        language: input.language,
        version: source ? source.version + 1 : 1,
        engineVersion: OpenDesign.version,
        engineProjectId: engine,
        title: `${title} — ${subject}${source ? " · revision" : ""}`,
        htmlKey,
        pdfKey: null,
        evidenceDigest: digest(deliverableBasis(template, workspace, prospect?.evidence ?? null)),
        threadId: input.threadId ?? null,
        playId: input.play,
      },
    });
    await fileDeliverable(workspace.id, input.threadId, created);
    await new Crm(workspace)
      .upsertObject("gtmAssets", "GtmAsset", assetId, {
        name: created.title,
        kind: template,
        language: input.language,
        snapshot: {
          productAssetId: assetId,
          prospectId: prospect?.id ?? null,
          url: `${config.webOrigin}/api/workspaces/${workspace.id}/assets/${assetId}/html`,
        },
        editableHtml: null,
        campaignVersion: created.version,
      })
      .catch(() => {});
    return created;
  }
  private async event(
    runId: string,
    kind: string,
    message: string,
    details: unknown = {},
  ) {
    await db.runEvent.create({
      data: { runId, kind, message, details: json(details) },
    });
  }
  async execute(id: string) {
    const acquired = await db.run.updateMany({
      where: { id, state: "queued" },
      data: {
        state: "running",
        attempt: { increment: 1 },
        leaseUntil: new Date(Date.now() + 180000),
      },
    });
    if (!acquired.count) return;
    const run = await db.run.findUniqueOrThrow({ where: { id } });
    const input = toolRequest.parse(run.input);
    const membership = await db.membership.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: run.workspaceId,
          userId: run.userId,
        },
      },
    });
    let actual = 0;
    const chargeAttempt = async (credits: number) => {
      actual += credits;
      await db.run.update({ where: { id }, data: { actualCost: actual } });
    };
    const heartbeat = setInterval(() => {
      void db.run
        .updateMany({
          where: { id, state: "running" },
          data: { leaseUntil: new Date(Date.now() + 180000) },
        })
        .catch(() => {});
    }, 20000);
    try {
      const actor = {
        userId: run.userId,
        workspaceId: run.workspaceId,
        role: membership?.role ?? "viewer",
      } as Actor;
      assertRole(actor, "write");
      if (run.cancelledAt) throw new Error("Cancelled before execution.");
      const { workspace, prospects, drafts, scopeDigest } = await this.scope(
        actor,
        input,
      );
      if (run.estimate > 0) {
        const approval = await db.spendApproval.findFirst({
          where: {
            runId: id,
            workspaceId: run.workspaceId,
            userId: run.userId,
          },
        });
        if (!approval || approval.digest !== scopeDigest)
          throw new Error(
            "The reviewed scope changed before execution. Review and approve a fresh quote.",
          );
      }
      await this.event(id, "started", `Started ${input.tool}.`);
      const outputs: unknown[] = [];
      if (input.tool === "preflight") {
        const result = await this.providers.preflight(workspace);
        await db.workspace.update({
          where: { id: workspace.id },
          data: { preflight: json(result) },
        });
        outputs.push({ ...result, holds: preflightHolds(result) });
      } else if (input.tool === "assistant") {
        if (!input.message) throw new Error("Enter the assistant message.");
        const { ModelGateway } = await import("./model.js");
        const { z } = await import("zod");
        const schema = z.object({
          content: z.string().max(2000),
          tool: z.enum([
            "find_signals",
            "score_accounts",
            "enrich_contacts",
            "draft_messages",
            "make_asset",
            "queue_sequence",
            "preflight",
            "mini_audit",
          ]),
        });
        await chargeAttempt(2);
        const result = (await new ModelGateway().json(
          "Propose one appropriate Caravan task, briefly explain it and any review needed. You cannot execute tools or approve costs. Use only approved facts, distinguish hypotheses and unknowns. Never claim a send or operation happened. Return {content,tool}.",
          {
            message: input.message,
            play: input.play,
            company: workspace.company,
            selected: prospects.map((p) => ({
              id: p.id,
              snapshot: p.snapshot,
              evidence: (p.evidence as Evidence[]).filter((e) => e.approved),
            })),
            history: (
              await db.chatMessage.findMany({
                where: { workspaceId: workspace.id, userId: actor.userId },
                take: 12,
                orderBy: { createdAt: "desc" },
              })
            )
              .reverse()
              .map((c) => ({ role: c.role, content: c.content })),
          },
          schema,
        )) as { content: string; tool: string };
        await db.chatMessage.create({
          data: {
            workspaceId: workspace.id,
            userId: actor.userId,
            role: "assistant",
            content: result.content,
            runId: id,
            context: json({
              tool: result.tool,
              play: input.play,
              prospectIds: input.prospectIds,
            }),
          },
        });
        outputs.push(result);
      } else if (input.tool === "onboard") {
        if (!input.website) throw new Error("Enter your company website.");
        const { publicPage, pageText, brandFromHtml } = await import(
          "./public-web.js"
        );
        const page = await publicPage(input.website);
        outputs.push({
          website: page.url,
          proposedDescription: pageText(page.html).slice(0, 1800),
          brand: brandFromHtml(page.html, page.url),
          needsReview: true,
        });
        actual = run.estimate;
      } else if (input.tool === "queue_sequence") {
        // All policy and active-enrolment checks execute in a serializable transaction.
        for (const draft of drafts) {
          const sequence = await serializable(async (tx) => {
            const current = await tx.draft.findUniqueOrThrow({
              where: { id: draft.id },
            });
            const prospect = await tx.prospect.findFirstOrThrow({
              where: { id: current.prospectId, workspaceId: workspace.id },
            });
            const currentWorkspace = await tx.workspace.findUniqueOrThrow({
              where: { id: workspace.id },
            });
            const holds = [
              ...preflightHolds(
                currentWorkspace.preflight as Partial<Preflight>,
              ),
              ...channelHolds(
                prospect,
                (currentWorkspace.company as { marketingLicence?: boolean })
                  .marketingLicence === true,
              ),
            ];
            if (
              score(
                prospect.snapshot as ProspectSnapshot,
                resolveRubric(currentWorkspace),
              ).disqualified
            )
              holds.push(
                "This account is below the deterministic qualification threshold",
              );
            validateEvidence(prospect.evidence as Evidence[]);
            if (
              current.approvedVersion !== current.version ||
              current.evidenceDigest !== digest(prospect.evidence)
            )
              holds.push("Review and approve the current draft and evidence");
            // GAP-14: blocking copy checks (personal event claims, missing opt-out, placeholders).
            for (const check of draftChecks(
              current.content as Touch[],
              prospect.language,
            ))
              if (check.level === "error") holds.push(check.message);
            if (
              await tx.suppression.findUnique({
                where: {
                  workspaceId_identity: {
                    workspaceId: workspace.id,
                    identity: prospect.sourceKey,
                  },
                },
              })
            )
              holds.push("This contact is suppressed");
            if (
              await tx.sequence.count({
                where: {
                  workspaceId: workspace.id,
                  prospectId: prospect.id,
                  state: { notIn: ["cancelled", "completed", "failed"] },
                },
              })
            )
              holds.push(
                "This contact is already enrolled in an active sequence",
              );
            if (holds.length) throw new Error(holds.join("; "));
            if (process.env.PROVIDER_MODE === "live")
              throw new Error(
                "Live sender activation requires a verified sandbox. This release does not submit outbound messages.",
              );
            const holdout =
              parseInt(digest(prospect.id).slice(0, 8), 16) % 100 <
              input.holdoutPercent;
            return tx.sequence.create({
              data: {
                workspaceId: workspace.id,
                prospectId: prospect.id,
                draftId: current.id,
                draftVersion: current.version,
                approvalDigest: digest({
                  content: current.content,
                  evidence: prospect.evidence,
                  sender: currentWorkspace.preflight,
                  company: currentWorkspace.company,
                  holdoutPercent: input.holdoutPercent,
                }),
                sender: (currentWorkspace.preflight as Preflight).mailbox,
                state: "simulated",
                holdout,
                // A4: every sequence queued by this run belongs to one batch and play version.
                batchId: id,
                playVersionId: current.playVersionId,
                nextAt: new Date(),
                steps: json(
                  (current.content as Touch[]).map((t) => ({
                    ...t,
                    state: t.channel === "email" ? "simulated" : "manual",
                    assetId: holdout ? null : current.assetId,
                  })),
                ),
              },
            });
          });
          const prospect = await db.prospect.findUniqueOrThrow({
            where: { id: sequence.prospectId },
          });
          const crm = new Crm(workspace);
          await crm.upsertObject("gtmCampaigns", "GtmCampaign", sequence.id, {
            name: `Simulated ${input.play} — ${(prospect.snapshot as ProspectSnapshot).company}`,
            version: sequence.draftVersion,
            senderReady: true,
            approvedCopy: draft.content,
            sourceRows: {
              productSequenceId: sequence.id,
              holdout: sequence.holdout,
            },
            companyId: prospect.crmCompanyId,
          });
          for (const [index, touch] of (draft.content as Touch[]).entries()) {
            if (touch.channel === "email") continue;
            const taskId = `${sequence.id.slice(0, -1)}${index}`;
            await crm.task(
              taskId,
              `${touch.channel} follow-up — ${(prospect.snapshot as ProspectSnapshot).company}`,
              `${touch.body}\n\nManual task only. Verify consent and suppression before acting. Product sequence: ${sequence.id}`,
            );
          }
          outputs.push(sequence);
          actual += 1;
          await this.event(
            id,
            "progress",
            "Prepared one simulated sequence. LinkedIn and calls remain manual tasks.",
            { sequenceId: sequence.id },
          );
        }
      } else if (
        input.tool === "make_asset" &&
        isContentFormat(input.template) &&
        !prospects.length
      ) {
        await chargeAttempt(COSTS.make_asset);
        const result = await this.makeContentAsset(workspace, input, id, null);
        outputs.push({ prospectId: null, result });
        await this.event(id, "progress", `Prepared ${result.title}.`);
      } else {
        const rubric = resolveRubric(workspace);
        for (const prospect of prospects) {
          if ((await db.run.findUniqueOrThrow({ where: { id } })).cancelledAt)
            throw new Error("Cancelled. Completed work is preserved.");
          const snapshot = prospect.snapshot as ProspectSnapshot;
          if (
            ["enrich_contacts", "draft_messages", "make_asset"].includes(
              input.tool,
            ) &&
            (prospect.excluded ||
              score(snapshot, rubric).disqualified ||
              (await db.suppression.findUnique({
                where: {
                  workspaceId_identity: {
                    workspaceId: workspace.id,
                    identity: prospect.sourceKey,
                  },
                },
              })))
          ) {
            outputs.push({
              prospectId: prospect.id,
              held: true,
              reason:
                "Excluded, suppressed or below the deterministic qualification threshold.",
            });
            await this.event(
              id,
              "progress",
              `Held ${snapshot.company}: resolve qualification or suppression before preparation.`,
            );
            continue;
          }
          let result: unknown;
          if (input.tool === "score_accounts") {
            result = score(snapshot, rubric);
            await db.prospect.update({
              where: { id: prospect.id },
              data: {
                score: (result as { score: number }).score,
                breakdown: json(result),
              },
            });
          } else if (
            input.tool === "find_signals" ||
            input.tool === "mini_audit"
          ) {
            await chargeAttempt(2);
            const evidence =
              input.tool === "find_signals"
                ? await this.providers.signals(workspace.id, snapshot)
                : await this.providers.miniAudit(snapshot);
            await serializable(async (tx) => {
              await tx.prospect.update({
                where: { id: prospect.id },
                data: {
                  evidence: json([
                    ...(prospect.evidence as Evidence[]),
                    ...evidence,
                  ]),
                },
              });
              await tx.asset.updateMany({
                where: { workspaceId: workspace.id, prospectId: prospect.id },
                data: { approvedAt: null, approvedBy: null },
              });
              await tx.draft.updateMany({
                where: { workspaceId: workspace.id, prospectId: prospect.id },
                data: {
                  approvedVersion: null,
                  approvedAt: null,
                  approvedBy: null,
                },
              });
              await tx.sequence.updateMany({
                where: {
                  workspaceId: workspace.id,
                  prospectId: prospect.id,
                  state: { notIn: ["completed", "failed", "cancelled"] },
                },
                data: { state: "cancelled" },
              });
            });
            result = evidence;
          } else if (input.tool === "enrich_contacts") {
            const cacheId = `${workspace.id}:${prospect.sourceKey}:email`;
            const cache = await db.cacheEntry.findFirst({
              where: { id: cacheId, expiresAt: { gt: new Date() } },
            });
            if (!cache) await chargeAttempt(3);
            result =
              cache?.result ??
              (await this.providers.enrich(
                workspace.id,
                snapshot,
                score(snapshot, rubric).tier,
              ));
            if (!cache) {
              await db.cacheEntry.upsert({
                where: { id: cacheId },
                create: {
                  id: cacheId,
                  workspaceId: workspace.id,
                  field: "email",
                  result: json(result),
                  expiresAt: new Date(Date.now() + 90 * 86400000),
                },
                update: {
                  result: json(result),
                  expiresAt: new Date(Date.now() + 90 * 86400000),
                },
              });
            }
            const enriched = result as { email?: string; verified?: boolean };
            if (!snapshot.email && enriched.email && enriched.verified) {
              const updated = { ...snapshot, email: enriched.email };
              const crm = await new Crm(workspace).upsertPerson(
                prospect.sourceKey,
                updated,
                prospect,
              );
              await db.prospect.update({
                where: { id: prospect.id },
                data: { snapshot: json(updated), ...crm },
              });
            }
          } else if (input.tool === "draft_messages") {
            const evidence = prospect.evidence as Evidence[];
            validateEvidence(evidence);
            const offers = workspace.offers as {
              text: string;
              approved: boolean;
            }[];
            const offer = offers.find((o) => o.approved)?.text;
            if (!offer)
              throw new Error(
                "Review and approve an offer in company context first.",
              );
            if (!config.modelFixture)
              await this.event(
                id,
                "model",
                "Draft model and prompt versions recorded.",
                {
                  model: chatModelId(),
                  prompts: promptVersions("drafting", "language"),
                },
              );
            await chargeAttempt(4);
            const content = await this.providers.draft(
              snapshot,
              evidence,
              offer,
              input.language,
              workspace.company as {
                angles?: Record<string, string>;
                references?: { name: string; consent: boolean }[];
              },
            );
            result = await db.draft.create({
              data: {
                workspaceId: workspace.id,
                prospectId: prospect.id,
                playVersionId: run.playVersionId!,
                runId: id,
                content: json(content),
                evidenceDigest: digest(evidence),
              },
            });
          } else if (
            input.tool === "make_asset" &&
            isContentFormat(input.template)
          ) {
            validateEvidence(prospect.evidence as Evidence[]);
            await chargeAttempt(COSTS.make_asset);
            result = await this.makeContentAsset(workspace, input, id, prospect);
          } else if (input.tool === "make_asset") {
            if (!config.modelFixture)
              await this.event(
                id,
                "model",
                "Asset model and prompt versions recorded.",
                {
                  model: required("MODEL_ID"),
                  prompts: promptVersions("asset", "language"),
                },
              );
            const evidence = prospect.evidence as Evidence[];
            validateEvidence(evidence);
            if (
              input.template === "offer-one-pager" &&
              !(workspace.offers as { approved: boolean }[]).some(
                (o) => o.approved,
              )
            )
              throw new Error(
                "Approve an offer before generating its one-pager.",
              );
            await chargeAttempt(6);
            const generated = await new OpenDesign(workspace).generate(
              input.template,
              snapshot,
              evidence,
              input.language,
              input.message,
              input.sourceAssetId
                ? (
                    await this.storage.get(
                      workspace.id,
                      (
                        await db.asset.findFirstOrThrow({
                          where: {
                            id: input.sourceAssetId,
                            workspaceId: workspace.id,
                          },
                        })
                      ).htmlKey,
                    )
                  ).toString("utf8")
                : undefined,
            );
            const assetId = randomUUID();
            const htmlKey = `${assetId}.html`,
              pdfKey = `${assetId}.pdf`;
            await this.storage.put(
              workspace.id,
              htmlKey,
              Buffer.from(generated.html),
              "text/html",
            );
            await this.storage.put(
              workspace.id,
              pdfKey,
              await renderPdf(generated.html),
              "application/pdf",
            );
            const created = await db.asset.create({
              data: {
                id: assetId,
                workspaceId: workspace.id,
                prospectId: prospect.id,
                runId: id,
                template: input.template,
                language: input.language,
                engineVersion: OpenDesign.version,
                engineProjectId: generated.engineProjectId,
                title: `${input.template} — ${snapshot.company}${input.sourceAssetId ? " · revision" : ""}`,
                htmlKey,
                pdfKey,
                evidenceDigest: digest(evidence),
                threadId: input.threadId ?? null,
                playId: input.play,
              },
            });
            result = created;
            await fileDeliverable(workspace.id, input.threadId, created);
            await new Crm(workspace).upsertObject(
              "gtmAssets",
              "GtmAsset",
              assetId,
              {
                name: `${input.template} — ${snapshot.company}`,
                kind: input.template,
                language: input.language,
                snapshot: {
                  productAssetId: assetId,
                  prospectId: prospect.id,
                  url: `${config.webOrigin}/api/workspaces/${workspace.id}/assets/${assetId}/html`,
                },
                editableHtml: null,
                campaignVersion: 1,
              },
            );
          }
          outputs.push({ prospectId: prospect.id, result });
          await this.event(id, "progress", `Completed ${snapshot.company}.`, {
            prospectId: prospect.id,
          });
          await db.run.update({
            where: { id },
            data: {
              output: json(outputs),
              actualCost: actual,
              leaseUntil: new Date(Date.now() + 180000),
            },
          });
        }
      }
      await db.run.update({
        where: { id },
        data: {
          state: "succeeded",
          output: json(outputs),
          actualCost: actual,
          leaseUntil: null,
        },
      });
      await this.event(
        id,
        "succeeded",
        "Completed. Review the saved results before the next step.",
      );
    } catch (error) {
      await db.run.update({
        where: { id },
        data: {
          state: "failed",
          error: safeError(error),
          nextAction:
            "Fix the reported issue and start a new action. Completed results are preserved.",
          actualCost: actual,
          leaseUntil: null,
        },
      });
      await this.event(id, "failed", safeError(error));
    } finally {
      clearInterval(heartbeat);
      await this.reconcile(id, actual);
    }
  }
  async reconcile(runId: string, actual: number) {
    await serializable(async (tx) => {
      const usage = await tx.usage.findUnique({ where: { runId } });
      if (!usage || usage.state !== "reserved") return;
      const charged = Math.min(actual, usage.reserved);
      for (const id of [
        `${usage.workspaceId}:${month(usage.createdAt)}`,
        `${usage.workspaceId}:${usage.userId}:${month(usage.createdAt)}`,
      ])
        await tx.budget.update({
          where: { id },
          data: {
            reserved: { decrement: usage.reserved },
            used: { increment: charged },
          },
        });
      for (const reservation of await tx.quotaReservation.findMany({
        where: { runId, actual: null },
      })) {
        const units = usage.reserved
          ? Math.ceil((reservation.reserved * charged) / usage.reserved)
          : 0;
        await tx.quota.update({
          where: {
            id: `${usage.workspaceId}:${month(usage.createdAt)}:${reservation.kind}`,
          },
          data: {
            reserved: { decrement: reservation.reserved },
            used: { increment: units },
          },
        });
        await tx.quotaReservation.update({
          where: { id: reservation.id },
          data: { actual: units },
        });
      }
      await tx.usage.update({
        where: { runId },
        data: { state: "reconciled", actual: charged },
      });
    });
  }
  async recoverInterrupted() {
    const stale = await db.run.findMany({
      where: {
        state: "running",
        queueName: config.queueName,
        leaseUntil: { lt: new Date() },
      },
    });
    for (const run of stale) {
      // Never repeat uncertain provider submissions after a crash.
      const recovered = await db.run.updateMany({
        where: { id: run.id, state: "running", leaseUntil: { lt: new Date() } },
        data: {
          state: "failed",
          error:
            "Execution was interrupted. Inspect completed results before retrying.",
          nextAction:
            "Review the run log; uncertain provider operations require reconciliation.",
          leaseUntil: null,
        },
      });
      if (!recovered.count) continue;
      await this.reconcile(run.id, run.estimate);
      await this.event(
        run.id,
        "failed",
        "Interrupted execution recovered without repeating provider calls. Reserved cost was retained conservatively for review.",
      );
    }
    const complete = await db.run.findMany({
      where: {
        queueName: config.queueName,
        state: { in: ["succeeded", "failed"] },
      },
    });
    for (const run of complete) await this.reconcile(run.id, run.actualCost);
  }
}


// Files a finished deliverable back into the Nabil conversation that proposed it, so the
// thread shows a card that opens the canvas. The member who owns the thread sees it.
async function fileDeliverable(
  workspaceId: string,
  threadId: string | undefined,
  asset: { id: string; template: string; title: string },
) {
  if (!threadId) return;
  const thread = await db.chatThread.findFirst({
    where: { id: threadId, workspaceId, archivedAt: null },
  });
  if (!thread) return;
  await db.chatMessage.create({
    data: {
      workspaceId,
      userId: thread.userId,
      threadId,
      role: "assistant",
      content: asset.title.endsWith("· revision")
        ? "The revision is ready. It is saved as a new draft; the original is unchanged."
        : "Your deliverable is ready. Review it in the canvas, then approve it to export.",
      context: json({
        deliverable: {
          assetId: asset.id,
          template: asset.template,
          title: asset.title,
        },
        model: "workspace-action",
      }),
    },
  });
  await db.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
}


// A workspace-level deliverable (no account) is approved against the approved offer,
// company context and brand it was written from.
export function workspaceBasis(workspace: {
  offers: unknown;
  company: unknown;
  brand: unknown;
}) {
  return {
    offers: (workspace.offers as { approved: boolean }[]).filter((o) => o.approved),
    company: workspace.company,
    brand: workspace.brand,
  };
}
export const workspaceBasisDigest = (
  workspace: Parameters<typeof workspaceBasis>[0],
) => digest(workspaceBasis(workspace));

// What a deliverable is approved against. Account deliverables use the account's evidence;
// account-free ones use the workspace basis. A capability profile is built from the workspace
// (offers, references with consent) and, when tailored, also from the account's evidence, so
// it is bound to both and a withdrawn reference or offer stales its approval.
export function deliverableBasis(
  template: string,
  workspace: Parameters<typeof workspaceBasis>[0],
  evidence: unknown | null,
) {
  if (evidence === null) return workspaceBasis(workspace);
  return template === "capability-profile"
    ? { workspace: workspaceBasis(workspace), evidence }
    : evidence;
}

// The sources an asset was approved against: its account's evidence, or the workspace
// basis for account-free deliverables. Null when the account was deleted.
export async function assetBasis(
  workspaceId: string,
  asset: { prospectId: string | null; template?: string },
) {
  const workspace = async () =>
    db.workspace.findUniqueOrThrow({ where: { id: workspaceId } });
  if (asset.prospectId) {
    const prospect = await db.prospect.findFirst({
      where: { id: asset.prospectId, workspaceId },
    });
    if (!prospect) return null;
    return asset.template === "capability-profile"
      ? deliverableBasis(asset.template, await workspace(), prospect.evidence)
      : prospect.evidence;
  }
  return workspaceBasis(await workspace());
}
