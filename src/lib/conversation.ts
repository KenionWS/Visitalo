import { randomBytes } from "crypto";
import { eq, and } from "drizzle-orm";
import { db } from "@/db";
import { buyers, conversations, searches } from "@/db/schema";
import { extractSearchFields, type SearchFields } from "./llm";
import { sendText } from "./whatsapp";

type ConversationContext = {
  searchId?: string;
  questionsAsked?: number;
};

type SearchRow = typeof searches.$inferSelect;

const CONFIRM_WORDS = new Set([
  "si",
  "sí",
  "dale",
  "ok",
  "okay",
  "okey",
  "confirmo",
  "correcto",
  "listo",
  "joya",
  "exacto",
  "afirmativo",
]);

const REJECT_WORDS = new Set(["no", "nel", "incorrecto", "cambiar", "corregir"]);

const MAX_QUALIFYING_QUESTIONS = 4;

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // sin acentos, para matchear "si"/"si" parejo
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

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
    property_type: search.propertyType,
    zones: search.zones.length > 0 ? search.zones : null,
    budget_usd_max: search.budgetUsdMax,
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
      propertyType: extracted.property_type ?? search.propertyType,
      zones: mergeStringArray(search.zones, extracted.zones),
      budgetUsdMax: extracted.budget_usd_max ?? search.budgetUsdMax,
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

function nextQuestion(search: SearchRow): string | null {
  if (search.zones.length === 0) {
    return "¿En qué zona o barrios de CABA estás buscando?";
  }
  if (!search.budgetUsdMax) {
    return "¿Cuál es tu presupuesto máximo, en dólares?";
  }
  if (!search.paymentMethod) {
    return "¿Cómo la pensás pagar: contado, crédito o una combinación de las dos?";
  }
  if (search.paymentMethod !== "contado" && search.hasPreapproval === null) {
    return "¿Ya tenés el crédito preaprobado?";
  }
  if (search.paymentMethod !== "contado" && search.hasPreapproval && !search.preapprovalBank) {
    return "¿Con qué banco?";
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
  const lines = [
    "Che, confirmame que esta es tu búsqueda:",
    `- Zona: ${search.zones.join(", ") || "sin especificar"}`,
    `- Presupuesto: hasta USD ${search.budgetUsdMax?.toLocaleString("es-AR") ?? "sin especificar"}`,
    `- Forma de pago: ${paymentMethodLabel(search.paymentMethod)}`,
  ];
  if (search.paymentMethod !== "contado" && search.hasPreapproval) {
    lines.push(`- Crédito preaprobado: sí (${search.preapprovalBank ?? "banco sin especificar"})`);
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

async function handleQualifying(
  conversationId: string,
  context: ConversationContext,
  search: SearchRow,
  phone: string,
  text: string
) {
  const extracted = await extractSearchFields(text, shapeKnownFields(search));

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
  const question = nextQuestion(updatedSearch);
  const questionsAsked = context.questionsAsked ?? 0;

  if (question && questionsAsked < MAX_QUALIFYING_QUESTIONS) {
    await setConversationState(conversationId, "QUALIFYING", {
      ...context,
      questionsAsked: questionsAsked + 1,
    });
    await sendText(phone, question);
    return;
  }

  await setConversationState(conversationId, "CONFIRMING", context);
  await sendText(phone, buildSummary(updatedSearch));
}

async function handleConfirming(
  conversationId: string,
  context: ConversationContext,
  search: SearchRow,
  phone: string,
  text: string
) {
  const words = new Set(normalize(text));
  const hasConfirm = [...words].some((w) => CONFIRM_WORDS.has(w));
  const hasReject = [...words].some((w) => REJECT_WORDS.has(w));

  if (hasConfirm && !hasReject) {
    const [activated] = await db
      .update(searches)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(searches.id, search.id))
      .returning();
    await setConversationState(conversationId, "ACTIVE", context);
    await sendText(
      phone,
      `Listo, tu búsqueda ya está activa. Vamos a avisarte apenas tengamos propuestas.\n\nMirá tu shortlist acá: ${shortlistUrl(activated.shortlistToken)}`
    );
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

/**
 * Punto de entrada de la máquina de estados del comprador (spec sección 5.1):
 * NEW/QUALIFYING → CONFIRMING → ACTIVE.
 */
export async function handleBuyerMessage(phone: string, text: string): Promise<void> {
  const buyer = await getOrCreateBuyer(phone);
  const conversation = await getOrCreateConversation(phone);
  const context = (conversation.context ?? {}) as ConversationContext;

  let search = context.searchId ? await getSearchById(context.searchId) : null;
  if (!search) {
    search = await createDraftSearch(buyer.id);
    context.searchId = search.id;
    // Persistimos el searchId ya mismo: si algo más abajo falla (ej. no hay
    // ANTHROPIC_API_KEY), el próximo mensaje tiene que reusar esta búsqueda
    // draft en vez de crear una nueva.
    await setConversationState(conversation.id, conversation.state, context);
  }

  switch (conversation.state) {
    case "NEW":
    case "QUALIFYING":
      await handleQualifying(conversation.id, context, search, phone, text);
      break;
    case "CONFIRMING":
      await handleConfirming(conversation.id, context, search, phone, text);
      break;
    case "ACTIVE":
      await handleActive(search, phone);
      break;
    default:
      console.log(`[conversation] estado no manejado todavía: ${conversation.state}`);
  }
}
