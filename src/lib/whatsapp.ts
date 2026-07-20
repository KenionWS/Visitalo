/**
 * Envío de mensajes por WhatsApp Cloud API.
 *
 * Mientras no haya credenciales de Meta configuradas (WHATSAPP_TOKEN /
 * WHATSAPP_PHONE_NUMBER_ID), estas funciones no fallan: loguean el mensaje
 * que hubiesen enviado y devuelven un resultado simulado. Así el resto del
 * sistema (webhook, jobs) se puede probar en local sin cuenta de Meta.
 */

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
  | { ok: true; simulated: false; wamid: string | null; raw: unknown }
  | { ok: false; error: string; raw?: unknown };

function isConfigured(): boolean {
  return Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

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
    return { ok: false, error: `Graph API respondió ${res.status}`, raw: json };
  }

  return {
    ok: true,
    simulated: false,
    wamid: json?.messages?.[0]?.id ?? null,
    raw: json,
  };
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
