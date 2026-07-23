import { randomBytes } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { buyers, conversations, searches } from "@/db/schema";
import { extractSearchFields, type SearchFields } from "./llm";
import { sendText, sendTextOrTemplate } from "./whatsapp";
import { parseYesNo, formatMoney } from "./text";
import { enqueueJob } from "./queue";
import { handleBuyerVisitConfirmReply } from "./visits";

export type ConversationContext = {
  searchId?: string;
  questionsAsked?: number;
  pendingField?: string;
  pendingQuestion?: string;
  pendingVisitId?: string;
  pendingVisitOptions?: string[];
  pendingMarketingOptIn?: boolean;
};

type SearchRow = typeof searches.$inferSelect;
type BuyerRow = typeof buyers.$inferSelect;

const MAX_QUALIFYING_QUESTIONS = 4;

async function getOrCreateBuyer(phone: string) {
  const [existing] = await db.select().from(buyers).where(eq(buyers.phone, phone)).limit(1);
  if (existing) return existing;

  const [created] = await db.insert(buyers).values({ phone }).returning();
  return created;
}

async function getOrCreateConversation(phone: string) {
  const [existing] = await db
    .select()
    .from(conversations)
    .where(and(eq(conversations.phone, phone), eq(conversations.actorType, "buyer")))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(conversations)
    .values({ phone, actorType: "buyer", state: "NEW", context: {} })
    .returning();
  return created;
}

async function createDraftSearch(buyerId: string) {
  const [created] = await db
    .insert(searches)
    .values({
      buyerId,
      status: "draft",
      shortlistToken: randomBytes(20).toString("hex"),
    })
    .returning();
  return created;
}

async function getSearchById(id: string) {
  const [row] = await db.select().from(searches).where(eq(searches.id, id)).limit(1);
  return row ?? null;
}

function shapeKnownFields(search: SearchRow): Partial<SearchFields> {
  return {
    operation: search.operation === "venta" || search.operation === "alquiler" ? search.operation : null,
    property_type: search.propertyType,
    zones: search.zones.length > 0 ? search.zones : null,
    budget_max: search.budgetMax,
    payment_method: search.paymentMethod as SearchFields["payment_method"],
    has_preapproval: search.hasPreapproval,
    preapproval_bank: search.preapprovalBank,
    timeline: search.timeline,
    must_haves: search.mustHaves.length > 0 ? search.mustHaves : null,
  };
}

function mergeStringArray(existing: string[], extracted: string[] | null): string[] {
  if (!extracted || extracted.length === 0) return existing;
  const set = new Set(existing.map((v) => v.trim()));
  for (const v of extracted) set.add(v.trim());
  return Array.from(set);
}

async function applyExtractedFields(search: SearchRow, extracted: SearchFields): Promise<SearchRow> {
  const [updated] = await db
    .update(searches)
    .set({
      operation: extracted.operation ?? search.operation,
      propertyType: extracted.property_type ?? search.propertyType,
      zones: mergeStringArray(search.zones, extracted.zones),
      budgetMax: extracted.budget_max ?? search.budgetMax,
      paymentMethod: extracted.payment_method ?? search.paymentMethod,
      hasPreapproval: extracted.has_preapproval ?? search.hasPreapproval,
      preapprovalBank: extracted.preapproval_bank ?? search.preapprovalBank,
      timeline: extracted.timeline ?? search.timeline,
      mustHaves: mergeStringArray(search.mustHaves, extracted.must_haves),
      updatedAt: new Date(),
    })
    .where(eq(searches.id, search.id))
    .returning();
  return updated;
}

type PendingQuestion = { field: string; question: string };

