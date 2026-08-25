import { REPO_URL } from "@/lib/site";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://propical.com.br";

// Force per-request rendering. Same reason as sitemap: build-time DB is
// empty, so a static llms.txt would ship blank until the next deploy.
// Crawl traffic for /llms.txt is even lower than /sitemap.xml, so the
// per-request DB hit is unmeasurable.
export const dynamic = "force-dynamic";

/**
 * /llms.txt — emerging convention from llmstxt.org for surfacing a
 * site's public knowledge to LLM crawlers in a curated, link-first
 * markdown format. Distinct from /robots.txt (which gates crawl) and
 * /sitemap.xml (which lists URLs); /llms.txt gives LLMs a one-page
 * map of the most useful entry points + a one-line description per
 * link.
 *
 * Spec: https://llmstxt.org/
 *
 * GPTBot / ClaudeBot / PerplexityBot / Google-Extended are explicitly
 * Allow-ed in robots.ts — this file is what they should land on after.
 */
export async function GET() {
  const lines: string[] = [];
  lines.push("# Propical");
  lines.push("");
  lines.push(
    "> Open-source property management tool for short-term rental hosts. Self-hosted or hosted-free. Calendar sync (Airbnb, Booking.com, Vrbo, any iCal source), cleaning automation, GDPR-friendly guest data, multi-property management."
  );
  lines.push("");
  lines.push(
    "Propical is built for hosts running 1–20 short-term rentals who want a free alternative to $100/mo channel managers. The hosted instance runs at https://propical.com.br; the source is MIT-licensed at ${REPO_URL}."
  );
  lines.push("");

  lines.push("## Core docs");
  lines.push("");
  lines.push(`- [Home](${SITE_URL}/): Product overview, what it does, and how it compares to paid channel managers.`);
  lines.push(`- [Sign up](${SITE_URL}/signup): Create an account on the hosted instance.`);
  lines.push(`- [Privacy policy](${SITE_URL}/privacy): How Propical stores and processes guest data.`);
  lines.push(`- [Terms](${SITE_URL}/terms): Service terms for the hosted instance.`);
  lines.push("");

  lines.push("## Optional");
  lines.push("");
  lines.push(`- [Sitemap](${SITE_URL}/sitemap.xml): Machine-readable URL index for every public page.`);
  lines.push(`- [GitHub repository](${REPO_URL}): Source code, issues, self-host instructions.`);
  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=600, s-maxage=600",
    },
  });
}
