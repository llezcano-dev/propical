import { prisma } from "@/lib/prisma";
import { log } from "@/lib/logger";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  // Superadmin impersonation start/exit — record both ends of the
  // session so a paper trail exists for which admin viewed which
  // user's data, and when.
  | "impersonate"
  | "exit-impersonate";
export type AuditResource =
  | "property"
  | "reservation"
  | "guest"
  | "override"
  | "calendarLink"
  | "manager"
  | "user" //: account creation, suspension, password change
  | "platform" //: super-admin edits to CalendarPlatform registry
  | "seoOverride" //: super-admin per-page SEO overrides
  | "guestFormTemplate"; //: pre-arrival guest form template CRUD

// Self-delete (POST /api/auth/delete-account) is intentionally NOT audited
// — the same request wipes the user's AuditLog rows for GDPR right-to-be-
// forgotten compliance, so a logAudit() there would be a no-op. Schema
// pushes happen out-of-band (via prisma/push-schema.ts) and are recorded
// in deploy logs, not the in-app audit trail.

export async function logAudit(
  userId: number,
  action: AuditAction,
  resourceType: AuditResource,
  resourceId: number,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId,
        action,
        resourceType,
        resourceId,
        payload: payload ? JSON.stringify(payload) : null,
      },
    });
  } catch (err) {
    log({
      level: "warn",
      msg: "audit_write_failed",
      err: err instanceof Error ? err.message : String(err),
      action,
      resourceType,
      resourceId,
      userId,
    });
  }
}