function nextQuestion(search: SearchRow): PendingQuestion | null {
  if (search.operation !== "venta" && search.operation !== "alquiler") {
    return { field: "operation", question: "¿Buscás para comprar o para alquilar?" };
  }
  if (search.zones.length === 0) {
    return { field: "zones", question: "¿En qué zona o barrios de CABA estás buscando?" };
  }
  if (!search.budgetMax) {
    return search.operation === "alquiler"
      ? { field: "budget_max", question: "¿Cuál es tu presupuesto de alquiler mensual, en pesos?" }
      : { field: "budget_max", question: "¿Cuál es tu presupuesto máximo, en dólares?" };
  }
  if (search.operation === "alquiler") {
    return null; // en alquiler no preguntamos forma de pago ni crédito hipotecario
  }
  if (!search.paymentMethod) {
    return {
      field: "payment_method",
      question: "¿Cómo la pensás pagar: contado, crédito o una combinación de las dos?",
    };
  }
  if (search.paymentMethod !== "contado" && search.hasPreapproval === null) {
    return { field: "has_preapproval", question: "¿Ya tenés el crédito preaprobado?" };
  }
  if (search.paymentMethod !== "contado" && search.hasPreapproval && !search.preapprovalBank) {
    return { field: "preapproval_bank", question: "¿Con qué banco?" };
  }
  return null;
}

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case "contado":
      return "contado";
    case "credito":
      return "crédito";
    case "mixto":
      return "mixto (contado + crédito)";
    default:
      return "sin especificar";
  }
}

function buildSummary(search: SearchRow): string {
  const isAlquiler = search.operation === "alquiler";
  const lines = [
    "Buenísimo, así quedaría tu búsqueda:",
    `- Operación: ${isAlquiler ? "Alquiler" : "Compra"}`,
    `- Zona: ${search.zones.join(", ") || "sin especificar"}`,
    isAlquiler
      ? `- Presupuesto: hasta ${formatMoney(search.budgetMax, search.operation)} por mes`
      : `- Presupuesto: hasta ${formatMoney(search.budgetMax, search.operation)}`,
  ];
  if (!isAlquiler) {
    lines.push(`- Forma de pago: ${paymentMethodLabel(search.paymentMethod)}`);
    if (search.paymentMethod !== "contado" && search.hasPreapproval) {
      lines.push(`- Crédito preaprobado: sí (${search.preapprovalBank ?? "banco sin especificar"})`);
    }
  }
  if (search.mustHaves.length > 0) {
    lines.push(`- Imprescindibles: ${search.mustHaves.join(", ")}`);
  }
  lines.push("", "¿Confirmás? Respondé sí o no.");
  return lines.join("\n");
}

function shortlistUrl(token: string): string {
  const base = process.env.APP_URL ?? "http://localhost:3000";
  return `${base}/s/${token}`;
}

async function setConversationState(
  conversationId: string,
  state: string,
  context: ConversationContext
) {
  await db
    .update(conversations)
    .set({ state, context, updatedAt: new Date() })
    .where(eq(conversations.id, conversationId));
}

const GREETING =
  "¡Hola! ¿Cómo andás? Soy el asistente de Visitalo, te ayudo a encontrar tu próxima propiedad en CABA.";

function hasAnyInfo(search: SearchRow): boolean {
  return Boolean(
    search.operation || search.zones.length > 0 || search.propertyType || search.budgetMax
  );
}

