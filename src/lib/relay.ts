import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, buyers, conversations, proposals, relayThreads, searches } from "@/db/schema";
import { redactRelayMessage } from "./llm";
import { sendText } from "./whatsapp";
import { stripLikelyContactInfo, shortlistUrl } from "./text";

/**
 * Módulo hoja: no importa conversation.ts ni agency-conversation.ts para
 * evitar ciclos (mismo motivo por el que queue.ts/job-handlers.ts están
 * separados). Por eso duplica el getOrCreate de conversación de inmobiliaria.
 */
type AgencyConversationContext = Record<string, unknown> & {
  pendingRelayThreadId?: string;
};

async function getRelayThreadDetails(relayThreadId: string) {
  const [thread] = await db.select().from(relayThreads).where(eq(relayThreads.id, relayThreadId)).limit(1);
  if (!thread) return null;

  const [proposal] = await db.select().from(proposals).where(eq(proposals.id, thread.proposalId)).limit(1);
  if (!proposal) return null;

  const [agency] = await db.select().from(agencies).where(eq(agencies.id, proposal.agencyId)).limit(1);
  const [search] = await db.select().from(searches).where(eq(searches.id, proposal.searchId)).limit(1);
  if (!agency || !search) return null;

  const [buyer] = await db.select().from(buyers).where(eq(buyers.id, search.buyerId)).limit(1);
  if (!buyer) return null;

  return { thread, proposal, agency, buyer, search };
}

async function getOrCreateAgencyConversation(phone: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.phone, phone), eq(conversations.actorType, "agency")))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ phone, actorType: "agency", state: "ONBOARDED", context: {} })
    .returning();
  return created;
}

/** Manda la pregunta del comprador (redactada, sin PII) a la inmobiliaria de la propuesta y deja la conversación esperando la respuesta. */
export async function sendRelayQuestionToAgency(relayThreadId: string): Promise<void> {
  const details = await getRelayThreadDetails(relayThreadId);
  if (!details) return;
  const { thread, agency } = details;

  const redactedByLlm = await redactRelayMessage(thread.question, "comprador_a_inmobiliaria");
  if (!redactedByLlm) {
    throw new Error(
      "No se pudo redactar la pregunta del relay: ANTHROPIC_API_KEY no configurada o el modelo no respondió."
    );
  }
  const redacted = stripLikelyContactInfo(redactedByLlm);
  if (redacted !== redactedByLlm) {
    console.warn(`[relay] la red de seguridad tapó algo que el LLM había dejado pasar (thread ${thread.id})`);
  }

  await sendText(
    agency.phone,
    `Un comprador tiene una pregunta sobre una propiedad que publicaste:\n\n"${redacted}"\n\nRespondé acá mismo y se la reenviamos.`
  );

  const conversation = await getOrCreateAgencyConversation(agency.phone);
  const context = (conversation.context ?? {}) as AgencyConversationContext;
  await db
    .update(conversations)
    .set({
      context: { ...context, pendingRelayThreadId: thread.id },
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversation.id));
}

/** Recibe la respuesta de la inmobiliaria a una pregunta pendiente del relay, la redacta y se la reenvía al comprador. */
export async function handleAgencyRelayAnswer(
  conversationId: string,
  context: AgencyConversationContext,
  text: string
): Promise<void> {
  const relayThreadId = context.pendingRelayThreadId;
  if (!relayThreadId) return;

  const details = await getRelayThreadDetails(relayThreadId);
  if (!details) {
    await db
      .update(conversations)
      .set({ context: { ...context, pendingRelayThreadId: undefined }, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    return;
  }
  const { thread, agency, buyer, search } = details;
  const link = shortlistUrl(search.shortlistToken);

  // Ya se había redactado y guardado la respuesta en un intento anterior que
  // falló recién al avisarle al comprador — no volvemos a llamar al LLM,
  // solo reintentamos el envío con lo que ya quedó guardado.
  if (thread.status === "answered" && thread.answer) {
    await sendText(buyer.phone, `Te respondieron tu pregunta:\n\n"${thread.answer}"\n\nMirá tu shortlist acá: ${link}`);
    await db
      .update(conversations)
      .set({ context: { ...context, pendingRelayThreadId: undefined }, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    await sendText(agency.phone, "¡Gracias! Se la reenviamos al comprador.");
    return;
  }

  const redactedByLlm = await redactRelayMessage(text, "inmobiliaria_a_comprador");
  if (!redactedByLlm) {
    throw new Error(
      "No se pudo redactar la respuesta del relay: ANTHROPIC_API_KEY no configurada o el modelo no respondió."
    );
  }
  const redacted = stripLikelyContactInfo(redactedByLlm);
  if (redacted !== redactedByLlm) {
    console.warn(`[relay] la red de seguridad tapó algo que el LLM había dejado pasar (thread ${thread.id})`);
  }

  await db
    .update(relayThreads)
    .set({ answer: redacted, status: "answered", answeredAt: new Date() })
    .where(eq(relayThreads.id, thread.id));

  await sendText(buyer.phone, `Te respondieron tu pregunta:\n\n"${redacted}"\n\nMirá tu shortlist acá: ${link}`);

  await db
    .update(conversations)
    .set({ context: { ...context, pendingRelayThreadId: undefined }, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));

  await sendText(agency.phone, "¡Gracias! Se la reenviamos al comprador.");
}
