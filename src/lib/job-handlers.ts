/**
 * Registro de todos los handlers de jobs. Se importa (solo por su efecto
 * secundario) antes de llamar a processJobs() — nunca importado por los
 * módulos de dominio, para no crear ciclos con queue.ts.
 */
import { registerJobHandler } from "./queue";
import { handleBuyerMessage, notifyBuyerOfNewProposal } from "./conversation";
import { handleAgencyMessage, notifyAgencyOfSearch } from "./agency-conversation";
import { dispatchSearchToAgencies } from "./distribution";
import { sendRelayQuestionToAgency } from "./relay";
import { notifyAgencyOfVisitRequest, sendVisitFollowup } from "./visits";

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
