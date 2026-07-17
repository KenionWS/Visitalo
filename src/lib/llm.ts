import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { buildSearchExtractionSystemPrompt } from "../../prompts/search-extraction";

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
  knownContext: Partial<SearchFields> = {}
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
    system: buildSearchExtractionSystemPrompt(knownContext),
    messages: [{ role: "user", content: message }],
    output_config: { format: zodOutputFormat(SearchFieldsSchema) },
  });

  return response.parsed_output;
}
