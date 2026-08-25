"use client";

import { ProfilePanel } from "@/components/profile-panel";

// first migrated admin sub-route. ProfilePanel is
// self-contained (fetches its own /api/auth/me, manages its own state)
// so no wrapper logic is needed; the page just renders it inside the
// admin shell's content pane.

export default function AdminProfilePage() {
  return <ProfilePanel />;
}
