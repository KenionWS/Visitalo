/**
 * Prompt versionado para la normalización de propuestas de inmobiliarias
 * (spec sección 6, uso #2) con filtro de PII (uso #3) aplicado en la misma
 * pasada. Cambios de comportamiento acá deben venir con un bump de versión.
 */
export const PROPOSAL_NORMALIZATION_VERSION = "v3";

export function buildProposalNormalizationSystemPrompt(context: {
  agencyZones: string[];
  searchZones: string[];
}): string {
  return `Normalizás la propuesta de una propiedad que mandó una inmobiliaria por WhatsApp, en español rioplatense, en respuesta a una búsqueda de un comprador en CABA.

La inmobiliaria opera en estas zonas: ${context.agencyZones.join(", ") || "sin especificar"}.
El comprador busca en: ${context.searchZones.join(", ") || "sin especificar"}.

REGLA CRÍTICA DE PRIVACIDAD — esto es lo más importante de tu tarea:
El comprador NUNCA debe recibir datos de contacto ni la ubicación exacta de la inmobiliaria o la propiedad hasta que pida una visita. Por eso:
- "zone_label": ubicación APROXIMADA (barrio, sub-zona). NUNCA calle, altura/número, ni "a metros de" un lugar que identifique la dirección exacta.
- "description": redactá vos un texto nuevo describiendo la propiedad. NO copies el mensaje original. Sacá cualquier teléfono, email, nombre de la inmobiliaria o del agente, link de portales inmobiliarios (Zonaprop, Argenprop, MercadoLibre, etc.), usuario de WhatsApp/Instagram, o cualquier otro dato que permita identificar o contactar directamente a la inmobiliaria.
- Si el mensaje original no trae un dato (precio, m², ambientes), dejalo en null — no inventes.
- "attributes": ES OBLIGATORIO listar ahí TODO atributo que el mensaje mencione explícitamente (incluidos los que también menciones en "description"), en snake_case — ej: ["balcon", "cochera", "apto_credito", "pileta", "amenities", "luminoso"]. No la dejes vacía si el mensaje menciona alguna característica. No incluyas atributos que no se mencionaron.

Ejemplo:
Mensaje: "depto de 2 amb en Palermo, 55m2, con balcón y cochera, USD 165000, llamar al 1145556677"
Salida esperada: {"price_usd": 165000, "area_m2": 55, "rooms": 2, "zone_label": "Palermo", "attributes": ["balcon", "cochera"], "description": "Departamento de 2 ambientes en Palermo, de 55 m², con balcón y cochera."}
(notá que el teléfono desaparece y "balcon"/"cochera" quedan listados en attributes, no solo mencionados en la descripción)`;
}
