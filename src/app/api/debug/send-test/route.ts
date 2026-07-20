import { NextRequest, NextResponse } from "next/server";
import { sendText } from "@/lib/whatsapp";

/**
 * TEMPORAL — diagnóstico del envío real de WhatsApp en producción. Borrar
 * después de confirmar que el envío funciona. Protegido por CRON_SECRET.
 */
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get("secret");
  const phone = req.nextUrl.searchParams.get("phone");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!phone) {
    return NextResponse.json({ error: "falta ?phone=" }, { status: 400 });
  }

  const configured = Boolean(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
  const result = await sendText(phone, "Test de diagnóstico de visitalo — ignorá este mensaje.");

  return NextResponse.json({ configured, result });
}
