"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--fondo)] px-4">
      <form
        action={action}
        className="w-full max-w-sm rounded-2xl border border-[var(--tinta)]/10 bg-white p-6 shadow-sm"
      >
        <p className="font-display text-xl text-[var(--verde-profundo)]">
          visitalo<span className="text-[var(--ambar)]">.</span>
        </p>
        <h1 className="mt-1 text-sm text-[var(--tinta)]/60">Panel de administración</h1>

        <div className="mt-5 space-y-3">
          <div>
            <label className="block text-sm font-medium text-[var(--tinta)]">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--tinta)]">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
            />
          </div>
        </div>

        {state?.error && <p className="mt-3 text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="mt-5 w-full rounded-full bg-[var(--verde-profundo)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
