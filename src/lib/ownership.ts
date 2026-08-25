/**
 * Centralized property access control.
 *
 * Two access levels per property:
 *   - owner: created the property; full control + can manage managers + delete
 *   - manager: granted access by owner; full daily operations (calendar, sync,
 *     overrides, reservations, guests, cleaning) — but cannot delete the
 *     property or manage other managers
 *
 * The legacy "cleaner" access level (login-capable User with role="cleaner")
 * was removed together with the cleaner login UI. Cleaners are now metadata
 * (the Cleaner profile / CleanerAssignment.cleanerProfileId pool,);
 * they have no account and never hit these functions.
 */

import { prisma } from "@/lib/prisma";

type AccessLevel = "owner" | "manager" | "none";

/**
 * Determine a user's access level to a property.
 */
async function getPropertyAccess(
  propertyId: number,
  userId: number
): Promise<AccessLevel> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { userId: true },
  });
  if (!property) return "none";

  if (property.userId === userId) return "owner";

  // Manager check (full daily ops)
  const manager = await prisma.propertyManager.findUnique({
    where: { managerId_propertyId: { managerId: userId, propertyId } },
    select: { id: true },
  }).catch(() => null);
  if (manager) return "manager";

  return "none";
}

/**
 * True if user can perform daily management actions: edit reservations,
 * sync calendars, set overrides, edit settings (NOT delete the property
 * itself, NOT manage other managers).
 */
export async function canManageProperty(
  propertyId: number,
  userId: number
): Promise<boolean> {
  const access = await getPropertyAccess(propertyId, userId);
  return access === "owner" || access === "manager";
}

/**
 * True if user can read property data (calendar, reservations, etc).
 */
export async function canReadProperty(
  propertyId: number,
  userId: number
): Promise<boolean> {
  const access = await getPropertyAccess(propertyId, userId);
  return access !== "none";
}

/**
 * True if user owns the property (only the owner can delete or manage managers).
 */
export async function isPropertyOwner(
  propertyId: number,
  userId: number
): Promise<boolean> {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { userId: true },
  });
  return !!property && property.userId === userId;
}

/**
 * Get all property IDs accessible to a user (as owner OR manager).
 * Used for list endpoints.
 */
export async function listAccessiblePropertyIds(
  userId: number
): Promise<number[]> {
  const ids = new Set<number>();

  // Owned
  const owned = await prisma.property.findMany({
    where: { userId },
    select: { id: true },
  });
  for (const p of owned) ids.add(p.id);

  // Managed
  const managed = await prisma.propertyManager.findMany({
    where: { managerId: userId },
    select: { propertyId: true },
  }).catch(() => []);
  for (const m of managed) ids.add(m.propertyId);

  return Array.from(ids);
}
