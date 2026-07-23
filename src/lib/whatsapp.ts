/**
 * Envío de mensajes por WhatsApp Cloud API.
 *
 * Mientras no haya credenciales de Meta configuradas (WHATSAPP_TOKEN /
 * WHATSAPP_PHONE_NUMBER_ID), estas funciones no fallan: loguean el mensaje
 * que hubiesen enviado y devuelven un resultado simulado. Así el resto del
 * sistema (webhook, jobs) se puede probar en local sin cuenta de Meta.
 */

import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { waMessages } from "@/db/schema";

const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";

/**
 * Los números de Argentina llegan de Meta con un "9" extra después del "54"
 * (ej. 5491155050171, formato que usa WhatsApp para IDENTIFICAR el número).
 * Pero para ENVIAR hay que sacarle ese "9" (541155050171) — si no, la Graph
 * API lo rechaza como destinatario no autorizado aunque esté verificado.
 * Como guardamos los teléfonos tal como llegan en los mensajes entrantes
 * (con el "9"), hay que normalizarlos acá antes de mandar.
 */
function toSendablePhone(phone: string): string {
  if (/^549\d{10}$/.test(phone)) {
    return `54${phone.slice(3)}`;
  }
  return phone;
}

type SendResult =
  | { ok: true; simulated: true; to: string; body: unknown }
  | { ok: true; simulated: false; wamid: string | null; raw: unknown };

function isConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

/**
 * Tira una excepción real ante cualquier falla de la Graph API — antes
 * devolvía un objeto {ok:false} que casi ningún llamador chequeaba, así que
 * los envíos fallidos quedaban invisibles y el job se marcaba "listo" igual.
 * Ahora un fallo acá hace que el job falle/reintente de verdad.
 */
async function callGraphApi(body: Record<string, unknown>): Promise<SendResult> {
  if (!isConfigured()) {
    console.warn(
      "[whatsapp] WHATSAPP_TOKEN / WHATSAPP_PHONE_NUMBER_ID no configurados. Simulando envío:",
      JSON.stringify(body)
    );
    return { ok: true, simulated: true, to: String(body.to), body };
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...body }),
  });

  const json = await res.json();

  if (!res.ok) {
    console.error("[whatsapp] Error enviando mensaje:", json);
    throw new Error(`Graph API respondió ${res.status}: ${JSON.stringify(json?.error ?? json)}`);
  }

  const wamid = json?.messages?.[0]?.id ?? null;

  // Registro de auditoría de lo que realmente se mandó — antes solo
  // logueábamos entrantes y los status callbacks de Meta, nunca el
  // contenido saliente real, lo que hacía imposible diferenciar "no se
  // mandó" de "se mandó pero no llegó".
  if (wamid) {
    try {
      await db
        .insert(waMessages)
        .values({
          wamid,
          phone: String(body.to),
          direction: "out",
          type: String(body.type),
          payload: { sent: body, response: json },
        })
        .onConflictDoNothing({ target: waMessages.wamid });
    } catch (err) {
      console.error("[whatsapp] no se pudo registrar el mensaje saliente:", err);
    }
  }

  return {
    ok: true,
    simulated: false,
    wamid,
    raw: json,
  };
}

/**
 * Baja un adjunto (ej. una foto) a partir de su media ID (spec: la Graph API
 * resuelve el ID a una URL firmada de corta duración, después hay que
 * pedirla con el mismo Bearer token). Devuelve null en modo simulado o si
 * falla cualquiera de los dos pasos — el llamador decide si eso bloquea o
 * no el resto del flujo.
 */
export async function downloadMedia(
  mediaId: string
): Promise<{ buffer: Buffer; contentType: string } | null> {
  if (!isConfigured()) {
    console.warn(`[whatsapp] WHATSAPP_TOKEN no configurado. No se puede descargar el media ${mediaId}.`);
    return null;
  }

  const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_API_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!metaRes.ok) {
    console.error(`[whatsapp] Error obteniendo metadata del media ${mediaId}:`, await metaRes.text());
    return null;
  }
  const meta = (await metaRes.json()) as { url?: string; mime_type?: string };
  if (!meta.url) return null;

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}` },
  });
  if (!fileRes.ok) {
    console.error(`[whatsapp] Error descargando el archivo del media ${mediaId}:`, await fileRes.text());
    return null;
  }

  const arrayBuffer = await fileRes.arrayBuffer();
  return { buffer: Buffer.from(arrayBuffer), contentType: meta.mime_type ?? "application/octet-stream" };
}

/** Envía un mensaje de texto libre. Solo válido dentro de la ventana de 24 hs. */
export async function sendText(phone: string, text: string): Promise<SendResult> {
  return callGraphApi({
    to: toSendablePhone(phone),
    type: "text",
    text: { body: text, preview_url: false },
  });
}

type TemplateComponent = {
  type: "header" | "body" | "button";
  parameters: Array<{ type: "text"; text: string }>;
};

/**
 * Envía un template pre-aprobado por Meta (necesario para iniciar
 * conversación fuera de la ventana de 24 hs, o para notificaciones
 * transaccionales categoría "utility").
 */
export async function sendTemplate(
  phone: string,
  templateName: string,
  languageCode = "es_AR",
  components: TemplateComponent[] = []
): Promise<SendResult> {
  return callGraphApi({
    to: toSendablePhone(phone),
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}

const SESSION_WINDOW_HOURS = 24;

async function hasRecentInbound(phone: string): Promise<boolean> {
  const cutoff = new Date(Date.now() - SESSION_WINDOW_HOURS * 60 * 60 * 1000);
  const [last] = await db
    .select({ createdAt: waMessages.createdAt })
    .from(waMessages)
    .where(and(eq(waMessages.phone, phone), eq(waMessages.direction, "in")))
    .orderBy(desc(waMessages.createdAt))
    .limit(1);
  return Boolean(last && last.createdAt > cutoff);
}

/**
 * Manda como mensaje de sesión (sin costo) si el destinatario nos escribió
 * en las últimas 24 hs; si no, cae al template pre-aprobado (tiene costo
 * por Meta, pero es el único que funciona fuera de esa ventana). Para
 * cualquier aviso proactivo donde no sabemos de antemano si sigue "abierta"
 * la ventana con ese número.
 */
export async function sendTextOrTemplate(
  phone: string,
  text: string,
  templateName: string,
  templateComponents: TemplateComponent[] = [],
  languageCode = "es_AR"
): Promise<SendResult> {
  if (await hasRecentInbound(phone)) {
    return sendText(phone, text);
  }
  return sendTemplate(phone, templateName, languageCode, templateComponents);
}
