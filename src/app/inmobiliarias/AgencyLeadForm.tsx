"use client";

import { useState, useTransition } from "react";
import { ZoneCheckboxes } from "@/components/ZoneCheckboxes";
import { submitAgencyLead } from "./actions";

const inputClass =
  "mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]";

export function AgencyLeadForm() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; error?: string } | null>(null);

  if (result?.ok) {
    return (
      <div className="rounded-2xl bg-[var(--verde-claro)] p-6 text-center">
        <p className="font-display text-lg text-[var(--verde-profundo)]">¡Listo!</p>
        <p className="mt-1 text-sm text-[var(--tinta)]/70">Recibimos tus datos, te contactamos para darte de alta.</p>
      </div>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        startTransition(async () => {
          const res = await submitAgencyLead(formData);
          setResult(res.ok ? { ok: true } : { ok: false, error: res.error });
        });
      }}
      className="space-y-4 rounded-2xl border border-[var(--tinta)]/10 bg-white p-6 shadow-sm"
    >
      <div>
        <label className="block text-sm font-medium text-[var(--tinta)]/80">Nombre de la inmobiliaria</label>
        <input name="name" required className={inputClass} />
      </div>
      <div>
        <label className="block text-sm font-medium text-[var(--tinta)]/80">Teléfono (WhatsApp)</label>
        <input name="phone" required placeholder="11 2233 4455" className={inputClass} />
      </div>
      <ZoneCheckboxes selected={[]} />
      {result?.error && <p className="text-sm text-red-600">{result.error}</p>}
      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-full bg-[var(--verde-profundo)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isPending ? "Enviando..." : "Quiero sumarme"}
      </button>
    </form>
  );
}
