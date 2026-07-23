import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { agencies, buyers, conversations, proposals, searches, visits } from "@/db/schema";
import { parseVisitDateTimes, parseVisitOptionChoice } from "./llm";
import { sendText } from "./whatsapp";
import { parseYesNo, normalizeWords, formatMoney } from "./text";
import { enqueueJob } from "./queue";

/**
 * Módulo hoja: no importa conversation.ts ni agency-conversation.ts para
 * evitar ciclos (mismo motivo por el que queue.ts/job-handlers.ts están
 * separados). Por eso duplica el getOrCreate de conversación de cada lado.
 */
type AgencyConversationContext = Record<string, unknown> & {
  pendingVisitId?: string;
};

type BuyerConversationContext = Record<string, unknown> & {
  pendingVisitId?: string;
  pendingVisitOptions?: string[];
};

const FOLLOWUP_DELAY_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_VISIT_OPTIONS = 3;
const NONE_WORDS = new Set(["ninguna", "ninguno", "ningun"]);

function isNoneOfTheOptions(text: string): boolean {
  if (parseYesNo(text) === "no") return true;
  const words = new Set(normalizeWords(text));
  return [...NONE_WORDS].some((w) => words.has(w));
}

function formatVisitOptionsList(dates: Date[]): string {
  return dates.map((d, i) => `${i + 1}) ${formatVisitDateTime(d)}`).join("\n");
}

async function getVisitDetails(visitId: string) {
  const [visit] = await db.select().from(visits).where(eq(visits.id, visitId)).limit(1);
  if (!visit) return null;

  const [proposal] = await db.select().from(proposals).where(eq(proposals.id, visit.proposalId)).limit(1);
  if (!proposal) return null;

  const [agency] = await db.select().from(agencies).where(eq(agencies.id, proposal.agencyId)).limit(1);
  const [search] = await db.select().from(searches).where(eq(searches.id, proposal.searchId)).limit(1);
  if (!agency || !search) return null;

  const [buyer] = await db.select().from(buyers).where(eq(buyers.id, search.buyerId)).limit(1);
  if (!buyer) return null;

  return { visit, proposal, agency, search, buyer };
}

function formatVisitDateTime(date: Date): string {
  return date.toLocaleString("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
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

async function getOrCreateBuyerConversation(phone: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.phone, phone), eq(conversations.actorType, "buyer")))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ phone, actorType: "buyer", state: "ACTIVE", context: {} })
    .returning();
  return created;
}

/** Notifica a la inmobiliaria que un comprador pidió coordinar una visita, si todavía tiene crédito disponible. */
export async function notifyAgencyOfVisitRequest(visitId: string): Promise<void> {
  const details = await getVisitDetails(visitId);
  if (!details) return;
  const { agency, proposal, search, buyer } = details;

  const available = agency.creditsFree - agency.creditsUsed;
  if (available <= 0) {
    await db.update(visits).set({ status: "cancelled" }).where(eq(visits.id, visitId));
    await sendText(
      buyer.phone,
      "La inmobiliaria llegó a su límite de visitas por ahora, así que no podemos coordinar esta. Te avisamos si se libera lugar."
    );
    return;
  }

  await sendText(
    agency.phone,
    `Un comprador pidió coordinar una visita a la propiedad en ${proposal.zoneLabel ?? "tu zona"} (${formatMoney(proposal.price, search.operation)}).\n\n¿Qué días y horarios te quedarían bien? Si podés, pasame 2 o 3 opciones para que el comprador elija.`
  );

  const conversation = await getOrCreateAgencyConversation(agency.phone);
  const context = (conversation.context ?? {}) as AgencyConversationContext;
  await db
    .update(conversations)
    .set({
      context: { ...context, pendingVisitId: visitId },
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversation.id));
}

