/** Normaliza texto a una lista de palabras en minúscula y sin acentos, para matchear contra sets de palabras clave (sí/no, paso, etc). */
export function normalizeWords(text: string): string[] {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

const CONFIRM_WORDS = new Set([
  "si",
  "sí",
  "dale",
  "ok",
  "okay",
  "okey",
  "confirmo",
  "correcto",
  "listo",
  "joya",
  "exacto",
  "afirmativo",
]);

const REJECT_WORDS = new Set(["no", "nel", "incorrecto", "cambiar", "corregir"]);

/** Formatea un monto según la moneda habitual de la operación: USD para venta, ARS para alquiler (mercado argentino). */
export function formatMoney(amount: number | null, operation: string | null): string {
  if (amount == null) return "sin especificar";
  const formatted = amount.toLocaleString("es-AR");
  return operation === "alquiler" ? `$ ${formatted} ARS` : `USD ${formatted}`;
}

const EMAIL_PATTERN = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g;
const HANDLE_PATTERN = /@[A-Za-z0-9_.]{3,}/g;
// Deliberadamente conservador: solo formatos de teléfono AR bien
// reconocibles (011/11/15 + 8 dígitos en grupos de 4), para no comerse por
// error un precio de propiedad ("1.250.000") que también es una seguidilla
// de dígitos con separadores.
const PHONE_PATTERN = /(\+?54[\s.-]?9?[\s.-]?)?(?:\(?0?11\)?|15)[\s.-]?\d{4}[\s.-]?\d{4}\b/g;

/**
 * Red de seguridad extra sobre la redacción de PII por LLM del relay (ver
 * redactRelayMessage en llm.ts) — un LLM no es infalible, esto tapa
 * cualquier patrón que sobreviva y claramente parezca teléfono/email/
 * usuario de redes. No reemplaza al LLM, es una capa extra.
 */
export function stripLikelyContactInfo(text: string): string {
  return text
    .replace(EMAIL_PATTERN, "[dato de contacto oculto]")
    .replace(HANDLE_PATTERN, "[dato de contacto oculto]")
    .replace(PHONE_PATTERN, "[dato de contacto oculto]");
}

/** Interpreta una respuesta libre como sí/no contra los mismos sets de palabras clave usados en toda la app. */
export function parseYesNo(text: string): "yes" | "no" | null {
  const words = new Set(normalizeWords(text));
  const hasConfirm = [...words].some((w) => CONFIRM_WORDS.has(w));
  const hasReject = [...words].some((w) => REJECT_WORDS.has(w));
  if (hasConfirm && !hasReject) return "yes";
  if (hasReject && !hasConfirm) return "no";
  return null;
}
