import "server-only";

import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const ADMIN_COOKIE_NAME = "nofrills_admin_session";
const ADMIN_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

function getAdminAccessCode() {
  return process.env.ADMIN_ACCESS_CODE ?? "";
}

function getAdminSessionSecret() {
  return process.env.ADMIN_SESSION_SECRET ?? getAdminAccessCode();
}

function hashValue(value: string) {
  return createHash("sha256").update(value).digest();
}

function safeEqual(left: string, right: string) {
  return timingSafeEqual(hashValue(left), hashValue(right));
}

function signSessionToken(token: string) {
  return createHmac("sha256", getAdminSessionSecret())
    .update(token)
    .digest("hex");
}

function isValidSignedToken(value: string) {
  const [token, signature] = value.split(".");

  if (!token || !signature) {
    return false;
  }

  return safeEqual(signature, signSessionToken(token));
}

export function isAdminAuthConfigured() {
  return Boolean(getAdminAccessCode());
}

export function isValidAdminAccessCode(accessCode: string) {
  const configuredAccessCode = getAdminAccessCode();

  if (!configuredAccessCode || !accessCode) {
    return false;
  }

  return safeEqual(accessCode, configuredAccessCode);
}

export async function hasAdminSession() {
  if (!isAdminAuthConfigured()) {
    return false;
  }

  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(ADMIN_COOKIE_NAME);

  return sessionCookie ? isValidSignedToken(sessionCookie.value) : false;
}

export async function createAdminSession() {
  const cookieStore = await cookies();
  const token = randomBytes(32).toString("hex");
  const signedToken = `${token}.${signSessionToken(token)}`;

  cookieStore.set(ADMIN_COOKIE_NAME, signedToken, {
    httpOnly: true,
    maxAge: ADMIN_SESSION_MAX_AGE_SECONDS,
    path: "/admin",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();

  cookieStore.delete(ADMIN_COOKIE_NAME);
}
