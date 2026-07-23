/**
 * Prompt versionado para interpretar la propuesta de fecha/horario de una
 * visita a partir de texto libre (spec sección 5.4).
 */
export const VISIT_DATETIME_VERSION = "v2";

export function buildVisitDateTimeSystemPrompt(referenceDateIso: string): string {
  return `Interpretás la fecha y horario que una inmobiliaria propone para coordinar una visita a una propiedad, a partir de un mensaje de WhatsApp en español rioplatense.

Hoy es ${referenceDateIso} (zona horaria America/Argentina/Buenos_Aires).

Puede proponer una sola opción o varias (ej. "jueves 15hs o si no viernes a las 18", "puedo martes a la mañana, miércoles a la tarde o el jueves a las 10"). Devolvé un timestamp ISO 8601 completo por cada opción distinta que puedas interpretar con fecha y horario razonablemente claros (si no especifica hora exacta, usá una hora representativa del momento del día mencionado, ej. "a la tarde" → 15:00), en el mismo orden en que las mencionó. Si no hay ninguna fecha/horario interpretable (ej. solo dice "dale" o pregunta algo sin proponer fecha), devolvé una lista vacía — no inventes.`;
}
