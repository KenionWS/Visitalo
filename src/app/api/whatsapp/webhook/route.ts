import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, waMessages } from "@/db/schema";
import { enqueueJob } from "@/lib/queue";

/**
 * Verificación del webhook (handshake que pide Meta al configurar la
 * suscripción en el Business Manager).
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("hub.mode");
  const token = searchParams.get("hub.verify_token");
  const challenge = searchParams.get("hub.challenge");

  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge, { status: 200 });
  }

  return new NextResponse("Forbidden", { status: 403 });
}

type WhatsAppMessage = {
  id: string;
  from: string;
  timestamp: string;
  type: string;
  text?: { body: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string };
  [key: string]: unknown;
};

/**
 * No guardamos fotos/adjuntos (fuera de scope, ver README), pero si vienen
 * con un caption ese texto es información real (precio, m², etc.) y no hay
 * que perderla — se procesa igual que un mensaje de texto.
 */
function extractMessageText(message: WhatsAppMessage): string | undefined {
  if (message.type === "text") return message.text?.body;
  if (message.type === "image") return message.image?.caption;
  if (message.type === "video") return message.video?.caption;
  if (message.type === "document") return message.document?.caption;
  return undefined;
}

type WhatsAppStatus = {
  id: string;
  status: string;
  recipient_id: string;
  [key: string]: unknown;
};

type WebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: WhatsAppMessage[];
        statuses?: WhatsAppStatus[];
      };
      field?: string;
    }>;
  }>;
};

/**
 * Recepción de mensajes y estados. Meta reintenta si no respondemos 200
 * rápido, así que acá solo deduplicamos por wamid, logueamos en wa_messages
 * y encolamos trabajo — nunca procesamos con el LLM en línea.
 */
export async function POST(req: NextRequest) {
  let payload: WebhookPayload;

  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  try {
    const changes = payload.entry?.flatMap((entry) => entry.changes ?? []) ?? [];

    for (const change of changes) {
      const messages = change.value?.messages ?? [];
      const statuses = change.value?.statuses ?? [];

      for (const message of messages) {
        const [inserted] = await db
          .insert(waMessages)
          .values({
            wamid: message.id,
            phone: message.from,
            direction: "in",
            type: message.type,
            payload: message,
          })
          .onConflictDoNothing({ target: waMessages.wamid })
          .returning();

        if (!inserted) continue; // ya lo habíamos procesado (reintento de Meta)

        const text = extractMessageText(message);
        if (text) {
          const [agency] = await db
            .select({ id: agencies.id })
            .from(agencies)
            .where(eq(agencies.phone, message.from))
            .limit(1);

          if (agency) {
            await enqueueJob("conversation.agency_message", {
              phone: message.from,
              text,
            });
          } else {
            await enqueueJob("conversation.buyer_message", {
              phone: message.from,
              text,
            });
          }
        }
      }

      for (const status of statuses) {
        await db
          .insert(waMessages)
          .values({
            wamid: status.id,
            phone: status.recipient_id,
            direction: "out",
            type: "status",
            payload: status,
          })
          .onConflictDoNothing({ target: waMessages.wamid });
      }
    }
  } catch (err) {
    // Logueamos pero igual respondemos 200: el dedupe por wamid hace seguro
    // que un reintento de Meta no duplique trabajo.
    console.error("[whatsapp webhook] error procesando payload:", err);
  }

  return NextResponse.json({ received: true });
}
