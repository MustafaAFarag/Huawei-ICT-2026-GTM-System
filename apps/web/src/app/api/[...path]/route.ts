import type { NextRequest } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function proxy(
  request: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  if (
    path.some(
      (segment) =>
        segment === "." ||
        segment === ".." ||
        !/^[a-zA-Z0-9._-]+$/.test(segment),
    )
  )
    return Response.json({ message: "Invalid API path." }, { status: 400 });
  const destination = new URL(
    `/api/${path.map(encodeURIComponent).join("/")}${request.nextUrl.search}`,
    process.env.API_URL ?? "http://127.0.0.1:4100",
  );
  const headers = new Headers(request.headers);
  for (const name of [
    "host",
    "connection",
    "content-length",
    "transfer-encoding",
    "accept-encoding",
    "x-forwarded-host",
    "x-forwarded-for",
    "x-real-ip",
    "x-revenue-client-ip",
  ])
    headers.delete(name);
  // Azure app ingress appends its verified client address at the right end.
  if (process.env.TRUST_AZURE_INGRESS === "true") {
    const clientIp = request.headers
      .get("x-forwarded-for")
      ?.split(",")
      .at(-1)
      ?.trim();
    if (clientIp) headers.set("x-revenue-client-ip", clientIp);
  }
  try {
    const response = await fetch(destination, {
      method: request.method,
      headers,
      body: ["GET", "HEAD"].includes(request.method) ? undefined : request.body,
      duplex: "half",
      redirect: "manual",
      cache: "no-store",
      signal: request.signal,
    } as RequestInit);
    const resultHeaders = new Headers(response.headers);
    if (!resultHeaders.has("content-security-policy"))
      resultHeaders.set("content-security-policy", "frame-ancestors 'self'");
    for (const name of [
      "connection",
      "transfer-encoding",
      "content-length",
      "content-encoding",
    ])
      resultHeaders.delete(name);
    return new Response(response.body, {
      status: response.status,
      headers: resultHeaders,
    });
  } catch {
    return Response.json(
      {
        message:
          "The workspace service is temporarily unavailable. Retry in a moment.",
      },
      { status: 503 },
    );
  }
}
export {
  proxy as GET,
  proxy as POST,
  proxy as PATCH,
  proxy as PUT,
  proxy as DELETE,
  proxy as HEAD,
  proxy as OPTIONS,
};