/** Recibe la fecha/horario que propone la inmobiliaria y se la manda al comprador para que confirme. */
export async function handleAgencyVisitDateReply(
  conversationId: string,
  context: AgencyConversationContext,
  text: string
): Promise<void> {
  const visitId = context.pendingVisitId;
  if (!visitId) return;

  const details = await getVisitDetails(visitId);
  if (!details || details.visit.status !== "requested") {
    await db
      .update(conversations)
      .set({ context: { ...context, pendingVisitId: undefined }, updatedAt: new Date() })
      .where(eq(conversations.id, conversationId));
    return;
  }
  const { visit, agency, buyer } = details;

  const options = (await parseVisitDateTimes(text, new Date())).slice(0, MAX_VISIT_OPTIONS);
  if (options.length === 0) {
    await sendText(
      agency.phone,
      'No entendí bien la fecha, ¿podés escribirla de nuevo? Ej: "jueves 15hs" (podés pasar más de una opción).'
    );
    return;
  }

  await sendText(
    buyer.phone,
    `La inmobiliaria puede estos días para visitar la propiedad:\n${formatVisitOptionsList(options)}\n\nRespondé con el número que te sirva, o "ninguna" si no te queda ninguna.`
  );

  const buyerConversation = await getOrCreateBuyerConversation(buyer.phone);
  const buyerContext = (buyerConversation.context ?? {}) as BuyerConversationContext;
  await db
    .update(conversations)
    .set({
      context: {
        ...buyerContext,
        pendingVisitId: visit.id,
        pendingVisitOptions: options.map((d) => d.toISOString()),
      },
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, buyerConversation.id));

  await db
    .update(conversations)
    .set({ context: { ...context, pendingVisitId: undefined }, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

/** Recibe la elección (o rechazo) del comprador entre las opciones de horario; si elige una, cobra el crédito y hace el intercambio de contacto. */
export async function handleBuyerVisitConfirmReply(
  conversationId: string,
  context: BuyerConversationContext,
  phone: string,
  text: string
): Promise<void> {
  const visitId = context.pendingVisitId;
  if (!visitId) return;

  const optionIsos = context.pendingVisitOptions ?? [];
  const details = await getVisitDetails(visitId);
  if (!details || details.visit.status !== "requested" || optionIsos.length === 0) {
    await db
      .update(conversations)
      .set({
        context: { ...context, pendingVisitId: undefined, pendingVisitOptions: undefined },
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));
    return;
  }
  const { visit, agency, buyer } = details;
  const options = optionIsos.map((iso) => new Date(iso));

  if (isNoneOfTheOptions(text)) {
    await db.update(visits).set({ status: "cancelled" }).where(eq(visits.id, visit.id));
    await sendText(phone, "Dale, no hay problema. Le avisamos a la inmobiliaria para que proponga otros horarios.");
    await sendText(
      agency.phone,
      "Ninguno de esos horarios le sirve al comprador. Si tenés otras opciones, proponé de nuevo."
    );
    await db
      .update(conversations)
      .set({
        context: { ...context, pendingVisitId: undefined, pendingVisitOptions: undefined },
        updatedAt: new Date(),
      })
      .where(eq(conversations.id, conversationId));
    return;
  }

  const chosenIndex = await parseVisitOptionChoice(
    text,
    options.map((d) => formatVisitDateTime(d))
  );
  if (chosenIndex === null) {
    await sendText(
      phone,
      `Respondé con el número de la opción que te sirva (1 a ${options.length}), o "ninguna" si no te queda ninguna.`
    );
    return;
  }

  const scheduledAt = options[chosenIndex - 1];
  await db.update(visits).set({ scheduledAt }).where(eq(visits.id, visit.id));

  await db
    .update(agencies)
    .set({ creditsUsed: sql`${agencies.creditsUsed} + 1` })
    .where(eq(agencies.id, agency.id));

  await db.update(visits).set({ status: "confirmed", creditCharged: true }).where(eq(visits.id, visit.id));

  const agencyContact = agency.contactName ? `${agency.name} (${agency.contactName})` : agency.name;
  await sendText(
    phone,
    `¡Visita confirmada para el ${formatVisitDateTime(scheduledAt)}! Coordiná los detalles finales directo con la inmobiliaria: ${agencyContact} — ${agency.phone}`
  );
  await sendText(
    agency.phone,
    `¡Visita confirmada para el ${formatVisitDateTime(scheduledAt)}! Coordiná los detalles finales directo con el comprador: ${buyer.phone}`
  );

  await enqueueJob("visit.followup", { visitId: visit.id }, new Date(Date.now() + FOLLOWUP_DELAY_MS));

  await db
    .update(conversations)
    .set({
      context: { ...context, pendingVisitId: undefined, pendingVisitOptions: undefined },
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversationId));
}

/** Sigue a los 3 días de una visita confirmada, para saber si al comprador le interesó la propiedad. */
export async function sendVisitFollowup(visitId: string): Promise<void> {
  const details = await getVisitDetails(visitId);
  if (!details || details.visit.status !== "confirmed") return;

  await sendText(
    details.buyer.phone,
    "¿Cómo te fue en la visita? Contanos si te interesa avanzar con la propiedad o si seguís buscando."
  );
}
