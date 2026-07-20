"use client";

import { useState, useTransition } from "react";
import { toggleFavorite, requestVisit, askQuestion } from "./actions";

/**
 * Disparan la server action directo desde el cliente (como ya hacía
 * DiscardButton) en vez de un <form action={...}> con botón submit — en
 * algunos navegadores mobile (reportado en Chrome + incógnito en Android)
 * el submit del form no llegaba a dispararse al tocar el botón.
 */
export function FavoriteButton({
  token,
  proposalId,
  favorited,
}: {
  token: string;
  proposalId: string;
  favorited: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(async () => { await toggleFavorite(token, proposalId); })}
      className={`rounded-full border px-4 py-2 text-sm disabled:opacity-60 ${
        favorited
          ? "border-[var(--ambar)] bg-[var(--ambar)]/10 text-[var(--tinta)]"
          : "border-[var(--tinta)]/20 text-[var(--tinta)]/70"
      }`}
    >
      {favorited ? "★ Favorita" : "☆ Favorita"}
    </button>
  );
}

export function RequestVisitButton({
  token,
  proposalId,
  alreadyRequested,
}: {
  token: string;
  proposalId: string;
  alreadyRequested: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const done = alreadyRequested && !isPending;

  return (
    <button
      type="button"
      disabled={isPending || done}
      onClick={() => startTransition(async () => { await requestVisit(token, proposalId); })}
      className={`ml-auto rounded-full px-4 py-2 text-sm font-medium disabled:opacity-60 ${
        done ? "bg-[var(--verde-claro)] text-[var(--verde-profundo)]" : "bg-[var(--verde)] text-white"
      }`}
    >
      {isPending ? "Enviando..." : done ? "✓ Visita solicitada" : "Pedir visita"}
    </button>
  );
}

export function AskQuestionForm({ token, proposalId }: { token: string; proposalId: string }) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (sent) {
    return <p className="text-sm text-[var(--verde-profundo)]">✓ Pregunta enviada</p>;
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-full border border-[var(--tinta)]/20 px-4 py-2 text-sm text-[var(--tinta)]/70"
      >
        Preguntar
      </button>
    );
  }

  return (
    <div className="mt-2 flex w-full flex-col gap-2">
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Escribí tu pregunta..."
        className="w-full rounded-lg border border-[var(--tinta)]/20 bg-white p-2 text-sm"
        rows={2}
      />
      <div className="flex gap-2">
        <button
          type="button"
          disabled={isPending || value.trim().length === 0}
          onClick={() =>
            startTransition(async () => {
              await askQuestion(token, proposalId, value.trim());
              setSent(true);
            })
          }
          className="rounded-full bg-[var(--verde-profundo)] px-4 py-2 text-sm text-white disabled:opacity-60"
        >
          {isPending ? "Enviando..." : "Enviar"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-full px-4 py-2 text-sm text-[var(--tinta)]/60"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
