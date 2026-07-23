import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db";
import { agencies, conversations, proposals, searches, waMessages } from "@/db/schema";
import { normalizeProposal, detectContactInfoInImage } from "./llm";
import { sendText, sendTemplate, downloadMedia } from "./whatsapp";
import { uploadMedia } from "./storage";
import { normalizeWords, formatMoney } from "./text";
import { computeMatchScore } from "./matching";
import { handleAgencyRelayAnswer } from "./relay";
import { handleAgencyVisitDateReply } from "./visits";

type AgencyConversationContext = {
  activeSearchId?: string;
  pendingRelayThreadId?: string;
  pendingVisitId?: string;
};

const PHOTO_LOOKBACK_MINUTES = 30;
const MAX_PHOTOS_PER_PROPOSAL = 6;

/**
 * Junta las fotos que la inmobiliaria mandó sueltas (sin caption) junto con
 * el mensaje que sí trae el texto de la propuesta — WhatsApp no agrupa un
 * envío de varias imágenes en un solo mensaje, cada una llega como un evento
 * separado, así que las asociamos por "misma inmobiliaria, últimos N
 * minutos" en vez de por un ID de grupo que la API no expone.
 */
async function collectRecentImageIds(phone: string): Promise<string[]> {
  const since = new Date(Date.now() - PHOTO_LOOKBACK_MINUTES * 60 * 1000);
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
    .orderBy(waMessages.createdAt);

  return rows
    .map((r) => (r.payload as { image?: { id?: string } } | null)?.image?.id)
    .filter((id): id is string => Boolean(id))
    .slice(0, MAX_PHOTOS_PER_PROPOSAL);
}

/**
 * Descarga y sube cada foto; una foto que falla se descarta y no bloquea el
 * resto — son un nice-to-have, no el dato crítico de la propuesta. De paso
 * le pide a un LLM de visión que chequee si la foto muestra un dato de
 * contacto (cartel, marca de agua) — no lo edita, solo junta avisos para
 * que el admin los vea antes de publicar.
 */
async function downloadAndStorePhotos(mediaIds: string[]): Promise<{ urls: string[]; warnings: string[] }> {
  const urls: string[] = [];
  const warnings: string[] = [];
  for (const mediaId of mediaIds) {
    try {
      const media = await downloadMedia(mediaId);
      if (!media) continue;
      const url = await uploadMedia(media.buffer, media.contentType, `proposals/${mediaId}`);
      urls.push(url);

      const warning = await detectContactInfoInImage(media.buffer, media.contentType);
      if (warning) warnings.push(warning);
    } catch (err) {
      console.error(`[agency-conversation] no se pudo procesar la foto ${mediaId}:`, err);
    }
  }
  return { urls, warnings };
}

const PASS_WORDS = new Set(["paso", "no", "nada", "gracias"]);
// Un mensaje largo con "paso"/"no" sueltos (ej. "te paso este depto...",
// "no tiene cochera pero...") es casi siempre una propuesta real, no un
// rechazo — el rechazo real es corto ("paso", "no tengo nada").
const PASS_MAX_WORDS = 6;

function isPass(text: string): boolean {
  const words = normalizeWords(text);
  if (words.length === 0 || words.length > PASS_MAX_WORDS) return false;
  return words.some((w) => PASS_WORDS.has(w));
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
  const zona = search.zones.join(", ") || "sin especificar";
  const presupuesto = isAlquiler
    ? `${formatMoney(search.budgetMax, search.operation)} de alquiler mensual`
    : formatMoney(search.budgetMax, search.operation);
  const extraParts: string[] = [];
  if (!isAlquiler) {
    extraParts.push(`Forma de pago: ${search.paymentMethod ?? "sin especificar"}.`);
  }
  if (search.mustHaves.length > 0) {
    extraParts.push(`Busca: ${search.mustHaves.join(", ")}.`);
  }
  const extra = extraParts.length > 0 ? extraParts.join(" ") : "Sin datos adicionales.";

  await sendTemplate(agency.phone, "visitalo_ficha_busqueda", "es_AR", [
    {
      type: "body",
      parameters: [
        { type: "text", text: isAlquiler ? "alquilar" : "comprar" },
        { type: "text", text: zona },
        { type: "text", text: presupuesto },
        { type: "text", text: extra },
      ],
    },
  ]);

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

  if (context.pendingRelayThreadId) {
    await handleAgencyRelayAnswer(conversation.id, context, text);
    return;
  }

  if (context.pendingVisitId) {
    await handleAgencyVisitDateReply(conversation.id, context, text);
    return;
  }

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

  const hasContent =
    normalized.price != null ||
    normalized.area_m2 != null ||
    normalized.rooms != null ||
    normalized.zone_label != null ||
    (normalized.attributes?.length ?? 0) > 0 ||
    Boolean(normalized.description?.trim());

  if (!hasContent) {
    // Mensaje sin datos de propiedad (ej. "hola", solo fotos sin caption) —
    // no creamos una propuesta vacía, le pedimos que cuente algo concreto.
    await sendText(
      phone,
      "Contame algo de la propiedad (precio, m², ambientes, zona) para poder armar la ficha. Si no tenés nada, respondé \"paso\"."
    );
    return;
  }

  const attributes = Object.fromEntries((normalized.attributes ?? []).map((a) => [a, true]));

  const matchScore = computeMatchScore(
    { zones: search.zones, budgetMax: search.budgetMax, mustHaves: search.mustHaves },
    { zoneLabel: normalized.zone_label, price: normalized.price, attributes }
  );

  const recentImageIds = await collectRecentImageIds(phone);
  const { urls: photos, warnings: photoWarnings } = await downloadAndStorePhotos(recentImageIds);

  await db.insert(proposals).values({
    searchId: search.id,
    agencyId: agency.id,
    status: "pending_review",
    price: normalized.price,
    areaM2: normalized.area_m2,
    rooms: normalized.rooms,
    zoneLabel: normalized.zone_label,
    attributes,
    description: normalized.description,
    photos,
    photoWarning: photoWarnings.length > 0 ? photoWarnings.join(" | ") : null,
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
