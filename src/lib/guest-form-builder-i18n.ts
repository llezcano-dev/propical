// Localised data + copy for the host-facing guest-form builder
// (`guest-form-page.tsx`). The form itself is Portuguese-only — the
// base (and only) language is pt, authored directly in the form name
// and field labels. These structures are keyed by the host's app
// locale, so a pt/es host sees the builder UI (field-type grid,
// suggested-question chips, labels) in their own language. The values
// hosts *author* (form name, field labels, suggested-question labels
// that get inserted as the base text) are the pt base text.

import type { Locale } from "@/lib/i18n/translations";

export type FieldType =
  | "short-text"
  | "long-text"
  | "number"
  | "email"
  | "phone"
  | "date"
  | "time"
  | "select"
  | "multi-select"
  | "yes-no";

export interface FieldTypeDef {
  type: FieldType;
  label: string;
  hint: string;
}

export interface SuggestedQuestion {
  label: string;
  type: FieldType;
  options?: string[];
}

/** Every locale exposes the same 10 field types — only label/hint
 *  change. `type` keys are stable so a form built in one locale stays
 *  editable in the others. */
export const FIELD_TYPES: Record<Locale, FieldTypeDef[]> = {
  en: [
    { type: "short-text", label: "Short text", hint: "One-line answer" },
    { type: "long-text", label: "Paragraph", hint: "Multi-line answer" },
    { type: "email", label: "Email", hint: "Email address" },
    { type: "phone", label: "Phone", hint: "Phone number" },
    { type: "number", label: "Number", hint: "Numeric value" },
    { type: "date", label: "Date", hint: "Date picker" },
    { type: "time", label: "Time", hint: "Time picker" },
    { type: "select", label: "Dropdown", hint: "Pick one option" },
    { type: "multi-select", label: "Checkboxes", hint: "Pick several" },
    { type: "yes-no", label: "Yes / No", hint: "Either/or answer" },
  ],
  pt: [
    { type: "short-text", label: "Texto curto", hint: "Resposta de uma linha" },
    { type: "long-text", label: "Parágrafo", hint: "Resposta de várias linhas" },
    { type: "email", label: "E-mail", hint: "Endereço de e-mail" },
    { type: "phone", label: "Telefone", hint: "Número de telefone" },
    { type: "number", label: "Número", hint: "Valor numérico" },
    { type: "date", label: "Data", hint: "Seletor de data" },
    { type: "time", label: "Hora", hint: "Seletor de hora" },
    { type: "select", label: "Menu suspenso", hint: "Escolher uma opção" },
    { type: "multi-select", label: "Caixas de seleção", hint: "Escolher várias" },
    { type: "yes-no", label: "Sim / Não", hint: "Resposta de um ou de outro" },
  ],
  es: [
    { type: "short-text", label: "Texto corto", hint: "Respuesta de una línea" },
    { type: "long-text", label: "Párrafo", hint: "Respuesta de varias líneas" },
    { type: "email", label: "Correo electrónico", hint: "Dirección de correo" },
    { type: "phone", label: "Teléfono", hint: "Número de teléfono" },
    { type: "number", label: "Número", hint: "Valor numérico" },
    { type: "date", label: "Fecha", hint: "Selector de fecha" },
    { type: "time", label: "Hora", hint: "Selector de hora" },
    { type: "select", label: "Lista desplegable", hint: "Elegir una opción" },
    { type: "multi-select", label: "Casillas de verificación", hint: "Elegir varias" },
    { type: "yes-no", label: "Sí / No", hint: "Respuesta de uno u otro" },
  ],
};

/** type → label map per locale, derived from FIELD_TYPES. Used for the
 *  read-only type badges on field cards. */
export const TYPE_LABELS: Record<Locale, Record<FieldType, string>> = {
  en: Object.fromEntries(FIELD_TYPES.en.map((t) => [t.type, t.label])) as Record<FieldType, string>,
  pt: Object.fromEntries(FIELD_TYPES.pt.map((t) => [t.type, t.label])) as Record<FieldType, string>,
  es: Object.fromEntries(FIELD_TYPES.es.map((t) => [t.type, t.label])) as Record<FieldType, string>,
};

/** The field types that carry a user-supplied options list. */
export const WITH_OPTIONS: ReadonlySet<FieldType> = new Set(["select", "multi-select"]);

/** One-tap question presets, offered so a new form can be assembled in
 *  seconds with the right field type. Labels are the pt base text —
 *  the inserted value becomes the field label of the form. */
export const SUGGESTED: SuggestedQuestion[] = [
  { label: "A que horas você prevê chegar?", type: "time" },
  { label: "Horário estimado de saída", type: "time" },
  { label: "Quantos hóspedes ficarão hospedados?", type: "number" },
  { label: "Nome completo do hóspede principal (como no passaporte / documento)", type: "short-text" },
  { label: "Número do passaporte / documento", type: "short-text" },
  { label: "Nacionalidade", type: "short-text" },
  { label: "Data de nascimento", type: "date" },
  { label: "Telefone para contato", type: "phone" },
  { label: "E-mail para contato", type: "email" },
  { label: "Como você vai viajar até aqui?", type: "select", options: ["Carro", "Trem", "Avião", "Outro"] },
  { label: "Você precisa de vaga de estacionamento?", type: "yes-no" },
  { label: "Algum pedido especial ou pergunta?", type: "long-text" },
];

/* ────────────────────────────────────────────────────────────────────
   Copy — typed per-locale lookup for the whole builder surface.
   Adding a new Locale to translations.ts forces every key to be filled.
──────────────────────────────────────────────────────────────────── */

