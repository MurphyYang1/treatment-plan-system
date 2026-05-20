"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import SignatureCanvas from "react-signature-canvas";
import { onSnapshot } from "firebase/firestore";
import { isFirebaseConfigured } from "../../../lib/firebase";
import {
  getSigningSessionRef,
  SIGNED_QUOTATION_RETENTION_DAYS,
  submitSignedQuotation,
  type SigningQuotationSnapshot,
  type SigningSessionRecord,
} from "../../../lib/signingSessions";

function getDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function formatCurrency(amount?: number) {
  return `$${(amount ?? 0).toFixed(2)}`;
}

function getSessionId(param: string | string[] | undefined) {
  return Array.isArray(param) ? param[0] ?? "" : param ?? "";
}

function QuotationSummary({
  quotation,
}: {
  quotation: SigningQuotationSnapshot | null | undefined;
}) {
  if (!quotation) {
    return (
      <p className="rounded-xl bg-gray-50 p-4 text-sm text-gray-600">
        The quotation details are still loading. Please wait a moment before
        signing.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
        <div>
          <span className="font-semibold">Patient:</span>{" "}
          {quotation.patientName || "Not entered"}
        </div>
        <div>
          <span className="font-semibold">Patient ID:</span>{" "}
          {quotation.patientId || "Not entered"}
        </div>
        <div>
          <span className="font-semibold">Clinic:</span>{" "}
          {quotation.clinicBranch || "Not entered"}
        </div>
        <div>
          <span className="font-semibold">Dentist:</span>{" "}
          {quotation.dentistName || "Not entered"}
        </div>
      </div>

      <div className="rounded-xl border p-4">
        <h2 className="text-lg font-bold">Treatment phases</h2>
        <div className="mt-3 space-y-3">
          {quotation.phases?.length ? (
            quotation.phases.map((phase, phaseIndex) => (
              <section key={phase.id ?? phaseIndex} className="rounded-lg bg-gray-50 p-3">
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
                          {formatCurrency(procedure.cashPayable)}
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
                      No procedures have been added yet.
                    </p>
                  )}
                </div>
              </section>
            ))
          ) : (
            <p className="text-sm text-gray-500">
              No treatment phases have been added yet.
            </p>
          )}
        </div>
      </div>

      <div className="rounded-xl border bg-blue-50 p-4 text-sm text-blue-950">
        <h2 className="font-bold">Financial summary</h2>
        <dl className="mt-3 space-y-2">
          <div className="flex justify-between gap-4">
            <dt>Treatment subtotal</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(quotation.totals?.subtotal)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>GST</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(quotation.totals?.gst)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Subsidies used</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(quotation.totals?.subsidy)}
            </dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt>Medisave used</dt>
            <dd className="font-medium tabular-nums">
              {formatCurrency(quotation.totals?.medisave)}
            </dd>
          </div>
          <div className="flex justify-between gap-4 border-t border-blue-200 pt-2 text-base font-bold">
            <dt>Cash portion</dt>
            <dd className="tabular-nums">{formatCurrency(quotation.totals?.payable)}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}

export default function SignQuotationPage() {
  const params = useParams<{ sessionId?: string | string[] }>();
  const sessionId = getSessionId(params.sessionId);
  const signatureRef = useRef<SignatureCanvas | null>(null);
  const didPrefillNameRef = useRef(false);
  const [session, setSession] = useState<SigningSessionRecord | null>(null);
  const [patientName, setPatientName] = useState("");
  const [dateSigned, setDateSigned] = useState(getDateInputValue(new Date()));
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setErrorMessage("Firebase is not configured for this signing page.");
      return;
    }

    if (!sessionId) {
      setErrorMessage("This signing link is missing its session ID.");
      return;
    }

    return onSnapshot(
      getSigningSessionRef(sessionId),
      (snapshot) => {
        if (!snapshot.exists()) {
          setErrorMessage("This signing link is no longer available.");
          return;
        }

        const nextSession = snapshot.data() as SigningSessionRecord;
        setSession(nextSession);

        if (nextSession.status === "signed") {
          setIsSubmitted(true);
        }

        if (!didPrefillNameRef.current && nextSession.quotation?.patientName) {
          setPatientName(nextSession.quotation.patientName);
          didPrefillNameRef.current = true;
        }

        setErrorMessage("");
      },
      (error) => {
        setErrorMessage(getErrorMessage(error));
      },
    );
  }, [sessionId]);

  const clearSignature = () => {
    signatureRef.current?.clear();
  };

  const submitSignature = async () => {
    if (!sessionId || !session) {
      setErrorMessage("This signing session is not ready yet.");
      return;
    }

    if (!signatureRef.current || signatureRef.current.isEmpty()) {
      setErrorMessage("Please sign in the signature box before submitting.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      await submitSignedQuotation({
        sessionId,
        quotation: session.quotation ?? null,
        patientName,
        dateSigned,
        signatureDataUrl: signatureRef.current.toDataURL("image/png"),
      });
      setIsSubmitted(true);
    } catch (error) {
      setErrorMessage(getErrorMessage(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted || session?.status === "signed") {
    return (
      <main className="min-h-screen bg-gray-100 p-4 text-black">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-6 shadow-xl">
          <h1 className="text-2xl font-bold">Signature received</h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Thank you. The clinic&apos;s quotation page will update
            automatically. This signed quotation is marked to expire after{" "}
            {SIGNED_QUOTATION_RETENTION_DAYS} days.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-100 p-4 text-black">
      <div className="mx-auto max-w-2xl space-y-4 rounded-2xl bg-white p-4 shadow-xl sm:p-6">
        <header>
          <p className="text-sm font-semibold uppercase tracking-wide text-gray-500">
            Nofrills Dental
          </p>
          <h1 className="mt-1 text-2xl font-bold">
            Review and sign treatment quotation
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-gray-600">
            Please review the quotation details below, then sign to acknowledge
            that the proposed treatment, estimated fees, subsidies, Medisave
            claims, risks and alternatives have been explained clearly.
          </p>
        </header>

        {errorMessage ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        ) : null}

        <QuotationSummary quotation={session?.quotation} />

        <section className="rounded-xl border p-4">
          <h2 className="text-lg font-bold">Patient acknowledgement</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-600">
            I acknowledge that the proposed treatment, estimated fees, subsidies,
            Medisave claims, risks and alternative options have been explained
            clearly to me.
          </p>

          <div className="mt-4 overflow-hidden rounded-xl border-2 border-dashed bg-white">
            <SignatureCanvas
              ref={signatureRef}
              penColor="black"
              canvasProps={{
                width: 720,
                height: 260,
                className: "h-56 w-full bg-white",
              }}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                Patient Name
              </label>
              <input
                type="text"
                value={patientName}
                onChange={(event) => setPatientName(event.target.value)}
                className="w-full rounded-xl border px-4 py-3"
                placeholder="Full Name"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-gray-500">
                Date Signed
              </label>
              <input
                type="date"
                value={dateSigned}
                onChange={(event) => setDateSigned(event.target.value)}
                className="h-12 w-full rounded-xl border px-4 py-3 leading-normal"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={clearSignature}
              className="rounded-xl border px-5 py-3 transition hover:bg-gray-100"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={submitSignature}
              disabled={isSubmitting || !session}
              className="rounded-xl bg-black px-5 py-3 text-white transition hover:bg-gray-800 disabled:cursor-not-allowed disabled:bg-gray-300"
            >
              {isSubmitting ? "Submitting..." : "Submit Signature"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
