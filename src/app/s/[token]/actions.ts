"use server";

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { proposalEvents, proposals, searches, visits } from "@/db/schema";
import { revalidatePath } from "next/cache";

/**
 * Todas las acciones reciben el token de la shortlist y validan que la
 * propuesta pertenezca a esa búsqueda antes de escribir nada — el token es
 * la única "autenticación" del comprador acá, así que no hay que confiar en
 * el proposalId solo.
 */
async function assertProposalBelongsToToken(token: string, proposalId: string) {
  const [row] = await db
    .select({ proposalId: proposals.id })
    .from(proposals)
    .innerJoin(searches, eq(proposals.searchId, searches.id))
    .where(and(eq(proposals.id, proposalId), eq(searches.shortlistToken, token)))
    .limit(1);

  if (!row) throw new Error("Propuesta no encontrada para esta búsqueda");
}

export async function toggleFavorite(token: string, proposalId: string) {
  await assertProposalBelongsToToken(token, proposalId);

  const [lastEvent] = await db
    .select()
    .from(proposalEvents)
    .where(and(eq(proposalEvents.proposalId, proposalId), eq(proposalEvents.type, "favorite")))
    .orderBy(desc(proposalEvents.createdAt))
    .limit(1);

  const currentlyFavorited = Boolean((lastEvent?.payload as { active?: boolean } | null)?.active);

  await db.insert(proposalEvents).values({
    proposalId,
    type: "favorite",
    payload: { active: !currentlyFavorited },
  });

  revalidatePath(`/s/${token}`);
}

const DISCARD_MOTIVOS = ["precio", "ubicacion", "estado", "piso_orientacion", "otro"] as const;
export type DiscardMotivo = (typeof DISCARD_MOTIVOS)[number];

export async function discardProposal(
  token: string,
  proposalId: string,
  motivo: DiscardMotivo,
  texto?: string
) {
  await assertProposalBelongsToToken(token, proposalId);
  if (!DISCARD_MOTIVOS.includes(motivo)) {
    throw new Error(`Motivo de descarte inválido: ${motivo}`);
  }

  await db.insert(proposalEvents).values({
    proposalId,
    type: "discard",
    payload: { motivo, texto: texto || undefined },
  });

  await db.update(proposals).set({ status: "discarded" }).where(eq(proposals.id, proposalId));

  revalidatePath(`/s/${token}`);
}

export async function requestVisit(token: string, proposalId: string) {
  await assertProposalBelongsToToken(token, proposalId);

  await db.insert(proposalEvents).values({
    proposalId,
    type: "visit_request",
    payload: {},
  });

  // El chequeo de créditos de la agencia y la coordinación por relay se
  // implementan en la Fase 4 — acá solo dejamos registrada la solicitud.
  await db.insert(visits).values({ proposalId, status: "requested" });

  revalidatePath(`/s/${token}`);
}
