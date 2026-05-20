import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import {
  SIGNED_QUOTATION_RETENTION_DAYS,
  type SigningQuotationSnapshot,
} from "../../../../../lib/signingSessions";
import {
  getFirebaseAdminDb,
  isFirebaseAdminConfigured,
} from "../../../../../lib/firebaseAdmin";

const DAY_IN_MS = 24 * 60 * 60 * 1000;
const MAX_SIGNATURE_DATA_URL_LENGTH = 900000;

type SubmitSignatureRequestBody = {
  quotation?: SigningQuotationSnapshot | null;
  patientName?: string;
  dateSigned?: string;
  signatureDataUrl?: string;
};

function getSignedQuotationExpiryDate(fromDate = new Date()) {
  return new Date(
    fromDate.getTime() + SIGNED_QUOTATION_RETENTION_DAYS * DAY_IN_MS,
  );
}

function isValidDateInput(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isValidSignatureDataUrl(value: string) {
  return (
    value.startsWith("data:image/png;base64,") &&
    value.length <= MAX_SIGNATURE_DATA_URL_LENGTH
  );
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;

  if (!isFirebaseAdminConfigured) {
    return NextResponse.json(
      {
        error:
          "Firebase Admin is not configured. Add the server Firebase environment variables and redeploy.",
      },
      { status: 500 },
    );
  }

  const db = getFirebaseAdminDb();

  if (!db) {
    return NextResponse.json(
      { error: "Firebase Admin could not connect." },
      { status: 500 },
    );
  }

  if (!sessionId) {
    return NextResponse.json(
      { error: "Missing signing session ID." },
      { status: 400 },
    );
  }

  let body: SubmitSignatureRequestBody;

  try {
    body = (await request.json()) as SubmitSignatureRequestBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid signature submission." },
      { status: 400 },
    );
  }

  const patientName = body.patientName?.trim() ?? "";
  const dateSigned = body.dateSigned?.trim() ?? "";
  const signatureDataUrl = body.signatureDataUrl ?? "";

  if (!patientName || patientName.length > 160) {
    return NextResponse.json(
      { error: "Enter a patient name before saving." },
      { status: 400 },
    );
  }

  if (!isValidDateInput(dateSigned)) {
    return NextResponse.json(
      { error: "Enter a valid date signed." },
      { status: 400 },
    );
  }

  if (!isValidSignatureDataUrl(signatureDataUrl)) {
    return NextResponse.json(
      { error: "The signature image was missing or too large." },
      { status: 400 },
    );
  }

  try {
    const sessionRef = db.collection("signingSessions").doc(sessionId);
    const signedQuotationRef = db.collection("signedQuotations").doc();
    const expiresAt = Timestamp.fromDate(getSignedQuotationExpiryDate());
    let signedQuotationId = signedQuotationRef.id;

    await db.runTransaction(async (transaction) => {
      const sessionSnapshot = await transaction.get(sessionRef);

      if (!sessionSnapshot.exists) {
        throw new Error("This signing session is no longer available.");
      }

      const sessionData = sessionSnapshot.data();

      if (sessionData?.status === "signed") {
        signedQuotationId =
          typeof sessionData.signedQuotationId === "string"
            ? sessionData.signedQuotationId
            : "";
        return;
      }

      if (sessionData?.status !== "pending") {
        throw new Error("This signing session cannot be signed.");
      }

      const quotation =
        body.quotation ?? (sessionData.quotation as SigningQuotationSnapshot);

      transaction.set(signedQuotationRef, {
        sessionId,
        quotation,
        patientName,
        dateSigned,
        signatureDataUrl,
        createdAt: FieldValue.serverTimestamp(),
        signedAt: FieldValue.serverTimestamp(),
        expiresAt,
      });

      transaction.set(
        sessionRef,
        {
          status: "signed",
          patientName,
          dateSigned,
          signatureDataUrl,
          signedQuotationId: signedQuotationRef.id,
          signedAt: FieldValue.serverTimestamp(),
          expiresAt,
          updatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
    });

    return NextResponse.json({ signedQuotationId });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Unable to save the signed quotation.",
      },
      { status: 500 },
    );
  }
}
