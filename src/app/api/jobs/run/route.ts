import { NextRequest, NextResponse } from "next/server";
import "@/lib/job-handlers";
import { processJobs } from "@/lib/queue";

// Default de Vercel (10s) se queda corto ahora que un job puede incluir
// llamadas a LLM + descarga/subida de varias fotos; 60 es el máximo del plan
// Hobby.
export const maxDuration = 60;

/**
 * Disparado por un scheduler externo (GitHub Actions, Vercel Cron o Upstash
 * QStash) o a mano en local. Protegido por CRON_SECRET para que no
 * cualquiera pueda gastar los reintentos o disparar envíos de WhatsApp.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await processJobs();
  return NextResponse.json(results);
}
