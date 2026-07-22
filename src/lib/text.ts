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

/** Interpreta una respuesta libre como sí/no contra los mismos sets de palabras clave usados en toda la app. */
export function parseYesNo(text: string): "yes" | "no" | null {
  const words = new Set(normalizeWords(text));
  const hasConfirm = [...words].some((w) => CONFIRM_WORDS.has(w));
  const hasReject = [...words].some((w) => REJECT_WORDS.has(w));
  if (hasConfirm && !hasReject) return "yes";
  if (hasReject && !hasConfirm) return "no";
  return null;
}
