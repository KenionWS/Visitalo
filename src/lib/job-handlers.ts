/**
 * Registro de todos los handlers de jobs. Se importa (solo por su efecto
 * secundario) antes de llamar a processJobs() — nunca importado por los
 * módulos de dominio, para no crear ciclos con queue.ts.
 */
import { and, desc, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { proposals, waMessages } from "@/db/schema";
import { registerJobHandler } from "./queue";
import { handleBuyerMessage, notifyBuyerOfNewProposal } from "./conversation";
import { handleAgencyMessage, notifyAgencyOfSearch } from "./agency-conversation";
import { dispatchSearchToAgencies } from "./distribution";
import { sendRelayQuestionToAgency } from "./relay";
import { notifyAgencyOfVisitRequest, sendVisitFollowup } from "./visits";
import { downloadMedia } from "./whatsapp";
import { uploadMedia } from "./storage";

registerJobHandler("conversation.buyer_message", async (payload) => {
  const { phone, text } = payload as { phone: string; text: string };
  await handleBuyerMessage(phone, text);
});

registerJobHandler("distribution.dispatch", async (payload) => {
  const { searchId } = payload as { searchId: string };
  await dispatchSearchToAgencies(searchId);
});

registerJobHandler("distribution.notify_agency", async (payload) => {
  const { agencyId, searchId } = payload as { agencyId: string; searchId: string };
  await notifyAgencyOfSearch(agencyId, searchId);
});

registerJobHandler("conversation.agency_message", async (payload) => {
  const { phone, text } = payload as { phone: string; text: string };
  await handleAgencyMessage(phone, text);
});

registerJobHandler("proposal.notify_buyer", async (payload) => {
  const { searchId } = payload as { searchId: string };
  await notifyBuyerOfNewProposal(searchId);
});

registerJobHandler("relay.send_question", async (payload) => {
  const { relayThreadId } = payload as { relayThreadId: string };
  await sendRelayQuestionToAgency(relayThreadId);
});

registerJobHandler("visit.notify_agency", async (payload) => {
  const { visitId } = payload as { visitId: string };
  await notifyAgencyOfVisitRequest(visitId);
});

registerJobHandler("visit.followup", async (payload) => {
  const { visitId } = payload as { visitId: string };
  await sendVisitFollowup(visitId);
});

// TEMPORAL — backfill puntual de fotos para una propuesta que se creó
// mientras WHATSAPP_TOKEN estaba vencido. Se saca del código apenas corra.
registerJobHandler("debug.backfill_photos", async (payload) => {
  const { proposalId, phone } = payload as { proposalId: string; phone: string };

  const [proposal] = await db.select().from(proposals).where(eq(proposals.id, proposalId)).limit(1);
  if (!proposal) throw new Error("Propuesta no encontrada");

  const since = new Date(proposal.createdAt.getTime() - 5 * 60 * 1000);
  const rows = await db
    .select({ payload: waMessages.payload })
    .from(waMessages)
    .where(
      and(
        eq(waMessages.phone, phone),
        eq(waMessages.direction, "in"),
        eq(waMessages.type, "image"),
        gte(waMessages.createdAt, since)
      )
    )
    .orderBy(desc(waMessages.createdAt));

  const mediaIds = rows
    .map((r) => (r.payload as { image?: { id?: string } } | null)?.image?.id)
    .filter((id): id is string => Boolean(id));

  const photos: string[] = [];
  for (const mediaId of mediaIds) {
    const media = await downloadMedia(mediaId);
    if (!media) continue;
    photos.push(await uploadMedia(media.buffer, media.contentType, `proposals/${mediaId}`));
  }

  await db.update(proposals).set({ photos }).where(eq(proposals.id, proposalId));
});
