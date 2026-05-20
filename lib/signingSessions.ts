import {
  addDoc,
  collection,
  doc,
  serverTimestamp,
  setDoc,
  Timestamp,
  type DocumentData,
  type DocumentReference,
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
  const expiresAt = Timestamp.fromDate(getSignedQuotationExpiryDate());
  const signedQuotation = {
    sessionId,
    quotation: removeUndefinedValues(quotation),
    patientName,
    dateSigned,
    signatureDataUrl,
    createdAt: serverTimestamp(),
    signedAt: serverTimestamp(),
    expiresAt,
  };

  const signedQuotationRef = await addDoc(
    collection(getDb(), SIGNED_QUOTATIONS_COLLECTION),
    signedQuotation,
  );

  await setDoc(
    getSigningSessionRef(sessionId),
    {
      status: "signed",
      patientName,
      dateSigned,
      signatureDataUrl,
      signedQuotationId: signedQuotationRef.id,
      signedAt: serverTimestamp(),
      expiresAt,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );

  return signedQuotationRef.id;
}
