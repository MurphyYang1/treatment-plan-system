import {
  hasAdminSession,
  isAdminAuthConfigured,
} from "../../lib/adminAuth";
import {
  getRecentSignedQuotations,
  type AdminSignedQuotation,
} from "../../lib/signedQuotationsAdmin";
import { logInToAdmin, logOutOfAdmin } from "./actions";

export const dynamic = "force-dynamic";

type AdminPageProps = {
  searchParams?: Promise<{
    error?: string;
  }>;
};

function formatCurrency(amount: number) {
  return `$${amount.toFixed(2)}`;
}

function AdminLogin({ hasInvalidCode }: { hasInvalidCode: boolean }) {
  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black">
      <section className="mx-auto max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
          Nofrills Dental
        </p>
        <h1 className="mt-2 text-2xl font-bold">Staff quotation access</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-600">
          Enter the staff access code to view signed quotations. Saved quotation
          data is read on the server with Firebase Admin and is not publicly
          readable from the browser.
        </p>

        {!isAdminAuthConfigured() ? (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Admin access is not configured yet. Add{" "}
            <code className="font-semibold">ADMIN_ACCESS_CODE</code> to your
            server environment variables and redeploy.
          </div>
        ) : null}

        {hasInvalidCode ? (
          <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            That access code was not correct. Please try again.
          </div>
        ) : null}

        <form action={logInToAdmin} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Staff access code
            </label>
            <input
              name="accessCode"
              type="password"
              autoComplete="current-password"
              className="w-full rounded-xl border px-4 py-3"
              required
            />
          </div>
          <button
            type="submit"
            disabled={!isAdminAuthConfigured()}
            className="w-full rounded-xl bg-black px-5 py-3 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
          >
            View signed quotations
          </button>
        </form>
      </section>
    </main>
  );
}

function ProcedureList({ quotation }: { quotation: AdminSignedQuotation }) {
  const phases = quotation.quotation?.phases ?? [];

  if (phases.length === 0) {
    return (
      <p className="rounded-lg bg-gray-50 p-3 text-sm text-gray-500">
        No treatment details were saved with this quotation.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {phases.map((phase, phaseIndex) => (
        <section key={phase.id ?? phaseIndex} className="rounded-xl bg-gray-50 p-4">
          <h3 className="font-semibold">
            {phase.title || `Treatment Phase ${phaseIndex + 1}`}
          </h3>
          {phase.duration ? (
            <p className="mt-1 text-xs text-gray-500">{phase.duration}</p>
          ) : null}

          <div className="mt-3 space-y-2">
            {phase.procedures?.length ? (
              phase.procedures.map((procedure, procedureIndex) => (
                <article
                  key={`${phase.id ?? phaseIndex}-${procedureIndex}`}
                  className="rounded-lg bg-white p-3 text-sm"
                >
                  <div className="font-medium">
                    {procedure.name || "Unnamed treatment"}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    Qty {procedure.quantity ?? 0} · Cash payable{" "}
                    {formatCurrency(procedure.cashPayable ?? 0)}
                  </div>
                  {procedure.description ? (
                    <p className="mt-2 whitespace-pre-wrap text-xs text-gray-600">
                      {procedure.description}
                    </p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="text-sm text-gray-500">
                No procedures were saved for this phase.
              </p>
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

function SignedQuotationCard({
  quotation,
}: {
  quotation: AdminSignedQuotation;
}) {
  return (
    <article className="rounded-2xl border bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h2 className="text-xl font-bold">{quotation.patientName}</h2>
          <dl className="mt-3 grid gap-2 text-sm text-gray-600 sm:grid-cols-2">
            <div>
              <dt className="font-semibold text-gray-900">Patient ID</dt>
              <dd>{quotation.patientId}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Date signed</dt>
              <dd>{quotation.dateSigned}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Clinic</dt>
              <dd>{quotation.clinicBranch}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Dentist</dt>
              <dd>{quotation.dentistName}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Saved at</dt>
              <dd>{quotation.signedAtLabel}</dd>
            </div>
            <div>
              <dt className="font-semibold text-gray-900">Expires at</dt>
              <dd>{quotation.expiresAtLabel}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-xl bg-blue-50 p-4 text-blue-950">
          <p className="text-sm">Cash portion</p>
          <p className="mt-1 text-2xl font-bold tabular-nums">
            {formatCurrency(quotation.cashPayable)}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <ProcedureList quotation={quotation} />

        <div className="rounded-xl border p-4">
          <h3 className="font-semibold">Signature</h3>
          {quotation.signatureDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={quotation.signatureDataUrl}
              alt={`Signature for ${quotation.patientName}`}
              className="mt-3 h-32 w-full rounded-lg border object-contain"
            />
          ) : (
            <p className="mt-3 text-sm text-gray-500">
              No signature image was saved.
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const hasInvalidCode = resolvedSearchParams?.error === "invalid-code";
  const isSignedIn = await hasAdminSession();

  if (!isSignedIn) {
    return <AdminLogin hasInvalidCode={hasInvalidCode} />;
  }

  const { quotations, errorMessage } = await getRecentSignedQuotations();

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="mx-auto max-w-6xl space-y-5">
        <header className="rounded-2xl bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
                Nofrills Dental
              </p>
              <h1 className="mt-1 text-2xl font-bold">Signed quotations</h1>
              <p className="mt-2 text-sm text-gray-600">
                Showing the latest signed quotations saved in Firestore. Records
                remain subject to the 45-day TTL cleanup.
              </p>
            </div>
            <form action={logOutOfAdmin}>
              <button
                type="submit"
                className="rounded-xl border px-5 py-3 transition hover:bg-gray-100"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        {quotations.length ? (
          <div className="space-y-5">
            {quotations.map((quotation) => (
              <SignedQuotationCard
                key={quotation.id}
                quotation={quotation}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-white p-6 text-sm text-gray-600 shadow-sm">
            No signed quotations were found.
          </div>
        )}
      </div>
    </main>
  );
}
