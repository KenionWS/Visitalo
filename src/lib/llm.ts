import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildSearchExtractionSystemPrompt, type PendingQuestion } from "../../prompts/search-extraction";
import { buildProposalNormalizationSystemPrompt } from "../../prompts/proposal-normalization";
import { buildRelayRedactionSystemPrompt } from "../../prompts/relay-redaction";
import { buildVisitDateTimeSystemPrompt } from "../../prompts/visit-datetime";
import { buildVisitOptionChoiceSystemPrompt } from "../../prompts/visit-option-choice";

// Todas las llamadas de este archivo son extracción/clasificación con schema
// fijo (structured outputs) — no razonamiento abierto — así que un modelo
// chico rinde igual a una fracción del costo. Si algún caso puntual muestra
// baja calidad (ej. redacción de PII), subir SOLO ESA llamada a un modelo
// mayor en vez de este constante global.
const MODEL = "claude-haiku-4-5";

let cachedClient: Anthropic | null = null;

function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  if (!cachedClient) cachedClient = new Anthropic();
  return cachedClient;
}

export const SearchFieldsSchema = z.object({
  operation: z
    .enum(["venta", "alquiler"])
    .nullable()
    .describe("Si el comprador busca comprar (venta) o alquilar"),
  property_type: z
    .string()
    .nullable()
    .describe("Tipo de propiedad mencionado: departamento, casa, ph, etc."),
  zones: z
    .array(z.string())
    .nullable()
    .describe("Barrios o zonas de CABA que el comprador mencionó en este mensaje"),
  budget_max: z
    .number()
    .int()
    .nullable()
    .describe(
      "Presupuesto máximo como número entero, en la moneda que corresponda: dólares (USD) si operation es venta, pesos argentinos (ARS) si operation es alquiler"
    ),
  payment_method: z
    .enum(["contado", "credito", "mixto"])
    .nullable()
    .describe("Forma de pago"),
  has_preapproval: z
    .boolean()
    .nullable()
    .describe("Si tiene crédito preaprobado (solo si el comprador lo mencionó explícitamente)"),
  preapproval_bank: z
    .string()
    .nullable()
    .describe("Banco del crédito preaprobado, si lo mencionó"),
  timeline: z
    .string()
    .nullable()
    .describe("Urgencia o plazo de la búsqueda, en texto libre tal como lo dijo el comprador"),
  must_haves: z
    .array(z.string())
    .nullable()
    .describe("Características imprescindibles que mencionó (ej: balcón, apto crédito, cochera)"),
});

export type SearchFields = z.infer<typeof SearchFieldsSchema>;

/**
 * Extrae campos de ficha de búsqueda de un mensaje de texto libre.
 * Devuelve null si no hay ANTHROPIC_API_KEY configurada (modo local sin LLM)
 * o si el modelo no pudo producir una salida válida.
 */
export async function extractSearchFields(
  message: string,
  knownContext: Partial<SearchFields> = {},
  pendingQuestion?: PendingQuestion
): Promise<SearchFields | null> {
  if (!isConfigured()) {
    console.warn(
      "[llm] ANTHROPIC_API_KEY no configurada. No se puede extraer la ficha de búsqueda."
    );
    return null;
  }

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: buildSearchExtractionSystemPrompt(knownContext, pendingQuestion),
    messages: [{ role: "user", content: message }],
    output_config: { format: zodOutputFormat(SearchFieldsSchema) },
  });

  return response.parsed_output;
}

export const ProposalFieldsSchema = z.object({
  price: z
    .number()
    .int()
    .nullable()
    .describe(
      "Precio como número entero, en la moneda que corresponda: dólares (USD) para venta, pesos argentinos (ARS) para el alquiler mensual"
    ),
  area_m2: z.number().int().nullable().describe("Superficie en m²"),
  rooms: z.number().int().nullable().describe("Cantidad de ambientes"),
  zone_label: z
    .string()
    .nullable()
    .describe("Ubicación aproximada (barrio/sub-zona). Nunca calle ni altura exacta."),
  attributes: z
    .array(z.string())
    .nullable()
    .describe("Lista de atributos mencionados explícitamente, en snake_case (balcon, cochera, apto_credito, etc.)"),
  description: z
    .string()
    .nullable()
    .describe("Descripción redactada de nuevo por vos, sin datos de contacto ni dirección exacta"),
});

export type ProposalFields = z.infer<typeof ProposalFieldsSchema>;

/**
 * Normaliza el mensaje de una inmobiliaria en una ficha de propiedad
 * estructurada, aplicando el filtro de PII en la misma pasada. Devuelve
 * null si no hay ANTHROPIC_API_KEY configurada o si el modelo no pudo
 * producir una salida válida.
 */
