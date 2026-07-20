import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, conversations, proposals, searches } from "@/db/schema";
import { normalizeProposal } from "./llm";
import { sendText } from "./whatsapp";
import { normalizeWords } from "./text";
import { computeMatchScore } from "./matching";

type AgencyConversationContext = {
  activeSearchId?: string;
};

const PASS_WORDS = new Set(["paso", "no", "nada", "gracias"]);

function isPass(text: string): boolean {
  const words = new Set(normalizeWords(text));
  return [...words].some((w) => PASS_WORDS.has(w));
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

/** Manda la ficha anónima de una búsqueda a una inmobiliaria y la deja "esperando propuesta". */
export async function notifyAgencyOfSearch(agencyId: string, searchId: string): Promise<void> {
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, agencyId)).limit(1);
  const [search] = await db.select().from(searches).where(eq(searches.id, searchId)).limit(1);
  if (!agency || !search) return;

  const isAlquiler = search.operation === "alquiler";
  const lines = [
    `Che, tenemos un comprador activo en tu zona que busca ${isAlquiler ? "ALQUILAR" : "COMPRAR"}:`,
    `- Zona: ${search.zones.join(", ") || "sin especificar"}`,
    isAlquiler
      ? `- Presupuesto: hasta USD ${search.budgetUsdMax?.toLocaleString("es-AR") ?? "sin especificar"} de alquiler mensual`
      : `- Presupuesto: hasta USD ${search.budgetUsdMax?.toLocaleString("es-AR") ?? "sin especificar"}`,
  ];
  if (!isAlquiler) {
    lines.push(`- Forma de pago: ${search.paymentMethod ?? "sin especificar"}`);
  }
  if (search.mustHaves.length > 0) {
    lines.push(`- Busca: ${search.mustHaves.join(", ")}`);
  }
  lines.push(
    "",
    "Si tenés algo que le pueda interesar, contanos: precio, m², ambientes, zona aproximada y características. Si no tenés nada, respondé \"paso\"."
  );

  await sendText(agency.phone, lines.join("\n"));

  const conversation = await getOrCreateAgencyConversation(agency.phone);
  await db
    .update(conversations)
    .set({
      state: "PROPOSING",
      context: { activeSearchId: search.id } satisfies AgencyConversationContext,
      updatedAt: new Date(),
    })
    .where(eq(conversations.id, conversation.id));
}

/** Punto de entrada para mensajes entrantes de inmobiliarias (spec sección 5.2). */
export async function handleAgencyMessage(phone: string, text: string): Promise<void> {
  const conversation = await getOrCreateAgencyConversation(phone);
  const context = (conversation.context ?? {}) as AgencyConversationContext;

  if (!context.activeSearchId) {
    await sendText(
      phone,
      "Por ahora no tenemos una búsqueda activa esperando respuesta tuya. Te avisamos apenas haya una en tu zona."
    );
    return;
  }

  const [search] = await db
    .select()
    .from(searches)
    .where(eq(searches.id, context.activeSearchId))
    .limit(1);

  if (!search || search.status !== "active") {
    await db
      .update(conversations)
      .set({ state: "ONBOARDED", context: {}, updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));
    await sendText(phone, "Esa búsqueda ya no está activa, gracias igual. Te avisamos con la próxima.");
    return;
  }

  if (isPass(text)) {
    await db
      .update(conversations)
      .set({ state: "ONBOARDED", context: {}, updatedAt: new Date() })
      .where(eq(conversations.id, conversation.id));
    await sendText(phone, "Dale, gracias por avisar. Te contactamos con la próxima búsqueda en tu zona.");
    return;
  }

  const [agency] = await db.select().from(agencies).where(eq(agencies.phone, phone)).limit(1);
  if (!agency) return;

  const normalized = await normalizeProposal(text, {
    agencyZones: agency.zones,
    searchZones: search.zones,
    operation: search.operation === "alquiler" ? "alquiler" : "venta",
  });

  if (!normalized) {
    console.error(
      `[agency-conversation] no se pudo normalizar la propuesta de ${phone}: ANTHROPIC_API_KEY no configurada o el modelo no devolvió una salida válida.`
    );
    await sendText(
      phone,
      "Uy, tuvimos un problema técnico procesando tu propuesta. Probá de nuevo en un rato."
    );
    return;
  }

  const attributes = Object.fromEntries((normalized.attributes ?? []).map((a) => [a, true]));

  const matchScore = computeMatchScore(
    { zones: search.zones, budgetUsdMax: search.budgetUsdMax, mustHaves: search.mustHaves },
    { zoneLabel: normalized.zone_label, priceUsd: normalized.price_usd, attributes }
  );

  await db.insert(proposals).values({
    searchId: search.id,
    agencyId: agency.id,
    status: "pending_review",
    priceUsd: normalized.price_usd,
    areaM2: normalized.area_m2,
    rooms: normalized.rooms,
    zoneLabel: normalized.zone_label,
    attributes,
    description: normalized.description,
    photos: [],
    sourceRaw: { text },
    matchScore,
  });

  await db
    .update(conversations)
    .set({ state: "ONBOARDED", context: {}, updatedAt: new Date() })
    .where(eq(conversations.id, conversation.id));

  await sendText(
    phone,
    "¡Gracias! La recibimos y la estamos revisando. Te avisamos cuando quede publicada."
  );
}
