"use server";

import { redirect } from "next/navigation";
import {
  clearAdminSession,
  createAdminSession,
  isValidAdminAccessCode,
} from "../../lib/adminAuth";

export async function logInToAdmin(formData: FormData) {
  const accessCode = String(formData.get("accessCode") ?? "");

  if (!isValidAdminAccessCode(accessCode)) {
    redirect("/admin?error=invalid-code");
  }

  await createAdminSession();
  redirect("/admin");
}

export async function logOutOfAdmin() {
  await clearAdminSession();
  redirect("/admin");
}
