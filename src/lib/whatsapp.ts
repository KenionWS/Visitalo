/**
 * Envío de mensajes por WhatsApp Cloud API.
 *
 * Mientras no haya credenciales de Meta configuradas (WHATSAPP_TOKEN /
 * WHATSAPP_PHONE_NUMBER_ID), estas funciones no fallan: loguean el mensaje
 * que hubiesen enviado y devuelven un resultado simulado. Así el resto del
 * sistema (webhook, jobs) se puede probar en local sin cuenta de Meta.
 */

const GRAPH_API_VERSION = process.env.WHATSAPP_API_VERSION ?? "v21.0";

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
    to: phone,
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
    to: phone,
    type: "template",
    template: {
      name: templateName,
      language: { code: languageCode },
      ...(components.length > 0 ? { components } : {}),
    },
  });
}
