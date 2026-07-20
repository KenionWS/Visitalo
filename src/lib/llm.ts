import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildSearchExtractionSystemPrompt, type PendingQuestion } from "../../prompts/search-extraction";
import { buildProposalNormalizationSystemPrompt } from "../../prompts/proposal-normalization";
import { buildRelayRedactionSystemPrompt } from "../../prompts/relay-redaction";
import { buildVisitDateTimeSystemPrompt } from "../../prompts/visit-datetime";

const MODEL = "claude-opus-4-8";

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
  budget_usd_max: z
    .number()
    .int()
    .nullable()
    .describe("Presupuesto máximo en dólares (USD), como número entero"),
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
  price_usd: z.number().int().nullable().describe("Precio en dólares (USD)"),
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

const VisitDateTimeSchema = z.object({
  scheduled_at: z
    .string()
    .nullable()
    .describe("Timestamp ISO 8601 de la fecha/horario propuesto, o null si no se puede interpretar"),
});

/**
 * Interpreta la fecha/horario propuesto para una visita a partir de texto
 * libre. Devuelve null si no hay ANTHROPIC_API_KEY, si el modelo no pudo
 * interpretar nada, o si el timestamp devuelto no es válido.
 */
export async function parseVisitDateTime(message: string, referenceDate: Date): Promise<Date | null> {
  if (!isConfigured()) {
    console.warn("[llm] ANTHROPIC_API_KEY no configurada. No se puede interpretar la fecha de la visita.");
    return null;
  }

  const response = await client().messages.parse({
    model: MODEL,
    max_tokens: 256,
    system: buildVisitDateTimeSystemPrompt(referenceDate.toISOString()),
    messages: [{ role: "user", content: message }],
    output_config: { format: zodOutputFormat(VisitDateTimeSchema) },
  });

  const raw = response.parsed_output?.scheduled_at;
  if (!raw) return null;

  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}
