import { NextRequest, NextResponse } from "next/server";
import { processJobs } from "@/lib/jobs";

/**
 * Disparado por un scheduler externo (Vercel Cron o Upstash QStash) o a mano
 * en local. Protegido por CRON_SECRET para que no cualquiera pueda gastar
 * los reintentos o disparar envíos de WhatsApp.
 */
export async function POST(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");

  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const results = await processJobs();
  return NextResponse.json(results);
}