export async function normalizeProposal(
  message: string,
  context: { agencyZones: string[]; searchZones: string[]; operation: "venta" | "alquiler" }
): Promise<ProposalFields | null> {
  if (!isConfigured()) {
    console.warn("[llm] ANTHROPIC_API_KEY no configurada. No se puede normalizar la propuesta.");
    return null;
  }

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 1024,
    system: buildProposalNormalizationSystemPrompt(context),
    messages: [{ role: "user", content: message }],
    output_config: { format: zodOutputFormat(ProposalFieldsSchema) },
  });

  return response.parsed_output;
}

/**
 * Redacta un mensaje del relay bidireccional (spec 5.3 / 6#4), sacando PII
 * de la parte que todavía no tiene el contacto directo de la otra. Devuelve
 * null si no hay ANTHROPIC_API_KEY o si el modelo no respondió texto.
 */
export async function redactRelayMessage(
  message: string,
  direction: "comprador_a_inmobiliaria" | "inmobiliaria_a_comprador"
): Promise<string | null> {
  if (!isConfigured()) {
    console.warn("[llm] ANTHROPIC_API_KEY no configurada. No se puede redactar el mensaje del relay.");
    return null;
  }

  const response = await client().messages.create({
    model: MODEL,
    max_tokens: 512,
    system: buildRelayRedactionSystemPrompt(direction),
    messages: [{ role: "user", content: message }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  return textBlock?.text?.trim() || null;
}

const VisitDateTimesSchema = z.object({
  options: z
    .array(z.string())
    .describe("Timestamps ISO 8601 de cada fecha/horario propuesto que se pudo interpretar con claridad, en orden"),
});

/**
 * Interpreta una o varias fechas/horarios propuestos para una visita a
 * partir de texto libre. Devuelve una lista vacía si no hay
 * ANTHROPIC_API_KEY, si el modelo no pudo interpretar nada, o si ningún
 * timestamp devuelto es válido.
 */
export async function parseVisitDateTimes(message: string, referenceDate: Date): Promise<Date[]> {
  if (!isConfigured()) {
    console.warn("[llm] ANTHROPIC_API_KEY no configurada. No se puede interpretar la fecha de la visita.");
    return [];
  }

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 512,
    system: buildVisitDateTimeSystemPrompt(referenceDate.toISOString()),
    messages: [{ role: "user", content: message }],
    output_config: { format: zodOutputFormat(VisitDateTimesSchema) },
  });

  const raw = response.parsed_output?.options ?? [];
  return raw
    .map((iso) => new Date(iso))
    .filter((d) => !Number.isNaN(d.getTime()));
}

const VisitOptionChoiceSchema = z.object({
  chosen_index: z
    .number()
    .int()
    .nullable()
    .describe("Número (1-based) de la opción elegida, o null si no eligió ninguna con claridad"),
});

/**
 * Interpreta cuál de las opciones de horario (ya formateadas como texto)
 * eligió el comprador. Devuelve null si no hay ANTHROPIC_API_KEY, si el
 * modelo no pudo determinarlo, o si el índice devuelto está fuera de rango.
 */
export async function parseVisitOptionChoice(message: string, options: string[]): Promise<number | null> {
  if (!isConfigured()) {
    console.warn("[llm] ANTHROPIC_API_KEY no configurada. No se puede interpretar la elección de horario.");
    return null;
  }

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 128,
    system: buildVisitOptionChoiceSystemPrompt(options),
    messages: [{ role: "user", content: message }],
    output_config: { format: zodOutputFormat(VisitOptionChoiceSchema) },
  });

  const idx = response.parsed_output?.chosen_index;
  if (idx == null || idx < 1 || idx > options.length) return null;
  return idx;
}

/**
 * Chequea con un LLM de visión si una imagen muestra un dato de contacto
 * directo (teléfono, email, usuario de redes, cartel con esos datos).
 * Devuelve una descripción breve si detectó algo, o null si no vio nada o
 * no hay ANTHROPIC_API_KEY. Es un chequeo best-effort para alertar al admin
 * antes de publicar, no un filtro automático que edite la imagen.
 */
export async function detectContactInfoInImage(
  buffer: Buffer,
  contentType: string
): Promise<string | null> {
  if (!isConfigured()) return null;

  try {
    const response = await client().messages.create({
      model: MODEL,
      max_tokens: 200,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: contentType as "image/jpeg", data: buffer.toString("base64") },
            },
            {
              type: "text",
              text: '¿Esta imagen muestra un teléfono, email, usuario de redes sociales, o cualquier otro dato de contacto directo, visible como texto, marca de agua o cartel? Respondé SOLO "SI: <qué viste, en pocas palabras>" o "NO".',
            },
          ],
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === "text");
    const answer = textBlock?.text?.trim() ?? "";
    return answer.toUpperCase().startsWith("SI") ? answer : null;
  } catch (err) {
    console.error("[llm] no se pudo chequear la imagen por datos de contacto:", err);
    return null;
  }
}
