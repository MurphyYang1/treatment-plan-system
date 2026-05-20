import "server-only";

import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";

const projectId =
  process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

export const isFirebaseAdminConfigured = Boolean(
  projectId && clientEmail && privateKey,
);

let adminApp: App | null = null;

export function getFirebaseAdminDb(): Firestore | null {
  if (!isFirebaseAdminConfigured || !projectId || !clientEmail || !privateKey) {
    return null;
  }

  adminApp =
    adminApp ??
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });

  return getFirestore(adminApp);
}
