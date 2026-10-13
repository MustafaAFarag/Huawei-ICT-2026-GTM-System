import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { request as httpRequest } from "node:http";
import { request as httpsRequest } from "node:https";

export function publicAddress(address: string): boolean {
  if (address.includes(":")) {
    const lower = address.toLowerCase();
    // Only global unicast destinations. Block documentation and transition ranges too.
    return (
      isIP(lower) === 6 &&
      /^[23][0-9a-f]{3}:/.test(lower) &&
      !/^2001:(?:0:|db8:|10:|20:)/.test(lower) &&
      !lower.startsWith("2002:") &&
      !lower.startsWith("3fff:")
    );
  }
  const octets = address.split(".").map(Number);
  const [a, b] = octets;
  return (
    isIP(address) === 4 &&
    octets.length === 4 &&
    octets.every((n) => n >= 0 && n <= 255) &&
    a !== 0 &&
    a !== 10 &&
    a !== 127 &&
    a < 224 &&
    !(a === 169 && b === 254) &&
    !(a === 172 && b >= 16 && b <= 31) &&
    !(a === 192 && [0, 168].includes(b)) &&
    !(a === 100 && b >= 64 && b <= 127) &&
    !(a === 198 && [18, 19].includes(b)) &&
    !(a === 198 && b === 51 && octets[2] === 100) &&
    !(a === 203 && b === 0 && octets[2] === 113)
  );
}
export async function publicPage(
  input: string,
  redirects = 0,
): Promise<{ url: string; html: string; milliseconds: number }> {
  const url = new URL(input);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    (url.port && !["80", "443"].includes(url.port))
  )
    throw new Error("Use a public HTTP or HTTPS website on its standard port.");
  const hostname = url.hostname.replace(/^\[|\]$/g, "");
  const addresses = isIP(hostname)
    ? [{ address: hostname, family: isIP(hostname) }]
    : await lookup(hostname, { all: true });
  if (
    !addresses.length ||
    addresses.some((item) => !publicAddress(item.address))
  )
    throw new Error(
      "Private, local and reserved network addresses cannot be researched.",
    );
  const started = performance.now();
  const result = await new Promise<{
    status: number;
    location?: string;
    html: string;
  }>((resolve, reject) => {
    const request = (url.protocol === "https:" ? httpsRequest : httpRequest)(
      {
        protocol: url.protocol,
        hostname: addresses[0]!.address,
        family: addresses[0]!.family,
        port: url.port || (url.protocol === "https:" ? 443 : 80),
        servername: hostname,
        path: url.pathname + url.search,
        headers: {
          Host: url.host,
          "User-Agent": "RevenueWorkspace/0.1 public website review",
          Accept: "text/html",
        },
        timeout: 10000,
      },
      (response) => {
        let bytes = 0;
        const buffers: Buffer[] = [];
        response.on("data", (chunk: Buffer) => {
          bytes += chunk.length;
          if (bytes > 2_000_000) {
            request.destroy(
              new Error("Website exceeds the two-megabyte research limit."),
            );
            return;
          }
          buffers.push(chunk);
        });
        response.on("error", reject);
        response.on("end", () =>
          resolve({
            status: response.statusCode ?? 500,
            location: response.headers.location,
            html: Buffer.concat(buffers).toString("utf8"),
          }),
        );
      },
    );
    request.on("timeout", () =>
      request.destroy(
        new Error("Website timed out. Try again or supply a dated source."),
      ),
    );
    request.on("error", reject);
    request.end();
  });
  if ([301, 302, 303, 307, 308].includes(result.status) && result.location) {
    if (redirects >= 3) throw new Error("Website redirects too many times.");
    return publicPage(new URL(result.location, url).href, redirects + 1);
  }
  if (result.status < 200 || result.status >= 300)
    throw new Error(
      `Website returned ${result.status}. Add a source manually or retry later.`,
    );
  return {
    url: url.href,
    html: result.html,
    milliseconds: Math.round(performance.now() - started),
  };
}
export function pageText(html: string) {
  return html
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, 12000)
    .trim();
}
