"use client";

import { useTransition } from "react";
import { toggleFavorite, requestVisit } from "./actions";

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
