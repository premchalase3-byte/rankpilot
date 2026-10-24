
import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

const MAX_PAGES = 50;
const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 8000;
const MAX_HTML_BYTES = 2 * 1024 * 1024;
const CRAWL_DELAY_MS = 350;

export type SeoIssue = {
  code: string;
  severity: "error" | "warning" | "info";
  message: string;
};

export type CrawledPage = {
  url: string;
  status: number;
  title: string | null;
  titleLength: number;
  metaDescription: string | null;
  metaDescriptionLength: number;
  h1Count: number;
  h1Texts: string[];
  canonical: string | null;
  robotsMeta: string | null;
  wordCount: number;
  internalLinks: number;
  brokenInternalLinks: number;
  issues: SeoIssue[];
};

export type CrawlResult = {
  startUrl: string;
  finishedAt: string;
  pagesScanned: number;
  pages: CrawledPage[];
  discoveredUrls: number;
  truncated: boolean;
  errors: string[];
};

function isBlockedIp(ip: string): boolean {
  if (isIP(ip) === 4) {
    const parts = ip.split(".").map(Number);
    const [a, b] = parts;

    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 192 && b === 0) ||
      (a === 198 && (b === 18 || b === 19)) ||
      (a === 198 && b === 51) ||
      (a === 203 && b === 0)
    );
  }

  if (isIP(ip) === 6) {
    const normalized = ip.toLowerCase();

    return (
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      normalized.startsWith("fe8") ||
      normalized.startsWith("fe9") ||
      normalized.startsWith("fea") ||
      normalized.startsWith("feb") ||
      normalized.startsWith("ff") ||
      normalized.startsWith("::ffff:")
    );
  }

  return true;
}

async function validatePublicUrl(input: string): Promise<URL> {
  let url: URL;

  try {
    url = new URL(input);
  } catch {
    throw new Error("A valid website URL is required.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error("Only HTTP and HTTPS websites can be crawled.");
  }

  if (url.username || url.password) {
    throw new Error("Website URLs must not contain credentials.");
  }

  const hostname = url.hostname.toLowerCase();

  if (
    !hostname ||
    hostname === "localhost" ||
    hostname.endsWith(".localhost") ||
    hostname.endsWith(".local") ||
    hostname.endsWith(".internal")
  ) {
    throw new Error("Private or local destinations cannot be crawled.");
  }

  if (isIP(hostname)) {
    if (isBlockedIp(hostname)) {
      throw new Error("Private or reserved IP addresses cannot be crawled.");
    }
  } else {
    let addresses: Awaited<ReturnType<typeof lookup>>[];

    try {
      addresses = await lookup(hostname, {
        all: true,
        verbatim: true,
      });
    } catch {
      throw new Error("The website hostname could not be resolved.");
    }

    if (
      addresses.length === 0 ||
      addresses.some((address) => isBlockedIp(address.address))
    ) {
      throw new Error("The website resolves to a private or reserved address.");
    }
  }

  url.hash = "";
  return url;
}

function normalizePageUrl(input: string, base: string): string | null {
  try {
    const url = new URL(input, base);

    if (url.protocol !== "https:" && url.protocol !== "http:") {
      return null;
    }

    if (url.username || url.password) return null;

    url.hash = "";
    url.hostname = url.hostname.toLowerCase();

    if (
      (url.protocol === "https:" && url.port === "443") ||
      (url.protocol === "http:" && url.port === "80")
    ) {
      url.port = "";
    }

    // Avoid crawling tracking parameters and duplicate URL variants.
    const trackingParams = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "gclid",
      "fbclid",
    ];

    for (const param of trackingParams) {
      url.searchParams.delete(param);
    }

    url.searchParams.sort();

    return url.toString();
  } catch {
    return null;
  }
}

