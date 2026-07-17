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
