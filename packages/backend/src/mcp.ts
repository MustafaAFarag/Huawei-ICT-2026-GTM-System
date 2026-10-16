import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import type { Request, Response } from "express";
import { z } from "zod";
import { tools, assetTemplates, type Actor } from "@revenue/contracts";
import { WorkflowService } from "./workflows.js";
import { safeError } from "./policy.js";
export async function handleMcp(
  actor: Actor,
  request: Request,
  response: Response,
) {
  const server = new McpServer({ name: "revenue-workspace", version: "0.1.0" });
  const workflows = new WorkflowService();
  for (const tool of tools)
    server.registerTool(
      tool,
      {
        description: `Workspace-authorized ${tool}. Returns a durable run or a cost quote requiring explicit approval in the product.`,
        inputSchema: {
          requestKey: z.string().min(8).max(150),
          prospectIds: z.array(z.uuid()).max(100).optional(),
          draftIds: z.array(z.uuid()).max(100).optional(),
          spendApprovalId: z.uuid().optional(),
          play: z.enum(["P1", "P2", "P3", "P4"]).optional(),
          language: z.enum(["en", "ar-EG", "ar-Gulf", "ar"]).optional(),
          template: z.enum(assetTemplates).optional(),
          website: z.url().optional(),
          message: z.string().min(1).max(3000).optional(),
        },
      },
      async (input) => {
        try {
          const value = { ...input, tool };
          const result =
            input.spendApprovalId ||
            ["score_accounts", "preflight"].includes(tool)
              ? await workflows.start(actor, value)
              : {
                  requiresHumanApproval: true,
                  quote: await workflows.quote(actor, value),
                };
          return { content: [{ type: "text", text: JSON.stringify(result) }] };
        } catch (error) {
          return {
            isError: true,
            content: [{ type: "text", text: safeError(error) }],
          };
        }
      },
    );
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  response.on("close", () => {
    void transport.close();
    void server.close();
  });
  await server.connect(transport);
  await transport.handleRequest(request, response, request.body);
}