async function fetchPublicPage(
  initialUrl: string
): Promise<{ response: Response; finalUrl: string }> {
  let currentUrl = initialUrl;

  for (let redirects = 0; redirects <= MAX_REDIRECTS; redirects++) {
    const checkedUrl = await validatePublicUrl(currentUrl);

    const controller = new AbortController();
    const timeout = setTimeout(
      () => controller.abort(),
      REQUEST_TIMEOUT_MS
    );

    let response: Response;

    try {
      response = await fetch(checkedUrl.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "RankPilotBot/0.1 (+technical SEO audit)",
          Accept: "text/html,application/xhtml+xml;q=0.9",
        },
        cache: "no-store",
      });
    } catch {
      throw new Error("The page could not be fetched or timed out.");
    } finally {
      clearTimeout(timeout);
    }

    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      await response.body?.cancel();

      if (!location) {
        throw new Error("The website returned a redirect without a destination.");
      }

      if (redirects === MAX_REDIRECTS) {
        throw new Error("The page exceeded the redirect limit.");
      }

      currentUrl = new URL(location, checkedUrl).toString();
      continue;
    }

    return {
      response,
      finalUrl: checkedUrl.toString(),
    };
  }

  throw new Error("The page exceeded the redirect limit.");
}

async function readHtmlLimited(response: Response): Promise<string> {
  const contentType = response.headers.get("content-type") || "";

  if (
    !contentType.toLowerCase().includes("text/html") &&
    !contentType.toLowerCase().includes("application/xhtml+xml")
  ) {
    await response.body?.cancel();
    throw new Error("The URL did not return an HTML page.");
  }

  const length = Number(response.headers.get("content-length") || 0);

  if (length > MAX_HTML_BYTES) {
    await response.body?.cancel();
    throw new Error("The HTML page is larger than the crawl limit.");
  }

  if (!response.body) return "";

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      totalBytes += value.byteLength;

      if (totalBytes > MAX_HTML_BYTES) {
        await reader.cancel();
        throw new Error("The HTML page is larger than the crawl limit.");
      }

      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;

  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  return new TextDecoder("utf-8").decode(bytes);
}