async function handleQualifying(
  conversationId: string,
  context: ConversationContext,
  search: SearchRow,
  phone: string,
  text: string,
  isFirstTurn: boolean
) {
  const pending =
    context.pendingField && context.pendingQuestion
      ? { field: context.pendingField, question: context.pendingQuestion }
      : undefined;

  const extracted = await extractSearchFields(text, shapeKnownFields(search), pending);

  if (!extracted) {
    console.error(
      `[conversation] no se pudo extraer la ficha para ${phone}: ANTHROPIC_API_KEY no configurada o el modelo no devolvió una salida válida.`
    );
    await sendText(
      phone,
      "Uy, tuvimos un problema técnico para procesar tu mensaje. Probá de nuevo en un rato."
    );
    return;
  }

  const updatedSearch = await applyExtractedFields(search, extracted);

  // Si es el primer mensaje y todavía no contó nada (ej. solo saludó), no
  // arranquemos con la primera pregunta rígida — invitamos a que cuente con
  // sus palabras qué está buscando, como arrancaría la charla una persona.
  if (isFirstTurn && !hasAnyInfo(updatedSearch)) {
    await setConversationState(conversationId, "QUALIFYING", { ...context, questionsAsked: 0 });
    await sendText(
      phone,
      `${GREETING}\n\nContame, ¿qué estás buscando? Podés escribirme como si se lo contaras a una persona: zona, si comprás o alquilás, presupuesto, lo que tengas.`
    );
    return;
  }

  const question = nextQuestion(updatedSearch);
  const questionsAsked = context.questionsAsked ?? 0;

  if (question && questionsAsked < MAX_QUALIFYING_QUESTIONS) {
    // Mandamos primero y recién después movemos pendingField/pendingQuestion
    // hacia adelante: si el envío falla y el job reintenta, handleQualifying
    // se vuelve a llamar con el MISMO texto pero leyendo el context ya
    // actualizado — sin este orden, el reintento interpretaría la respuesta
    // del comprador como si contestara la pregunta siguiente, no la que
    // realmente contestó.
    await sendText(phone, isFirstTurn ? `${GREETING}\n\n${question.question}` : question.question);
    await setConversationState(conversationId, "QUALIFYING", {
      ...context,
      questionsAsked: questionsAsked + 1,
      pendingField: question.field,
      pendingQuestion: question.question,
    });
    return;
  }

  await sendText(phone, buildSummary(updatedSearch));
  await setConversationState(conversationId, "CONFIRMING", {
    ...context,
    pendingField: undefined,
    pendingQuestion: undefined,
  });
}

async function handleConfirming(
  conversationId: string,
  context: ConversationContext,
  search: SearchRow,
  buyer: BuyerRow,
  phone: string,
  text: string
) {
  if (parseYesNo(text) === "yes") {
    const [activated] = await db
      .update(searches)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(searches.id, search.id))
      .returning();

    // Encolamos el dispatch y pasamos a ACTIVE antes de mandar ningún
    // WhatsApp: si el envío falla y el job reintenta, handleBuyerMessage ya
    // enruta por estado ACTIVE (no vuelve a entrar acá) — evita reactivar la
    // búsqueda y, sobre todo, evita encolar distribution.dispatch dos veces
    // (que le mandaría la ficha duplicada a las inmobiliarias).
    await enqueueJob("distribution.dispatch", { searchId: activated.id });
    await setConversationState(conversationId, "ACTIVE", context);

    await sendText(
      phone,
      `Listo, tu búsqueda ya está activa. Vamos a avisarte apenas tengamos propuestas.\n\nMirá tu shortlist acá: ${shortlistUrl(activated.shortlistToken)}`
    );

    // Opt-in de marketing, una sola vez por comprador. Si este envío falla,
    // el reintento cae en handleActive (mensaje genérico) en vez de volver a
    // preguntar — perder la pregunta una vez es preferible a arriesgar que
    // se le atribuya como respuesta un mensaje que nunca vio.
    if (buyer.marketingOptIn === null) {
      await sendText(
        phone,
        "Una última cosa: para poder avisarte cuando tengamos novedades de propiedades que te puedan interesar, necesitamos tu consentimiento. ¿Nos das el ok? Respondé sí o no."
      );
      await setConversationState(conversationId, "ACTIVE", { ...context, pendingMarketingOptIn: true });
    }
    return;
  }

  // "no" explícito, o cualquier otra cosa: lo tratamos como corrección/info nueva
  // y volvemos a mostrar la ficha actualizada.
  const extracted = await extractSearchFields(text, shapeKnownFields(search));
  const updatedSearch = extracted ? await applyExtractedFields(search, extracted) : search;
  await setConversationState(conversationId, "CONFIRMING", context);
  await sendText(phone, buildSummary(updatedSearch));
}

