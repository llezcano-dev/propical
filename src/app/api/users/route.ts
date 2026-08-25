import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, requireSuperadmin } from "@/lib/auth";
import { logAudit } from "@/lib/audit";
import { checkPasswordStrength } from "@/lib/security/password-strength";

// GET /api/users — superadmin-only.
// The legacy `?role=cleaner` filter has been removed: it leaked every
// cleaner-role account in the system to any authenticated user.
// The cleaner picker now uses the scoped
// /api/cleaners pool (ownerUserId: session.userId).
export async function GET(_request: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth.response) return auth.response;

  try {
    const users = await prisma.user.findMany({
      select: { id: true, username: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth.response) return auth.response;
  const session = auth.session;

  try {
    const { username, password } = await request.json();
    if (!username?.trim() || !password) {
      return NextResponse.json(
        { error: "Username and password required" },
        { status: 400 }
      );
    }
    if (typeof password !== "string") {
      return NextResponse.json({ error: "Password required" }, { status: 400 });
    }
    const strength = checkPasswordStrength(password, username.trim());
    if (!strength.ok) {
      return NextResponse.json({ error: strength.reason }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({
      where: { username: username.trim() },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Username already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        password: hashedPassword,
        role: "user",
      },
      select: { id: true, username: true, role: true, createdAt: true },
    });
    await logAudit(session.userId, "create", "user", user.id, {
      username: user.username,
      role: user.role,
    });

    return NextResponse.json(user);
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
