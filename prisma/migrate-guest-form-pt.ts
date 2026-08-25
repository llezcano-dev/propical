import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";
import "dotenv/config";

// One-off data migration: the guest form is now Portuguese-only, but
// templates saved before the change hold English field labels / options
// (the old English SUGGESTED presets and "Option 1/2" defaults). This
// rewrites those known English strings to their pt equivalents and
// clears the now-dead `i18n` column. Idempotent: pt strings pass
// through untouched, so re-running is a no-op.
//
// Run: pnpm db:migrate-guest-form-pt

const adapter = new PrismaLibSql({ url: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Old English SUGGESTED presets → current pt SUGGESTED labels.
const LABEL_MAP: Record<string, string> = {
  "What time do you expect to arrive?": "A que horas você prevê chegar?",
  "Estimated departure time": "Horário estimado de saída",
  "How many guests are staying?": "Quantos hóspedes ficarão hospedados?",
  "Lead guest full name (as on passport / ID)":
    "Nome completo do hóspede principal (como no passaporte / documento)",
  "Passport / ID number": "Número do passaporte / documento",
  Nationality: "Nacionalidade",
  "Date of birth": "Data de nascimento",
  "Contact phone number": "Telefone para contato",
  "Contact email": "E-mail para contato",
  "How will you travel here?": "Como você vai viajar até aqui?",
  "Do you need a parking space?": "Você precisa de vaga de estacionamento?",
  "Any special requests or questions?": "Algum pedido especial ou pergunta?",
};

// Old option defaults (SUGGESTED travel options + newField "Option N").
const OPTION_MAP: Record<string, string> = {
  Car: "Carro",
  Train: "Trem",
  Plane: "Avião",
  Other: "Outro",
  "Option 1": "Opção 1",
  "Option 2": "Opção 2",
};

// Old default form titles hosts may have kept.
const NAME_MAP: Record<string, string> = {
  "Pre-arrival questions": "Perguntas de pré-chegada",
  "Pre-arrival guest form": "Formulário de pré-chegada",
};

interface Field {
  id: string;
  type: string;
  label: string;
  required: boolean;
  helpText?: string;
  options?: string[];
}

function translateField(f: Field): { changed: boolean; field: Field } {
  let changed = false;
  const field = { ...f };
  const label = LABEL_MAP[field.label.trim()];
  if (label) {
    field.label = label;
    changed = true;
  }
  if (Array.isArray(field.options)) {
    const options = field.options.map((o) => OPTION_MAP[o] ?? o);
    if (options.some((o, i) => o !== field.options![i])) {
      field.options = options;
      changed = true;
    }
  }
  return { changed, field };
}

async function main() {
  const rows = await prisma.guestFormTemplate.findMany();
  let updated = 0;
  let fieldsChanged = 0;

  for (const row of rows) {
    let fields: Field[] = [];
    try {
      fields = JSON.parse(row.fields);
    } catch {
      console.warn(`  template ${row.id}: fields not JSON, skipping`);
      continue;
    }
    if (!Array.isArray(fields)) fields = [];

    let changed = false;
    const out = fields.map((f) => {
      const r = translateField(f);
      if (r.changed) changed = true;
      return r.field;
    });

    let name = row.name;
    const ptName = NAME_MAP[name.trim()];
    if (ptName) {
      name = ptName;
      changed = true;
    }

    const i18nChanged = row.i18n !== "{}";
    if (i18nChanged) changed = true;

    if (!changed) continue;

    await prisma.guestFormTemplate.update({
      where: { id: row.id },
      data: {
        name,
        fields: JSON.stringify(out),
        i18n: "{}",
        updatedAt: new Date(),
      },
    });
    updated++;
    fieldsChanged += out.length;
    console.log(`  template ${row.id}: updated (${out.length} fields)`);
  }

  console.log(`\nDone: ${updated} template(s) updated, ${fieldsChanged} field(s) rewritten.`);
}

main()
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());