async function handleActive(search: SearchRow, phone: string) {
  await sendText(
    phone,
    `Tu búsqueda ya está activa. Mirá las propuestas y gestioná todo desde acá: ${shortlistUrl(search.shortlistToken)}`
  );
}

/** Recibe la respuesta al opt-in de marketing (una sola vez por comprador, ver handleConfirming). */
async function handleMarketingOptInReply(
  conversationId: string,
  context: ConversationContext,
  search: SearchRow,
  buyerId: string,
  phone: string,
  text: string
) {
  const answer = parseYesNo(text);

  await db.update(buyers).set({ marketingOptIn: answer === "yes" }).where(eq(buyers.id, buyerId));
  await setConversationState(conversationId, "ACTIVE", { ...context, pendingMarketingOptIn: undefined });

  if (answer === "yes") {
    await sendText(phone, "¡Genial! Te vamos a avisar cuando tengamos novedades de propiedades para vos.");
    return;
  }
  if (answer === "no") {
    await sendText(phone, "Dale, no te vamos a escribir por este tema.");
    return;
  }

  // Ambiguo: no insistimos (para no trabar al comprador en un loop por algo
  // secundario) — guardamos que no optó y respondemos su mensaje como uno
  // normal en estado activo, por si en realidad estaba preguntando otra cosa.
  await handleActive(search, phone);
}

/** Avisa al comprador que tiene una propuesta nueva publicada en su shortlist. */
export async function notifyBuyerOfNewProposal(searchId: string): Promise<void> {
  const search = await getSearchById(searchId);
  if (!search) return;

  const [buyer] = await db.select().from(buyers).where(eq(buyers.id, search.buyerId)).limit(1);
  if (!buyer) return;

  const url = shortlistUrl(search.shortlistToken);
  await sendTextOrTemplate(
    buyer.phone,
    `Tenés una propuesta nueva para tu búsqueda. Mirala acá: ${url}`,
    "visitalo_nueva_propuesta",
    [{ type: "body", parameters: [{ type: "text", text: url }] }]
  );
}

/**
 * Punto de entrada de la máquina de estados del comprador (spec sección 5.1):
 * NEW/QUALIFYING → CONFIRMING → ACTIVE.
 */
export async function handleBuyerMessage(phone: string, text: string): Promise<void> {
  const buyer = await getOrCreateBuyer(phone);
  const conversation = await getOrCreateConversation(phone);
  const context = (conversation.context ?? {}) as ConversationContext;

  if (context.pendingVisitId) {
    await handleBuyerVisitConfirmReply(conversation.id, context, phone, text);
    return;
  }

  let search = context.searchId ? await getSearchById(context.searchId) : null;
  if (!search) {
    search = await createDraftSearch(buyer.id);
    context.searchId = search.id;
    // Persistimos el searchId ya mismo: si algo más abajo falla (ej. no hay
    // ANTHROPIC_API_KEY), el próximo mensaje tiene que reusar esta búsqueda
    // draft en vez de crear una nueva.
    await setConversationState(conversation.id, conversation.state, context);
  }

  if (context.pendingMarketingOptIn) {
    await handleMarketingOptInReply(conversation.id, context, search, buyer.id, phone, text);
    return;
  }

  const isFirstTurn = conversation.state === "NEW";

  switch (conversation.state) {
    case "NEW":
    case "QUALIFYING":
      await handleQualifying(conversation.id, context, search, phone, text, isFirstTurn);
      break;
    case "CONFIRMING":
      await handleConfirming(conversation.id, context, search, buyer, phone, text);
      break;
    case "ACTIVE":
      await handleActive(search, phone);
      break;
    default:
      console.log(`[conversation] estado no manejado todavía: ${conversation.state}`);
  }
}
