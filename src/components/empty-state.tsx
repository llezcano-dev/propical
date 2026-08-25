"use client";

import Link from "next/link";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  /** Button-style CTA — wires an onClick handler. Mutually exclusive with `link`. */
  cta?: { label: string; onClick: () => void };
  /** Anchor-style CTA — navigates to `href`. Use this when the action is
   *  "go to another page" (e.g. property settings) so middle-click /
   *  cmd-click + open-in-new-tab works the way the user expects. */
  link?: { label: string; href: string };
}

export function EmptyState({ icon, title, description, cta, link }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-border-strong bg-surface-raised/40 p-10 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-lg bg-surface-hover text-text-muted">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      <p className="mx-auto mt-1 max-w-sm text-sm text-text-faint">{description}</p>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-action-primary px-4 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover"
        >
          {cta.label}
        </button>
      )}
      {link && (
        <Link
          href={link.href}
          className="mt-4 inline-flex h-9 items-center rounded-md bg-action-primary px-4 text-sm font-medium text-action-primary-fg transition-colors hover:bg-action-primary-hover"
        >
          {link.label}
        </Link>
      )}
    </div>
  );
}
