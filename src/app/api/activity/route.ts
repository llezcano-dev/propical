import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { listAccessiblePropertyIds } from "@/lib/ownership";
import { getLocale } from "@/lib/i18n/server";
import { translations, type Locale, type TranslationKey } from "@/lib/i18n/translations";
import { parseSyncLogMessage } from "@/lib/sync-log-messages";

export const dynamic = "force-dynamic";

interface ActivityItem {
  id: string;
  kind: "audit" | "sync";
  level: "info" | "warn" | "error" | "success";
  timestamp: string;
  summary: string;
  resourceType?: string;
  resourceId?: number | null;
  propertyId?: number | null;
  propertyName?: string | null;
}

interface AuditPayload {
  name?: string;
  propertyId?: number;
}

function summariseAudit(entry: {
  action: string;
  resourceType: string;
  resourceId: number;
  payload: string | null;
}): string {
  let nameHint = "";
  if (entry.payload) {
    try {
      const parsed = JSON.parse(entry.payload) as AuditPayload;
      if (typeof parsed.name === "string" && parsed.name) nameHint = ` "${parsed.name}"`;
    } catch {
      // ignore parse errors
    }
  }
  const verb =
    entry.action === "create"
      ? "Created"
      : entry.action === "update"
      ? "Updated"
      : entry.action === "delete"
      ? "Deleted"
      : entry.action;
  return `${verb} ${entry.resourceType}${nameHint}`.trim();
}

/**
 * Render a stored sync-log message for the activity feed. Structured
 * payloads (see src/lib/sync-log-messages.ts) are translated with the
 * visitor's locale; legacy raw strings pass through unchanged. The
 * legacy "[ALERT]" marker is dropped from the summary (matches the old
 * strip behavior; the banner keeps it).
 */
function readableSyncSummary(message: string, locale: Locale): string {
  const parsed = parseSyncLogMessage(message);
  if (!parsed.key) return parsed.raw;

  const key = parsed.key as TranslationKey;
  const template: string =
    translations[key]?.[locale] ?? translations[key]?.en ?? parsed.raw;
  let out = template;
  if (parsed.params) {
    for (const [k, v] of Object.entries(parsed.params)) {
      out = out.replace(`{${k}}`, String(v));
    }
  }
  return out.replace(/^\[ALERTA?\]\s*/, "");
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const locale = await getLocale();

    const accessibleIds = await listAccessiblePropertyIds(session.userId);
    const accessibleProperties = accessibleIds.length
      ? await prisma.property.findMany({
          where: { id: { in: accessibleIds } },
          select: { id: true, name: true },
        })
      : [];
    const propertyMap = new Map(accessibleProperties.map((p) => [p.id, p.name]));
    const propertyIds = Array.from(propertyMap.keys());

    const [audits, syncs] = await Promise.all([
      prisma.auditLog.findMany({
        where: { userId: session.userId },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),
      propertyIds.length > 0
        ? prisma.syncLog.findMany({
            where: { propertyId: { in: propertyIds } },
            orderBy: { createdAt: "desc" },
            take: 20,
          })
        : Promise.resolve([]),
    ]);

    const items: ActivityItem[] = [];

    for (const a of audits) {
      let propertyId: number | null = null;
      if (a.payload) {
        try {
          const parsed = JSON.parse(a.payload) as AuditPayload;
          if (typeof parsed.propertyId === "number") propertyId = parsed.propertyId;
        } catch {
          // ignore
        }
      }
      if (propertyId === null && a.resourceType === "property") {
        propertyId = a.resourceId;
      }
      items.push({
        id: `audit:${a.id}`,
        kind: "audit",
        level:
          a.action === "delete"
            ? "warn"
            : a.action === "create"
            ? "success"
            : "info",
        timestamp: a.createdAt.toISOString(),
        summary: summariseAudit(a),
        resourceType: a.resourceType,
        resourceId: a.resourceId,
        propertyId,
        propertyName: propertyId ? propertyMap.get(propertyId) ?? null : null,
      });
    }

    for (const s of syncs) {
      const cleanedMessage = readableSyncSummary(s.message, locale);
      items.push({
        id: `sync:${s.id}`,
        kind: "sync",
        level:
          s.level === "error"
            ? "error"
            : s.level === "warn"
            ? "warn"
            : s.level === "success"
            ? "success"
            : "info",
        timestamp: s.createdAt.toISOString(),
        summary: cleanedMessage,
        propertyId: s.propertyId,
        propertyName: s.propertyId ? propertyMap.get(s.propertyId) ?? null : null,
      });
    }

    items.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));

    return NextResponse.json({ items: items.slice(0, 10) });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