function analyzeHtml(
  url: string,
  status: number,
  html: string,
  origin: string
): {
  page: CrawledPage;
  discoveredLinks: string[];
} {
  const $ = cheerio.load(html);
  const issues: SeoIssue[] = [];

  const title = $("title").first().text().trim() || null;
  const metaDescription =
    $('meta[name="description" i]').attr("content")?.trim() || null;
  const canonicalHref =
    $('link[rel~="canonical" i]').first().attr("href")?.trim() || null;
  const robotsMeta =
    $('meta[name="robots" i]').attr("content")?.trim() || null;
  const h1Texts = $("h1")
    .map((_, element) => $(element).text().trim())
    .get()
    .filter(Boolean);

  const bodyText = $("body").text().replace(/\s+/g, " ").trim();
  const wordCount = bodyText ? bodyText.split(" ").length : 0;
  const discoveredLinks = new Set<string>();
  const internalLinks = new Set<string>();

  $("a[href]").each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;

    const normalized = normalizePageUrl(href, url);
    if (!normalized) return;

    try {
      const linkUrl = new URL(normalized);

      if (linkUrl.origin !== origin) return;

      // Do not enqueue non-page assets or common download formats.
      if (
        /\.(?:pdf|jpg|jpeg|png|gif|webp|svg|css|js|zip|rar|7z|mp4|mp3|woff2?|ttf|ico)$/i.test(
          linkUrl.pathname
        )
      ) {
        return;
      }

      internalLinks.add(normalized);
      discoveredLinks.add(normalized);
    } catch {
      // Ignore malformed links.
    }
  });

  if (!title) {
    issues.push({
      code: "missing_title",
      severity: "error",
      message: "Page is missing a title tag.",
    });
  } else {
    if (title.length < 30) {
      issues.push({
        code: "short_title",
        severity: "warning",
        message: "Title is shorter than 30 characters.",
      });
    }

    if (title.length > 60) {
      issues.push({
        code: "long_title",
        severity: "warning",
        message: "Title is longer than 60 characters.",
      });
    }
  }

  if (!metaDescription) {
    issues.push({
      code: "missing_meta_description",
      severity: "warning",
      message: "Page is missing a meta description.",
    });
  } else if (metaDescription.length < 70 || metaDescription.length > 160) {
    issues.push({
      code: "meta_description_length",
      severity: "warning",
      message: "Meta description is outside the suggested 70–160 character range.",
    });
  }

  if (h1Texts.length === 0) {
    issues.push({
      code: "missing_h1",
      severity: "warning",
      message: "Page does not contain an H1 heading.",
    });
  } else if (h1Texts.length > 1) {
    issues.push({
      code: "multiple_h1",
      severity: "info",
      message: "Page contains multiple H1 headings; review the heading structure.",
    });
  }

  if (!canonicalHref) {
    issues.push({
      code: "missing_canonical",
      severity: "info",
      message: "Page does not declare a canonical URL.",
    });
  }

  if (robotsMeta && /\bnoindex\b/i.test(robotsMeta)) {
    issues.push({
      code: "noindex",
      severity: "warning",
      message: "Robots meta tag contains noindex; search engines may exclude this page.",
    });
  }

  if (wordCount < 100) {
    issues.push({
      code: "low_text_content",
      severity: "info",
      message: "Page contains fewer than 100 words of visible body text.",
    });
  }

  if (status >= 400) {
    issues.push({
      code: "http_error",
      severity: "error",
      message: `Page returned HTTP ${status}.`,
    });
  }

  return {
    page: {
      url,
      status,
      title,
      titleLength: title?.length ?? 0,
      metaDescription,
      metaDescriptionLength: metaDescription?.length ?? 0,
      h1Count: h1Texts.length,
      h1Texts,
      canonical: canonicalHref
        ? normalizePageUrl(canonicalHref, url)
        : null,
      robotsMeta,
      wordCount,
      internalLinks: internalLinks.size,
      brokenInternalLinks: 0,
      issues,
    },
    discoveredLinks: [...discoveredLinks],
  };
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function crawlWebsite(
  startUrl: string
): Promise<CrawlResult> {
  const validatedStart = await validatePublicUrl(startUrl);
  const start = normalizePageUrl(validatedStart.toString(), validatedStart.origin);

  if (!start) {
    throw new Error("Unable to normalize the starting URL.");
  }

  const origin = validatedStart.origin;
  const queue = [start];
  const queued = new Set(queue);
  const visited = new Set<string>();
  const pages: CrawledPage[] = [];
  const errors: string[] = [];
  let truncated = false;

  while (queue.length > 0 && pages.length < MAX_PAGES) {
    const requestedUrl = queue.shift()!;

    if (visited.has(requestedUrl)) continue;
    visited.add(requestedUrl);

    if (pages.length > 0) {
      await delay(CRAWL_DELAY_MS);
    }

    try {
      const { response, finalUrl } = await fetchPublicPage(requestedUrl);

      if (new URL(finalUrl).origin !== origin) {
        await response.body?.cancel();
        errors.push(`${requestedUrl}: Redirected outside the website origin.`);
        continue;
      }

      if (!response.ok) {
        await response.body?.cancel();

        pages.push({
          url: finalUrl,
          status: response.status,
          title: null,
          titleLength: 0,
          metaDescription: null,
          metaDescriptionLength: 0,
          h1Count: 0,
          h1Texts: [],
          canonical: null,
          robotsMeta: null,
          wordCount: 0,
          internalLinks: 0,
          brokenInternalLinks: 0,
          issues: [
            {
              code: "http_error",
              severity: "error",
              message: `Page returned HTTP ${response.status}.`,
            },
          ],
        });

        continue;
      }

      const html = await readHtmlLimited(response);
      const result = analyzeHtml(finalUrl, response.status, html, origin);

      pages.push(result.page);

      for (const discovered of result.discoveredLinks) {
        if (!queued.has(discovered) && !visited.has(discovered)) {
          if (queued.size >= MAX_PAGES * 10) {
            truncated = true;
            break;
          }

          queued.add(discovered);
          queue.push(discovered);
        }
      }
    } catch (error) {
      errors.push(
        `${requestedUrl}: ${
          error instanceof Error ? error.message : "Page crawl failed."
        }`
      );
    }
  }

  if (queue.length > 0) {
    truncated = true;
  }

  return {
    startUrl: start,
    finishedAt: new Date().toISOString(),
    pagesScanned: pages.length,
    pages,
    discoveredUrls: queued.size,
    truncated,
    errors: errors.slice(0, 50),
  };
}
