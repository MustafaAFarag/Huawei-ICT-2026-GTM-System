import { z } from "zod";
import { ModelGateway } from "./model.js";
import { randomUUID } from "node:crypto";
import { resolveTxt } from "node:dns/promises";
import { chromium } from "playwright";
import type { Workspace } from "@revenue/database";
import type {
  Evidence,
  Brand,
  ProspectSnapshot,
  Preflight,
  Touch,
} from "@revenue/contracts";
import { Vault } from "./vault.js";
import { db } from "./database.js";
import { config, required } from "./config.js";
import { escapeHtml } from "./policy.js";
import { publicPage } from "./public-web.js";

export class Crm {
  constructor(private workspace: Workspace) {}
  private settings() {
    const binding = this.workspace.crmBinding;
    if (!["A", "B"].includes(binding))
      throw new Error("CRM binding is not configured.");
    return {
      url: required(`TWENTY_${binding}_URL`),
      key: required(`TWENTY_${binding}_API_KEY`),
    };
  }
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    const { url, key } = this.settings();
    const response = await fetch(`${url}/rest/${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(20000),
    });
    if (!response.ok)
      throw new Error(
        `CRM returned ${response.status}. Check the workspace connection and retry.`,
      );
    return response.json() as Promise<T>;
  }
  async upsertObject(
    plural: string,
    singular: string,
    id: string,
    body: Record<string, unknown>,
  ) {
    const found = await this.request<{
      data: Record<string, { id: string }[]>;
    }>(`${plural}?filter=${encodeURIComponent(`id[eq]:${id}`)}&limit=1`);
    if (found.data[plural]?.length) {
      await this.request(`${plural}/${id}`, "PATCH", body);
      return id;
    }
    await this.request(plural, "POST", { ...body, id });
    return id;
  }
  async task(id: string, title: string, body: string) {
    return this.upsertObject("tasks", "Task", id, {
      title,
      bodyV2: { blocknote: null, markdown: body },
      status: "TODO",
    });
  }
  async health() {
    await this.request("companies?limit=1");
    return "connected";
  }
  async upsertPerson(
    sourceKey: string,
    snapshot: ProspectSnapshot,
    existing?: { crmPersonId: string | null; crmCompanyId: string | null },
  ) {
    // Search by the native email/domain first so a retried import does not create duplicate CRM records.
    const companySearch = await this.request<{
      data: { companies: { id: string }[] };
    }>(
      `companies?filter=${encodeURIComponent(`name[eq]:${snapshot.company}`)}&limit=1`,
    );
    let companyId =
      existing?.crmCompanyId ?? companySearch.data.companies[0]?.id;
    if (!companyId) {
      const created = await this.request<{
        data: { createCompany: { id: string } };
      }>("companies", "POST", { name: snapshot.company });
      companyId = created.data.createCompany.id;
    }
    const people = snapshot.email
      ? await this.request<{ data: { people: { id: string }[] } }>(
          `people?filter=${encodeURIComponent(`emails.primaryEmail[eq]:${snapshot.email}`)}&limit=1`,
        )
      : { data: { people: [] } };
    let personId = existing?.crmPersonId ?? people.data.people[0]?.id;
    const body = {
      name: { firstName: snapshot.firstName, lastName: snapshot.lastName },
      emails: { primaryEmail: snapshot.email, additionalEmails: [] },
      jobTitle: snapshot.title,
      companyId,
    };
    if (!personId) {
      const created = await this.request<{
        data: { createPerson: { id: string } };
      }>("people", "POST", body);
      personId = created.data.createPerson.id;
    } else await this.request(`people/${personId}`, "PATCH", body);
    return { crmPersonId: personId!, crmCompanyId: companyId! };
  }
}

export class Providers {
  private vault = new Vault();
  private async credential(workspaceId: string, provider: string) {
    const connector = await db.connector.findUnique({
      where: { workspaceId_provider: { workspaceId, provider } },
    });
    if (!connector?.secretRef)
      throw new Error(`Connect ${provider} in workspace settings first.`);
    return {
      connector,
      value: await this.vault.get(workspaceId, connector.secretRef),
    };
  }
  async signals(
    workspaceId: string,
    snapshot: ProspectSnapshot,
  ): Promise<Evidence[]> {
    if (config.fixture)
      return [
        {
          id: randomUUID(),
          claim: `${snapshot.company} has a synthetic hiring signal for this demonstration.`,
          url: "https://example.com/synthetic-fixture",
          date: new Date().toISOString(),
          kind: "fact",
          approved: false,
          source: "Simulated PredictLeads fixture",
        },
      ];
    const { value } = await this.credential(workspaceId, "predictleads");
    const { key, token } = JSON.parse(value) as { key: string; token: string };
    const domain = new URL(snapshot.website).hostname;
    const response = await fetch(
      `https://predictleads.com/api/v3/companies/${encodeURIComponent(domain)}/job_openings`,
      {
        headers: { "X-Api-Key": key, "X-Api-Token": token },
        signal: AbortSignal.timeout(20000),
      },
    );
    if (!response.ok)
      throw new Error(
        `Signal provider returned ${response.status}. Check its quota and connection.`,
      );
    const data = (await response.json()) as {
      data?: {
        attributes: { title?: string; url?: string; first_seen_at?: string };
      }[];
    };
    return (data.data ?? [])
      .slice(0, 5)
      .filter(
        (record) => record.attributes.url && record.attributes.first_seen_at,
      )
      .map((record) => ({
        id: randomUUID(),
        claim: `${snapshot.company} advertised ${record.attributes.title ?? "a position"}.`,
        url: record.attributes.url!,
        date: record.attributes.first_seen_at!,
        kind: "fact",
        approved: false,
        source: "PredictLeads",
      }));
  }
  async enrich(workspaceId: string, snapshot: ProspectSnapshot, tier: string) {
    // Phase D has one real signal provider; enrichment fixtures implement the full bounded waterfall.
    if (!config.fixture)
      throw new Error(
        "No licensed contact enrichment sandbox is configured. Connect a supported provider before enabling live enrichment.",
      );
    return {
      email:
        snapshot.email ||
        `contact@${new URL(snapshot.website || "https://example.com").hostname}`,
      phone: tier === "A" ? "+20 100 000 0000" : null,
      verified: true,
      source: "Simulated enrichment fixture",
      steps: [
        "CRM/cache checked",
        "Fixture provider 1: no match",
        "Fixture provider 2: verified simulated result",
      ],
      simulated: true,
    };
  }
  async preflight(workspace: Workspace): Promise<Preflight> {
    if (config.fixture)
      return {
        mailbox: "demo@example.com",
        spf: true,
        dkim: true,
        dmarc: true,
        unsubscribe: true,
        warmupDays: 21,
        bounceRate: 0.005,
        complaintRate: 0,
        dailyCap: 30,
        checkedAt: new Date().toISOString(),
        simulated: true,
      };
    const configured = workspace.preflight as Partial<Preflight> & {
      dkimSelector?: string;
    };
    if (!configured.mailbox)
      throw new Error("Connect a sender mailbox before running pre-flight.");
    const domain = configured.mailbox.split("@")[1];
    if (!domain || !/^[a-zA-Z0-9.-]+$/.test(domain))
      throw new Error("Mailbox domain is invalid.");
    const txt = async (host: string, prefix: string) => {
      try {
        return (await resolveTxt(host)).some((parts) =>
          parts.join("").includes(prefix),
        );
      } catch {
        return false;
      }
    };
    const [spf, dmarc, dkim] = await Promise.all([
      txt(domain, "v=spf1"),
      txt(`_dmarc.${domain}`, "v=DMARC1"),
      configured.dkimSelector
        ? txt(`${configured.dkimSelector}._domainkey.${domain}`, "v=DKIM1")
        : false,
    ]);
    return {
      mailbox: configured.mailbox,
      spf,
      dmarc,
      dkim,
      unsubscribe: configured.unsubscribe === true,
      warmupDays: configured.warmupDays ?? 0,
      bounceRate: configured.bounceRate ?? 1,
      complaintRate: configured.complaintRate ?? 1,
      dailyCap: configured.dailyCap ?? 0,
      checkedAt: new Date().toISOString(),
      simulated: false,
    };
  }
  async draft(
    snapshot: ProspectSnapshot,
    evidence: Evidence[],
    offer: string,
    language: string,
  ): Promise<Touch[]> {
    const facts = evidence.filter(
      (item) => item.approved && item.kind === "fact",
    );
    const fact = facts[0];
    if (!fact)
      throw new Error("Review a dated factual source before drafting.");
    if (!config.fixture) {
      const schema = z.object({
        touches: z
          .array(
            z.object({
              channel: z.enum(["email", "linkedin", "call"]),
              day: z.number().int().min(0).max(60),
              subject: z.string().max(200).optional(),
              body: z.string().max(3000),
              evidenceIds: z.array(z.string()),
            }),
          )
          .length(3),
      });
      const result = (await new ModelGateway().json(
        "Write three concise touches: email day 0, manual LinkedIn day 3, manual call day 7. Use only the supplied approved facts and offer. Cite the supplied fact IDs in evidenceIds. Email must include an opt-out instruction. Use the requested language; ar-EG is natural Egyptian business Arabic. Return {touches:[...]}.",
        { snapshot, facts, offer, language },
        schema,
      )) as z.infer<typeof schema>;
      const ids = new Set(facts.map((f) => f.id));
      if (
        result.touches.map((t) => t.channel).join(",") !==
          "email,linkedin,call" ||
        result.touches.some((t) => t.evidenceIds.some((id) => !ids.has(id))) ||
        !/stop|unsubscribe|توقف|إلغاء/i.test(result.touches[0]!.body)
      )
        throw new Error(
          "The generated draft failed the grounded sequence check. Review the sources and retry.",
        );
      return result.touches;
    }
    const arabic = language !== "en";
    const body = arabic
      ? `أهلًا ${snapshot.firstName}\n\nالمعلومة اللي بنبني عليها الرسالة\n${fact.claim}\n\n${offer}\n\nتحب نتكلم عشر دقايق ونشوف لو مناسب ليكم؟\nلو مش حابب تستقبل رسائل تانية رد بكلمة توقف`
      : `Hi ${snapshot.firstName},\n\n${fact.claim}\n\n${offer}\n\nWould a ten-minute conversation be useful?\nReply stop if you do not want further messages.`;
    return [
      {
        channel: "email",
        day: 0,
        subject: arabic
          ? `فكرة لفريق ${snapshot.company}`
          : `An idea for ${snapshot.company}`,
        body,
        evidenceIds: [fact.id],
      },
      {
        channel: "linkedin",
        day: 3,
        body: arabic
          ? `أهلًا ${snapshot.firstName} حابب أشاركك فكرة عن ${offer}`
          : `Hi ${snapshot.firstName}, I would like to share an idea: ${offer}`,
        evidenceIds: [],
      },
      {
        channel: "call",
        day: 7,
        body: arabic
          ? `اسأل عن الوقت المناسب لمناقشة ${offer} وراجع موافقة التواصل الأول`
          : `Ask for a suitable time to discuss ${offer}. Check communication consent before calling.`,
        evidenceIds: [],
      },
    ];
  }
  async miniAudit(snapshot: ProspectSnapshot): Promise<Evidence[]> {
    const page = await publicPage(snapshot.website);
    const checks = [
      `HTML response fetched in ${page.milliseconds} ms in this server-side check (not a browser speed benchmark).`,
      /name=["']viewport/i.test(page.html)
        ? "A mobile viewport declaration is present in the HTML."
        : "No mobile viewport declaration was found in the fetched HTML.",
      /mailto:|tel:|contact/i.test(page.html)
        ? "A contact path was found in the fetched HTML."
        : "No obvious contact path was found in the fetched HTML.",
      /lang=["']ar|dir=["']rtl/i.test(page.html)
        ? "An Arabic or RTL declaration was found in the fetched HTML."
        : "No Arabic or RTL declaration was found in this page.",
      /testimonial|case.study|customer|client/i.test(page.html)
        ? "Possible customer proof is mentioned; human review is needed."
        : "No obvious customer proof label was found in this page.",
    ];
    return checks.map((claim) => ({
      id: randomUUID(),
      claim,
      url: page.url,
      date: new Date().toISOString(),
      source: "Public website HTML check",
      kind: "fact",
      approved: false,
    }));
  }
}

export class OpenDesign {
  static readonly version =
    "open-design-v0.24.1@89e64d813bb1c7a11519b3f668f011f7017637d7";
  constructor(private workspace: Workspace) {}
  private settings() {
    const binding = this.workspace.assetBinding;
    if (!["A", "B"].includes(binding))
      throw new Error("Asset Studio binding is invalid.");
    return {
      url: required(`OPEN_DESIGN_${binding}_URL`),
      token: required(`OPEN_DESIGN_${binding}_TOKEN`),
    };
  }
  async request<T>(path: string, body?: unknown): Promise<T> {
    const { url, token } = this.settings();
    const response = await fetch(`${url}${path}`, {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(
        `Asset engine returned ${response.status}. Retry or ask the workspace owner to check its connection.`,
      );
    return response.json() as Promise<T>;
  }
  async generate(
    template: string,
    snapshot: ProspectSnapshot,
    evidence: Evidence[],
    language: string,
  ) {
    const brand = this.workspace.brand as unknown as Brand;
    const base = assetHtml(
      brand,
      snapshot,
      evidence,
      template,
      language,
      config.fixture,
    );
    let html = base;
    if (!config.fixture) {
      const { url, token } = this.settings();
      const response = await fetch(`${url}/api/proxy/openai/stream`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          baseUrl: required("MODEL_BASE_URL"),
          apiKey: required("MODEL_API_KEY"),
          model: required("MODEL_ID"),
          maxTokens: 3000,
          systemPrompt:
            "Return one complete HTML artifact in <artifact> tags. Use only supplied approved facts. Do not add facts or scripts, remote resources or commands. Preserve the supplied English or Arabic direction and escape text.",
          messages: [{ role: "user", content: base }],
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!response.ok)
        throw new Error(
          `Model generation returned ${response.status}. Check the model connection.`,
        );
      const text = await response.text();
      const chunks = text
        .split("\n")
        .filter((line) => line.startsWith("data: "))
        .flatMap((line) => {
          try {
            const data = JSON.parse(line.slice(6));
            return typeof data.text === "string"
              ? [data.text]
              : typeof data.delta === "string"
                ? [data.delta]
                : [];
          } catch {
            return [];
          }
        })
        .join("");
      const artifact = chunks.match(
        /<artifact[^>]*>([\s\S]+?)<\/artifact>/i,
      )?.[1];
      if (
        !artifact ||
        /<script\b|\son\w+\s*=|<iframe\b|javascript:|https?:\/\/[^<]+\.(?:js|css)/i.test(
          artifact,
        )
      )
        throw new Error(
          "The generated asset failed the safe artifact check. Retry with the approved template.",
        );
      // Keep the deterministic approved facts as the publication contract; model output remains a proposed design.
      html = artifact;
    }
    const saved = await this.request<{ url: string }>("/api/artifacts/save", {
      identifier: randomUUID(),
      title: `${template} — ${snapshot.company}`,
      html,
    });
    return { html, engineProjectId: saved.url };
  }
}

export function assetHtml(
  brand: Brand,
  snapshot: ProspectSnapshot,
  evidence: Evidence[],
  template: string,
  language: string,
  simulated: boolean,
) {
  const arabic = language !== "en";
  const color = /^#[0-9a-f]{6}$/i.test(brand.primary)
    ? brand.primary
    : "#242424";
  const title =
    template === "mini-audit"
      ? arabic
        ? "مراجعة سريعة لموقعك"
        : "A short website review"
      : arabic
        ? "فكرة تساعد فريقك ينمو"
        : "An idea for your next stage";
  const rows = evidence
    .filter((item) => item.approved && item.kind === "fact")
    .map(
      (item, index) =>
        `<section><span class="number">${String(index + 1).padStart(2, "0")}</span><p dir="auto">${escapeHtml(item.claim)}</p><a dir="ltr" href="${escapeHtml(item.url)}">${escapeHtml(new URL(item.url).hostname)} · ${escapeHtml(item.date.slice(0, 10))}</a></section>`,
    )
    .join("");
  return `<!doctype html><html lang="${arabic ? "ar" : "en"}" dir="${arabic ? "rtl" : "ltr"}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title><style>@page{size:A4;margin:16mm}*{box-sizing:border-box}body{font:16px/1.8 Arial,sans-serif;color:#242424;background:#fff;margin:0}.sheet{max-width:760px;margin:auto;padding:36px}header{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid ${color};padding-bottom:16px}.brand{font-weight:bold;color:${color}}.eyebrow{font-size:12px;color:#666}h1{font-size:42px;line-height:1.3;margin:36px 0 16px}h2{font-size:22px}section{break-inside:avoid;padding:20px 0;border-top:1px solid #ddd}.number{font-size:12px;color:#777}section p{margin:8px 0}a{font-size:12px;color:#555;word-break:break-all;display:inline-block}footer{border-top:2px solid ${color};margin-top:32px;padding-top:12px;font-size:12px;color:#666}.label{font-size:12px;color:#8a4c00}bdi{unicode-bidi:isolate}@media print{.sheet{padding:0}a{text-decoration:none}}</style></head><body><article class="sheet"><header><span class="brand">${escapeHtml(brand.name || "Revenue Workspace")}</span><span class="eyebrow">${arabic ? "مُعد خصيصًا لفريقك" : "PREPARED FOR YOUR TEAM"}</span></header>${simulated ? `<p class="label">${arabic ? "بيانات تجريبية مصطنعة · ليست توصية تجارية حقيقية" : "Synthetic demonstration data · template generation is simulated"}</p>` : ""}<h1>${title}</h1><h2 dir="auto">${escapeHtml(snapshot.company)}</h2><p>${arabic ? "الملاحظات دي مبنية على المصادر اللي راجعناها سوا ومحتاجة مراجعتك قبل المشاركة" : "These observations come from the reviewed sources below. Review this document before sharing it."}</p>${rows}<footer><span dir="auto">${escapeHtml(brand.name)}</span> · <bdi>${escapeHtml(brand.website)}</bdi> · ${arabic ? "المصدر والتاريخ موضحين تحت كل ملاحظة" : "Sources and dates accompany each observation"}</footer></article></body></html>`;
}

export async function renderPdf(html: string) {
  const browser = await chromium.launch({
    headless: true,
    executablePath: process.env.CHROME_PATH ?? "/usr/bin/google-chrome-stable",
  });
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    await context.route("**/*", (route) => route.abort());
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    return await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
    });
  } finally {
    await browser.close();
  }
}
