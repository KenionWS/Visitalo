/**
 * Prompt versionado para interpretar cuál de las opciones de horario de
 * visita eligió el comprador, a partir de texto libre.
 */
export const VISIT_OPTION_CHOICE_VERSION = "v1";

export function buildVisitOptionChoiceSystemPrompt(options: string[]): string {
  const optionsList = options.map((o, i) => `${i + 1}) ${o}`).join("\n");

  return `Un comprador está eligiendo un horario para visitar una propiedad, entre estas opciones que le pasó la inmobiliaria:
${optionsList}

Devolvé el número de la opción elegida (1 a ${options.length}). Si solo hay una opción y el comprador responde afirmativo en general (ej. "sí", "dale", "perfecto", "esa está bien") sin nombrar un número, interpretalo como que eligió la opción 1. Si menciona un día/horario que coincide claramente con una de las opciones, elegí esa. Si el mensaje es ambiguo, no elige ninguna con claridad, o pide una fecha distinta que no está en la lista, devolvé null — no inventes ni asumas.`;
}
