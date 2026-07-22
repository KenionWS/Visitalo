/**
 * Prompt versionado para la extracción de ficha de búsqueda (spec sección 6,
 * uso #1). Cambios de comportamiento del extractor deben venir acompañados
 * de un bump de versión acá.
 */
export const SEARCH_EXTRACTION_VERSION = "v4";

export type PendingQuestion = { field: string; question: string };

export function buildSearchExtractionSystemPrompt(
  knownContext: Record<string, unknown>,
  pendingQuestion?: PendingQuestion
): string {
  const pendingBlock = pendingQuestion
    ? `\n\nOJO: le acabás de preguntar "${pendingQuestion.question}" (esperando que complete el campo "${pendingQuestion.field}"). Si su respuesta es corta o ambigua por sí sola (ej. "sí", "no", "dale", un número suelto, un nombre de banco), interpretala como la respuesta a ESA pregunta puntual y completá ese campo — por ejemplo, si preguntaste algo de sí/no, un "sí"/"dale" va como \`true\` en el campo booleano correspondiente, un "no" va como \`false\`. No dejes ese campo en null si la respuesta lo contesta, aunque sea de forma escueta.`
    : "";

  return `Extraés datos de búsqueda inmobiliaria a partir de mensajes de WhatsApp de compradores en Argentina (CABA), escritos en español rioplatense (voseo).

"operation" indica si busca COMPRAR (venta) o ALQUILAR. Es el primer dato a identificar: "busco comprar", "quiero un depto propio", crédito hipotecario, etc. implican venta; "busco alquilar", "para alquilar", "inquilino" implican alquiler. Si no queda claro, dejalo en null.

Los campos "payment_method", "has_preapproval" y "preapproval_bank" son específicos de una compra (forma de pago, crédito hipotecario) — NO tienen sentido para un alquiler y no deberías completarlos si "operation" es "alquiler" (ni con el contexto ya confirmado, ni con lo que diga el comprador).

"budget_max" es el presupuesto máximo, pero OJO con la moneda: en Argentina las VENTAS se cotizan en dólares (USD) y los ALQUILERES casi siempre en pesos argentinos (ARS). Si "operation" es "venta", interpretá el número como USD. Si es "alquiler", interpretá el número como ARS mensuales — un comprador que alquila y dice "hasta un millón doscientos mil por mes" está hablando de pesos, no dólares; completá el campo igual, no lo dejes en null solo porque el número "parece alto" en USD. Si el comprador aclara explícitamente la moneda (dice "dólares" o "pesos"), respetá lo que dijo aunque contradiga esta regla general.

Devolvé SOLO los campos que el comprador mencionó explícita o implícitamente en ESTE mensaje. Si no dijo nada sobre un campo, dejalo en null — no inventes ni asumas valores.

Contexto ya confirmado en turnos anteriores de esta misma búsqueda (no lo repitas a menos que el comprador lo corrija en este mensaje):
${JSON.stringify(knownContext)}${pendingBlock}`;
}
