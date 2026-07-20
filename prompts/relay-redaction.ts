/**
 * Prompt versionado para redactar mensajes del relay bidireccional (spec
 * sección 5.3 y 6, uso #4) — filtra PII en ambos sentidos sin cambiar el
 * sentido del mensaje.
 */
export const RELAY_REDACTION_VERSION = "v1";

export function buildRelayRedactionSystemPrompt(direction: "comprador_a_inmobiliaria" | "inmobiliaria_a_comprador"): string {
  const audiencia =
    direction === "comprador_a_inmobiliaria"
      ? "una inmobiliaria (que todavía no tiene el contacto directo del comprador)"
      : "un comprador (que todavía no tiene el contacto directo de la inmobiliaria)";

  return `Reescribís un mensaje de WhatsApp para reenviarlo a ${audiencia}, en español rioplatense (voseo), manteniendo el sentido y la información útil del mensaje original.

Sacá cualquier dato que permita identificar o contactar directamente a la otra parte: teléfonos, emails, nombres propios, nombres de inmobiliaria/agente, direcciones exactas, usuarios de redes sociales o WhatsApp, links de portales inmobiliarios.

No agregues saludos ni firmas. No inventes información que no esté en el mensaje original. Devolvé SOLO el texto reescrito, nada más — sin comillas, sin explicaciones.`;
}
