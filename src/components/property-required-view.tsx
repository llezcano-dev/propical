"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n/context";
import type { Locale } from "@/lib/i18n/translations";
import { PropertySwitcher } from "@/components/property-switcher";
import type { Property } from "@/lib/types";
import type { AppView } from "@/lib/navigation";

interface CopyShape {
  heading: string;
  hint: string;
  emptyTitle: string;
  emptyHint: string;
  addProperty: string;
}

const COPY: Record<Locale, CopyShape> = {
  en: {
    heading: "Select a property",
    hint: "This view works inside a property. Pick one to continue.",
    emptyTitle: "No properties yet",
    emptyHint: "Create your first property to start managing it.",
    addProperty: "Add property",
  },
  pt: {
    heading: "Selecione uma propriedade",
    hint: "Esta visualização funciona dentro de uma propriedade. Escolha uma para continuar.",
    emptyTitle: "Nenhuma propriedade ainda",
    emptyHint: "Crie sua primeira propriedade para começar a gerenciá-la.",
    addProperty: "Adicionar propriedade",
  },
  es: {
    heading: "Selecciona una propiedad",
    hint: "Esta vista funciona dentro de una propiedad. Elige una para continuar.",
    emptyTitle: "Aún no hay propiedades",
    emptyHint: "Crea tu primera propiedad para empezar a gestionarla.",
    addProperty: "Añadir propiedad",
  },
};

/**
 * Map a scoped view to the PropertySwitcher view vocabulary. `guest-form`
 * and `guests` are not surfaces the switcher knows — they fall back to the
 * property's home (calendar), so the pill still lands on a useful view.
 */
function switcherView(view: AppView): "calendar" | "cleaning" | "reports" | "sync" {
  if (view === "sync") return "sync";
  return "calendar";
}

/**
 * Empty-state landing for property-scoped views (calendar, config, guest
 * form, reservation list) when no property is selected. Replaces the old
 * silent first-property auto-pick and the ghost state where the URL said one
 * view but the Panel rendered.
 */
export function PropertyRequiredView({
  view,
  properties,
}: {
  view: AppView;
  properties: Property[];
}) {
  const { locale } = useI18n();
  const c = COPY[locale];

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-action-primary/10 text-action-primary-text">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12L12 3l9.75 9M4.5 9.75v9.75A1.5 1.5 0 006 21h3.75v-6h4.5v6H18a1.5 1.5 0 001.5-1.5V9.75" />
        </svg>
      </div>
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">{c.heading}</h2>
        <p className="mt-1 text-base text-text-muted">{c.hint}</p>
      </div>
      {properties.length > 0 ? (
        <div className="flex justify-center">
          <PropertySwitcher
            properties={properties}
            selectedPropertyId={null}
            view={switcherView(view)}
            showAllOption={false}
            label={null}
          />
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3">
          <p className="text-base text-text-muted">{c.emptyTitle}</p>
          <Link
            href="/dashboard/add-property"
            className="inline-flex items-center gap-2 rounded-md bg-action-primary px-4 py-2 text-sm font-medium text-action-primary-fg transition-colors hover:opacity-90"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {c.addProperty}
          </Link>
          <p className="text-sm text-text-faint">{c.emptyHint}</p>
        </div>
      )}
    </div>
  );
}
