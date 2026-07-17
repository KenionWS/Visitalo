"use server";

import { redirect } from "next/navigation";
import { verifyPassword } from "@/lib/auth/password";
import { createSession, deleteSession } from "@/lib/auth/session";

export type LoginState = { error?: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  // .trim() acá también: es común que una variable de entorno pegada en el
  // dashboard de Vercel termine con un espacio o salto de línea invisible,
  // lo que rompería la comparación exacta sin que se note por qué.
  const adminEmail = process.env.ADMIN_EMAIL?.trim();
  const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH?.trim();

  if (!adminEmail || !adminPasswordHash) {
    return { error: "ADMIN_EMAIL / ADMIN_PASSWORD_HASH no están configurados en el servidor." };
  }

  if (email.toLowerCase() !== adminEmail.toLowerCase()) {
    return { error: "Email o contraseña incorrectos." };
  }

  const ok = await verifyPassword(password, adminPasswordHash);
  if (!ok) {
    return { error: "Email o contraseña incorrectos." };
  }

  await createSession(email);
  redirect("/admin");
}

export async function logout() {
  await deleteSession();
  redirect("/admin/login");
}
