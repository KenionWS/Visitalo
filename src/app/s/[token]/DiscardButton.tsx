"use client";

import { useState, useTransition } from "react";
import { discardProposal, type DiscardMotivo } from "./actions";

const MOTIVOS: Array<{ value: DiscardMotivo; label: string }> = [
  { value: "precio", label: "Precio" },
  { value: "ubicacion", label: "Ubicación" },
  { value: "estado", label: "Estado" },
  { value: "piso_orientacion", label: "Piso / orientación" },
  { value: "otro", label: "Otro" },
];

export function DiscardButton({ token, proposalId }: { token: string; proposalId: string }) {
  const [open, setOpen] = useState(false);
  const [motivo, setMotivo] = useState<DiscardMotivo>("precio");
  const [texto, setTexto] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[var(--tinta)]/20 px-4 py-2 text-sm text-[var(--tinta)]/70 hover:bg-black/5"
      >
        Descartar
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-[var(--papel)] p-5 sm:rounded-2xl">
            <h3 className="font-display text-lg">¿Por qué descartás esta propiedad?</h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {MOTIVOS.map((m) => (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMotivo(m.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm ${
                    motivo === m.value
                      ? "border-[var(--verde)] bg-[var(--verde-claro)] text-[var(--verde-profundo)]"
                      : "border-[var(--tinta)]/20 text-[var(--tinta)]/70"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
            {motivo === "otro" && (
              <textarea
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder="Contanos un poco más..."
                className="mt-3 w-full rounded-lg border border-[var(--tinta)]/20 bg-white p-2 text-sm"
                rows={2}
              />
            )}
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full px-4 py-2 text-sm text-[var(--tinta)]/60"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  startTransition(async () => {
                    await discardProposal(token, proposalId, motivo, texto);
                    setOpen(false);
                  });
                }}
                className="rounded-full bg-[var(--verde-profundo)] px-4 py-2 text-sm text-white disabled:opacity-60"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
