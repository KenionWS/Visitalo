import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { getSession } from "./session";

/**
 * Verifica la sesión del operador. Redirige a /admin/login si no hay una
 * válida. Memoizado con React.cache para no releer la cookie más de una vez
 * por render.
 */
export const verifySession = cache(async () => {
  const session = await getSession();
  if (!session?.email) {
    redirect("/admin/login");
  }
  return { email: session.email };
});