export interface GuestFormBuilderCopy {
  backToSync: string;
  title: string;
  subtitle: (propertyName: string) => string;
  saving: string;
  saved: string;
  saveFailed: string;
  autoSave: string;
  loading: string;
  formTitle: string;
  formTitlePlaceholder: string;
  suggestedTitle: string;
  suggestedBody: string;
  emptyTitle: string;
  emptyBody: string;
  dragToReorder: string;
  duplicate: string;
  duplicateAria: string;
  remove: string;
  removeAria: string;
  questionLabelPlaceholder: string;
  helpTextPlaceholder: string;
  optionsLabel: string;
  required: string;
  addQuestion: string;
  previewLabel: string;
  previewEmpty: string;
  untitledQuestionLabel: string;
  noOptionsYet: string;
  previewOnly: string;
}

export const GUEST_FORM_BUILDER_COPY: Record<Locale, GuestFormBuilderCopy> = {
  en: {
    backToSync: "Sync settings",
    title: "Pre-arrival guest form",
    subtitle: (n) =>
      `${n} · build the form once, then share a link per reservation`,
    saving: "Saving…",
    saved: "Saved",
    saveFailed: "Save failed — retrying on next edit",
    autoSave: "Changes save automatically",
    loading: "Loading…",
    formTitle: "Form title",
    formTitlePlaceholder: "Pre-arrival questions",
    suggestedTitle: "Suggested questions",
    suggestedBody: "Tap to add a common question — already typed for you.",
    emptyTitle: "No questions yet.",
    emptyBody: "Tap a suggestion above, or add a custom field below.",
    dragToReorder: "Drag to reorder",
    duplicate: "Duplicate",
    duplicateAria: "Duplicate field",
    remove: "Remove",
    removeAria: "Remove field",
    questionLabelPlaceholder: "Question label — e.g. What time will you arrive?",
    helpTextPlaceholder:
      "Help text (optional) — extra guidance shown under the question",
    optionsLabel: "Options — one per line",
    required: "Required",
    addQuestion: "Add a question",
    previewLabel: "Guest preview",
    previewEmpty: "Your questions will appear here.",
    untitledQuestionLabel: "Untitled question",
    noOptionsYet: "No options yet",
    previewOnly: "· preview only",
  },
  pt: {
    backToSync: "Configurações de sincronização",
    title: "Formulário de pré-chegada do hóspede",
    subtitle: (n) =>
      `${n} · monte o formulário uma vez e compartilhe um link por reserva`,
    saving: "Salvando…",
    saved: "Salvo",
    saveFailed: "Falha ao salvar — nova tentativa na próxima edição",
    autoSave: "As alterações são salvas automaticamente",
    loading: "Carregando…",
    formTitle: "Título do formulário",
    formTitlePlaceholder: "Perguntas de pré-chegada",
    suggestedTitle: "Perguntas sugeridas",
    suggestedBody: "Toque para adicionar uma pergunta comum — já digitada para você.",
    emptyTitle: "Ainda não há perguntas.",
    emptyBody: "Toque em uma sugestão acima ou adicione um campo personalizado abaixo.",
    dragToReorder: "Arraste para reordenar",
    duplicate: "Duplicar",
    duplicateAria: "Duplicar campo",
    remove: "Remover",
    removeAria: "Remover campo",
    questionLabelPlaceholder: "Rótulo da pergunta — p. ex. A que horas você vai chegar?",
    helpTextPlaceholder:
      "Texto de ajuda (opcional) — orientação extra exibida abaixo da pergunta",
    optionsLabel: "Opções — uma por linha",
    required: "Obrigatório",
    addQuestion: "Adicionar pergunta",
    previewLabel: "Pré-visualização do hóspede",
    previewEmpty: "Suas perguntas aparecerão aqui.",
    untitledQuestionLabel: "Pergunta sem título",
    noOptionsYet: "Ainda não há opções",
    previewOnly: "· apenas pré-visualização",
  },
  es: {
    backToSync: "Ajustes de sincronización",
    title: "Formulario de prellegada del huésped",
    subtitle: (n) =>
      `${n} · cree el formulario una vez y comparta un enlace por reserva`,
    saving: "Guardando…",
    saved: "Guardado",
    saveFailed: "Error al guardar — se reintentará en la próxima edición",
    autoSave: "Los cambios se guardan automáticamente",
    loading: "Cargando…",
    formTitle: "Título del formulario",
    formTitlePlaceholder: "Preguntas de prellegada",
    suggestedTitle: "Preguntas sugeridas",
    suggestedBody: "Toque para añadir una pregunta habitual — ya redactada para usted.",
    emptyTitle: "Aún no hay preguntas.",
    emptyBody: "Toque una sugerencia de arriba o añada un campo personalizado abajo.",
    dragToReorder: "Arrastrar para reordenar",
    duplicate: "Duplicar",
    duplicateAria: "Duplicar campo",
    remove: "Quitar",
    removeAria: "Quitar campo",
    questionLabelPlaceholder: "Texto de la pregunta — p. ej. ¿A qué hora llegará?",
    helpTextPlaceholder:
      "Texto de ayuda (opcional) — orientación adicional que se muestra bajo la pregunta",
    optionsLabel: "Opciones — una por línea",
    required: "Obligatorio",
    addQuestion: "Añadir pregunta",
    previewLabel: "Vista previa del huésped",
    previewEmpty: "Sus preguntas aparecerán aquí.",
    untitledQuestionLabel: "Pregunta sin título",
    noOptionsYet: "Aún no hay opciones",
    previewOnly: "· solo vista previa",
  },
};