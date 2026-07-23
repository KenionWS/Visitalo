"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--verde-profundo)] px-4">
      <form
        action={action}
        className="w-full max-w-sm rounded-3xl border border-white/10 bg-white p-8 shadow-2xl shadow-black/20"
      >
        <p className="font-display text-2xl text-[var(--verde-profundo)]">
          visitalo<span className="text-[var(--ambar)]">.</span>
        </p>
        <h1 className="mt-1 text-sm text-[var(--tinta)]/60">Panel de administración</h1>

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--tinta)]">Email</label>
            <input
              type="email"
              name="email"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--tinta)]">Contraseña</label>
            <input
              type="password"
              name="password"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
            />
          </div>
        </div>

        {state?.error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{state.error}</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-6 w-full rounded-full bg-[var(--verde-profundo)] px-4 py-2.5 text-sm font-medium text-white disabled:opacity-60"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
