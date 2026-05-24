import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  type DocumentData,
  type DocumentReference,
  type Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";

export const SIGNING_SESSIONS_COLLECTION = "signingSessions";
export const SIGNED_QUOTATIONS_COLLECTION = "signedQuotations";
export const SIGNED_QUOTATION_RETENTION_DAYS = 45;

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export type SigningSessionStatus = "pending" | "signed";

export type SigningQuotationProcedure = {
  category?: string;
  name?: string;
  quantity?: number;
  subsidyClaimQty?: number;
  fee?: number;
  gst?: number;
  subsidy?: number;
  medisaveClaim?: number;
  cashPayable?: number;
  description?: string;
};

export type SigningQuotationPhase = {
  id?: number;
  title?: string;
  duration?: string;
  procedures?: SigningQuotationProcedure[];
};

export type SigningQuotationSnapshot = {
  clinicBranch?: string;
  dentistName?: string;
  patientName?: string;
  patientId?: string;
  quotationDate?: string;
  preferredLanguage?: string;
  subsidyTier?: string;
  installmentPlan?: {
    id?: string;
    label?: string;
    months?: number;
    isInHouse?: boolean;
  } | null;
  installmentBreakdown?: {
    medisaveGstCash?: number;
    installmentAmount?: number;
    monthlyAmount?: number;
  } | null;
  totals?: {
    subtotal?: number;
    gst?: number;
    subsidy?: number;
    medisave?: number;
    payable?: number;
  };
  phases?: SigningQuotationPhase[];
  options?: Array<{
    id?: number;
    title?: string;
    description?: string;
    estimatedDuration?: string;
    totals?: {
      subtotal?: number;
      gst?: number;
      subsidy?: number;
      medisave?: number;
      payable?: number;
    };
    phases?: SigningQuotationPhase[];
  }>;
};

export type SigningSessionRecord = {
  status?: SigningSessionStatus;
  quotation?: SigningQuotationSnapshot | null;
  patientName?: string;
  dateSigned?: string;
  signatureDataUrl?: string;
  signedQuotationId?: string;
  signedAt?: Timestamp;
  expiresAt?: Timestamp;
};

export type SubmitSignedQuotationInput = {
  sessionId: string;
  quotation: SigningQuotationSnapshot | null;
  patientName: string;
  dateSigned: string;
  signatureDataUrl: string;
};

function getDb() {
  if (!db) {
    throw new Error("Firebase is not configured. Add the NEXT_PUBLIC_FIREBASE_* environment variables.");
  }

  return db;
}

function removeUndefinedValues<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function getSignedQuotationExpiryDate(fromDate = new Date()) {
  return new Date(fromDate.getTime() + SIGNED_QUOTATION_RETENTION_DAYS * DAY_IN_MS);
}

export function getSigningSessionRef(sessionId: string): DocumentReference<DocumentData> {
  return doc(getDb(), SIGNING_SESSIONS_COLLECTION, sessionId);
}

export async function createSigningSession(quotation: SigningQuotationSnapshot) {
  const documentRef = await addDoc(collection(getDb(), SIGNING_SESSIONS_COLLECTION), {
    status: "pending",
    quotation: removeUndefinedValues(quotation),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return documentRef.id;
}

export async function updateSigningSessionQuotation(
  sessionId: string,
  quotation: SigningQuotationSnapshot,
) {
  await setDoc(
    getSigningSessionRef(sessionId),
    {
      quotation: removeUndefinedValues(quotation),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function submitSignedQuotation({
  sessionId,
  quotation,
  patientName,
  dateSigned,
  signatureDataUrl,
}: SubmitSignedQuotationInput) {
  const response = await fetch(
    `/api/signing-sessions/${encodeURIComponent(sessionId)}/submit`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        quotation: removeUndefinedValues(quotation),
        patientName,
        dateSigned,
        signatureDataUrl,
      }),
    },
  );

  const responseBody = (await response.json().catch(() => null)) as {
    signedQuotationId?: string;
    error?: string;
  } | null;

  if (!response.ok) {
    throw new Error(
      responseBody?.error ?? "Unable to save the signed quotation.",
    );
  }

  return responseBody?.signedQuotationId ?? "";
}
