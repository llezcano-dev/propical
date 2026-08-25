import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { canManageProperty } from "@/lib/ownership";
import { isValidPlatformSlug } from "@/lib/platform-meta";

// GET /api/calendar/links?propertyId=1
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const propertyId = request.nextUrl.searchParams.get("propertyId");

    const baseFilter = {
      property: {
        OR: [
          { userId: session.userId },
          { managers: { some: { managerId: session.userId } } },
        ],
      },
    };

    const where = propertyId
      ? { propertyId: Number(propertyId), ...baseFilter }
      : baseFilter;

    const links = await prisma.calendarLink.findMany({
      where,
      include: { property: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(links);
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST /api/calendar/links
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { propertyId, platform, icalExportUrl, bufferBefore, bufferAfter } = body;

    if (!propertyId || !platform || !icalExportUrl) {
      return NextResponse.json(
        { error: "propertyId, platform, and icalExportUrl are required" },
        { status: 400 }
      );
    }

    // B7: the old allowlist (["airbnb","booking"]) rejected Vrbo and custom
    // platforms that the UI (view=sync presets + "Add another platform") and
    // the onboarding wizard legitimately save. The rest of the pipeline
    // (feed generation, sync, display) already treats platform as an opaque
    // slug — only the POST blocked it. Validate the slug shape instead.
    if (!isValidPlatformSlug(platform)) {
      return NextResponse.json(
        { error: "Invalid platform slug" },
        { status: 400 }
      );
    }

    if (!(await canManageProperty(Number(propertyId), session.userId))) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Check if link already exists for this property+platform
    const existing = await prisma.calendarLink.findFirst({
      where: { propertyId: Number(propertyId), platform },
    });

    if (existing) {
      // Update existing
      const updated = await prisma.calendarLink.update({
        where: { id: existing.id },
        data: {
          icalExportUrl,
          bufferBefore: bufferBefore ?? existing.bufferBefore,
          bufferAfter: bufferAfter ?? existing.bufferAfter,
          lastError: null,
        },
      });
      await logAudit(session.userId, "update", "calendarLink", updated.id, {
        platform,
        propertyId: Number(propertyId),
      });
      return NextResponse.json(updated);
    }

    const link = await prisma.calendarLink.create({
      data: {
        propertyId: Number(propertyId),
        platform,
        icalExportUrl,
        bufferBefore: bufferBefore ?? 1,
        bufferAfter: bufferAfter ?? 1,
      },
    });
    await logAudit(session.userId, "create", "calendarLink", link.id, {
      platform,
      propertyId: Number(propertyId),
    });

    return NextResponse.json(link);
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
