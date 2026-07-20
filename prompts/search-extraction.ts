/**
 * Prompt versionado para la extracción de ficha de búsqueda (spec sección 6,
 * uso #1). Cambios de comportamiento del extractor deben venir acompañados
 * de un bump de versión acá.
 */
export const SEARCH_EXTRACTION_VERSION = "v2";

export type PendingQuestion = { field: string; question: string };

export function buildSearchExtractionSystemPrompt(
  knownContext: Record<string, unknown>,
  pendingQuestion?: PendingQuestion
): string {
  const pendingBlock = pendingQuestion
    ? `\n\nOJO: le acabás de preguntar "${pendingQuestion.question}" (esperando que complete el campo "${pendingQuestion.field}"). Si su respuesta es corta o ambigua por sí sola (ej. "sí", "no", "dale", un número suelto, un nombre de banco), interpretala como la respuesta a ESA pregunta puntual y completá ese campo — por ejemplo, si preguntaste algo de sí/no, un "sí"/"dale" va como \`true\` en el campo booleano correspondiente, un "no" va como \`false\`. No dejes ese campo en null si la respuesta lo contesta, aunque sea de forma escueta.`
    : "";

  return `Extraés datos de búsqueda inmobiliaria a partir de mensajes de WhatsApp de compradores en Argentina (CABA), escritos en español rioplatense (voseo).

Devolvé SOLO los campos que el comprador mencionó explícita o implícitamente en ESTE mensaje. Si no dijo nada sobre un campo, dejalo en null — no inventes ni asumas valores.

Contexto ya confirmado en turnos anteriores de esta misma búsqueda (no lo repitas a menos que el comprador lo corrija en este mensaje):
${JSON.stringify(knownContext)}${pendingBlock}`;
}
