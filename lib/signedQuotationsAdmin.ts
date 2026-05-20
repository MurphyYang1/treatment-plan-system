import "server-only";

import type { Timestamp } from "firebase-admin/firestore";
import type { SigningQuotationSnapshot } from "./signingSessions";
import { getFirebaseAdminDb, isFirebaseAdminConfigured } from "./firebaseAdmin";

const SIGNED_QUOTATIONS_COLLECTION = "signedQuotations";
const DEFAULT_QUOTATION_LIMIT = 50;

type TimestampLike = Timestamp | Date | string | null | undefined;

type SignedQuotationData = {
  patientName?: string;
  dateSigned?: string;
  signatureDataUrl?: string;
  signedAt?: TimestampLike;
  expiresAt?: TimestampLike;
  quotation?: SigningQuotationSnapshot | null;
};

export type AdminSignedQuotation = {
  id: string;
  patientName: string;
  patientId: string;
  clinicBranch: string;
  dentistName: string;
  dateSigned: string;
  signedAtLabel: string;
  expiresAtLabel: string;
  cashPayable: number;
  signatureDataUrl: string;
  quotation: SigningQuotationSnapshot | null;
};

function toDate(value: TimestampLike) {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string") {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
  }

  if (typeof value.toDate === "function") {
    return value.toDate();
  }

  return null;
}

function formatDateTime(value: TimestampLike) {
  const date = toDate(value);

  if (!date) {
    return "Not available";
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatDate(value: string | undefined) {
  if (!value) {
    return "Not available";
  }

  const parsedDate = new Date(`${value}T00:00:00`);

  if (Number.isNaN(parsedDate.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("en-SG", {
    dateStyle: "medium",
  }).format(parsedDate);
}

export async function getRecentSignedQuotations(
  limit = DEFAULT_QUOTATION_LIMIT,
): Promise<{ quotations: AdminSignedQuotation[]; errorMessage?: string }> {
  if (!isFirebaseAdminConfigured) {
    return {
      quotations: [],
      errorMessage:
        "Firebase Admin is not configured. Add FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to your server environment variables.",
    };
  }

  const db = getFirebaseAdminDb();

  if (!db) {
    return {
      quotations: [],
      errorMessage:
        "Firebase Admin could not connect. Check your server environment variables.",
    };
  }

  try {
    const snapshot = await db
      .collection(SIGNED_QUOTATIONS_COLLECTION)
      .orderBy("signedAt", "desc")
      .limit(limit)
      .get();

    const quotations = snapshot.docs.map((documentSnapshot) => {
      const data = documentSnapshot.data() as SignedQuotationData;
      const quotation = data.quotation ?? null;

      return {
        id: documentSnapshot.id,
        patientName:
          data.patientName || quotation?.patientName || "Unnamed patient",
        patientId: quotation?.patientId || "Not entered",
        clinicBranch: quotation?.clinicBranch || "Not entered",
        dentistName: quotation?.dentistName || "Not entered",
        dateSigned: formatDate(data.dateSigned),
        signedAtLabel: formatDateTime(data.signedAt),
        expiresAtLabel: formatDateTime(data.expiresAt),
        cashPayable: quotation?.totals?.payable ?? 0,
        signatureDataUrl: data.signatureDataUrl ?? "",
        quotation,
      };
    });

    return { quotations };
  } catch (error) {
    return {
      quotations: [],
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unable to load signed quotations.",
    };
  }
}
