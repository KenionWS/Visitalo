/**
 * Prompt versionado para la extracción de ficha de búsqueda (spec sección 6,
 * uso #1). Cambios de comportamiento del extractor deben venir acompañados
 * de un bump de versión acá.
 */
export const SEARCH_EXTRACTION_VERSION = "v1";

export function buildSearchExtractionSystemPrompt(knownContext: Record<string, unknown>): string {
  return `Extraés datos de búsqueda inmobiliaria a partir de mensajes de WhatsApp de compradores en Argentina (CABA), escritos en español rioplatense (voseo).

Devolvé SOLO los campos que el comprador mencionó explícita o implícitamente en ESTE mensaje. Si no dijo nada sobre un campo, dejalo en null — no inventes ni asumas valores.

Contexto ya confirmado en turnos anteriores de esta misma búsqueda (no lo repitas a menos que el comprador lo corrija en este mensaje):
${JSON.stringify(knownContext)}`;
}
