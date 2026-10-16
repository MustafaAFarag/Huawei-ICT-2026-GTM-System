import "./config.js";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { toNodeHandler, fromNodeHeaders } from "better-auth/node";
import { createTransport } from "nodemailer";
import { db } from "./database.js";
import { required, config } from "./config.js";
import { ForbiddenException, UnauthorizedException } from "@nestjs/common";
import type { IncomingHttpHeaders } from "node:http";
import type { Actor, Role } from "@revenue/contracts";

const mail = createTransport({
  host: process.env.SMTP_HOST ?? "127.0.0.1",
  port: Number(process.env.SMTP_PORT ?? 1026),
  secure: false,
});
export const auth = betterAuth({
  database: prismaAdapter(db, { provider: "postgresql" }),
  secret: required("BETTER_AUTH_SECRET"),
  baseURL: process.env.BETTER_AUTH_URL ?? config.webOrigin,
  trustedOrigins: [config.webOrigin],
  emailAndPassword: {
    enabled: true,
    disableSignUp: true,
    minPasswordLength: 12,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      await mail.sendMail({
        from: process.env.SMTP_FROM,
        to: user.email,
        subject: "Reset your Caravan password",
        text: `Use this link to reset your password: ${url}`,
      });
    },
  },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, window: 60, max: 60, storage: "database" },
  advanced: {
    useSecureCookies: config.webOrigin.startsWith("https://"),
    // API ingress is private. Only the web proxy supplies this sanitized header.
    ipAddress: { ipAddressHeaders: ["x-revenue-client-ip"] },
  },
});

export { toNodeHandler };
export async function sessionUser(headers: IncomingHttpHeaders) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(headers),
  });
  if (!session) throw new UnauthorizedException("Sign in again to continue.");
  return session.user;
}
export async function actorFor(
  headers: IncomingHttpHeaders,
  workspaceId: string,
): Promise<Actor> {
  const user = await sessionUser(headers);
  const membership = await db.membership.findUnique({
    where: { workspaceId_userId: { workspaceId, userId: user.id } },
  });
  if (!membership)
    throw new ForbiddenException("You do not have access to this workspace.");
  return { userId: user.id, workspaceId, role: membership.role as Role };
}
