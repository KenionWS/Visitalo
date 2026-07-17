import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, searches } from "@/db/schema";
import { enqueueJob } from "./queue";

function zoneOverlaps(agencyZones: string[], searchZones: string[]): boolean {
  const normalizedAgencyZones = agencyZones.map((z) => z.toLowerCase().trim());
  return searchZones.some((z) => normalizedAgencyZones.includes(z.toLowerCase().trim()));
}

/**
 * Encuentra las inmobiliarias activas cuyas zonas pisan las de la búsqueda y
 * encola el envío de la ficha anónima a cada una (spec sección 5.2).
 */
export async function dispatchSearchToAgencies(searchId: string): Promise<void> {
  const [search] = await db.select().from(searches).where(eq(searches.id, searchId)).limit(1);
  if (!search) return;

  const activeAgencies = await db.select().from(agencies).where(eq(agencies.status, "active"));
  const matching = activeAgencies.filter((a) => zoneOverlaps(a.zones, search.zones));

  for (const agency of matching) {
    await enqueueJob("distribution.notify_agency", { searchId: search.id, agencyId: agency.id });
  }
}
