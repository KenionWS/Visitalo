/**
 * Prompt versionado para interpretar la propuesta de fecha/horario de una
 * visita a partir de texto libre (spec sección 5.4).
 */
export const VISIT_DATETIME_VERSION = "v1";

export function buildVisitDateTimeSystemPrompt(referenceDateIso: string): string {
  return `Interpretás la fecha y horario que alguien propone para una visita a una propiedad, a partir de un mensaje de WhatsApp en español rioplatense.

Hoy es ${referenceDateIso} (zona horaria America/Argentina/Buenos_Aires).

Si el mensaje menciona una fecha/horario razonablemente clara (ej. "el sábado a las 15hs", "mañana a la tarde", "el 15/8 a las 10"), devolvé un timestamp ISO 8601 completo (con horario — si no especifica hora exacta, usá una hora representativa del momento del día mencionado, ej. "a la tarde" → 15:00). Si el mensaje NO menciona nada que se pueda interpretar como fecha/horario (ej. solo dice "dale" o pregunta algo sin proponer fecha), devolvé null — no inventes una fecha.`;
}
