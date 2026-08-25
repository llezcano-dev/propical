import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { GuestFormView } from "@/components/guest-form-filler";

// public pre-arrival guest form. Reachable via the share
// link the host generated for a specific reservation. Token possession
// is the only auth — middleware adds /g/ to PUBLIC_PATHS.

interface FormField {
  id: string;
  type: string;
  label: string;
  required: boolean;
  helpText?: string;
  options?: string[];
}

export default async function GuestFormPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  if (!token || token.length < 16) notFound();

  const submission = await prisma.guestFormSubmission.findUnique({
    where: { shareToken: token },
    include: {
      template: true,
      reservation: {
        select: {
          name: true,
          checkIn: true,
          checkOut: true,
          property: { select: { name: true } },
        },
      },
    },
  });
  if (!submission) notFound();

  const fields: FormField[] = JSON.parse(submission.template.fields);

  return (
    <div className="min-h-screen bg-[#0d1117] text-[#e8e8ec] py-10 px-4">
      <main className="mx-auto max-w-xl">
        <GuestFormView
          token={token}
          templateName={submission.template.name}
          fields={fields}
          propertyName={submission.reservation.property.name}
          guestName={submission.reservation.name}
          alreadySubmitted={!!submission.submittedAt}
          submittedAt={
            submission.submittedAt
              ? submission.submittedAt.toISOString().slice(0, 10)
              : null
          }
        />
      </main>
    </div>
  );
}
