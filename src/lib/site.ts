import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_PAGES = 5;
const MAX_CHARS = 60_000;
const MAX_BYTES = 2_000_000;
const TIMEOUT_MS = 10_000;
const USEFUL_PATHS = /about|service|product|solution|offer|pricing|menu|story|team|work|portfolio|contact/i;

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 6) {
    const lower = ip.toLowerCase();
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return lower === "::1" || lower === "::" || lower.startsWith("fc") || lower.startsWith("fd") || lower.startsWith("fe80");
  }
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 10 ||
    a === 127 ||
    a === 0 ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 100 && b >= 64 && b <= 127)
  );
}

// Only fetch public http(s) addresses, so a typed URL cannot reach internal services.
async function assertPublicUrl(raw: string): Promise<URL> {
  const url = new URL(raw);
  if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error("Only http and https addresses are supported.");
  const addresses = await lookup(url.hostname, { all: true });
  if (addresses.length === 0 || addresses.some((a) => isPrivateAddress(a.address))) {
    throw new Error("That address does not resolve to a public website.");
  }
  return url;
}

async function fetchHtml(raw: string): Promise<{ url: URL; html: string } | null> {
  let url = await assertPublicUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    const res = await fetch(url, {
      redirect: "manual",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: { "user-agent": "KatungoBrandProfile/1.0", accept: "text/html" },
    });
    if (res.status >= 300 && res.status < 400 && res.headers.get("location")) {
      url = await assertPublicUrl(new URL(res.headers.get("location")!, url).toString());
      continue;
    }
    if (!res.ok || !(res.headers.get("content-type") ?? "").includes("text/html")) return null;
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_BYTES) return null;
    return { url, html: new TextDecoder().decode(buf) };
  }
  return null;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript|svg|iframe)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<\/(p|div|section|li|h[1-6]|br|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "’")
    .replace(/&quot;/g, '"')
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

function internalLinks(html: string, base: URL): string[] {
  const found = new Set<string>();
  for (const match of html.matchAll(/href=["']([^"'#]+)["']/gi)) {
    try {
      const link = new URL(match[1], base);
      if (link.hostname === base.hostname && USEFUL_PATHS.test(link.pathname)) {
        link.search = "";
        found.add(link.toString());
      }
    } catch {
      // Ignore malformed links.
    }
  }
  return [...found];
}

// Reads the home page and a handful of likely pages (about, services, contact).
export async function readWebsite(raw: string): Promise<string> {
  const home = await fetchHtml(raw);
  if (!home) throw new Error("Could not read that website.");
  const parts = [`# ${home.url.toString()}\n${htmlToText(home.html)}`];
  for (const link of internalLinks(home.html, home.url).slice(0, MAX_PAGES - 1)) {
    try {
      const page = await fetchHtml(link);
      if (page) parts.push(`# ${page.url.toString()}\n${htmlToText(page.html)}`);
    } catch {
      // A failed sub-page should not stop the profile.
    }
  }
  return parts.join("\n\n").slice(0, MAX_CHARS);
}
