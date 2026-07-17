import "dotenv/config";
import { randomBytes } from "crypto";
import { db } from "@/db";
import { agencies, buyers, proposals, searches } from "@/db/schema";

/**
 * Crea un comprador + búsqueda activa + un puñado de propuestas de prueba,
 * para poder abrir la shortlist en el navegador sin mandar mensajes de
 * WhatsApp. Uso: npm run seed:shortlist
 */
async function main() {
  const [buyer] = await db
    .insert(buyers)
    .values({ phone: "5491100000001", name: "Comprador de prueba" })
    .onConflictDoUpdate({ target: buyers.phone, set: { name: "Comprador de prueba" } })
    .returning();

  const [agency] = await db
    .insert(agencies)
    .values({ phone: "5491100000099", name: "Inmobiliaria de prueba", zones: ["Palermo", "Belgrano"] })
    .onConflictDoUpdate({
      target: agencies.phone,
      set: { name: "Inmobiliaria de prueba", zones: ["Palermo", "Belgrano"] },
    })
    .returning();

  const [search] = await db
    .insert(searches)
    .values({
      buyerId: buyer.id,
      status: "active",
      propertyType: "departamento",
      zones: ["Palermo", "Belgrano"],
      budgetUsdMax: 180000,
      paymentMethod: "mixto",
      hasPreapproval: true,
      preapprovalBank: "Banco Galicia",
      mustHaves: ["balcon", "apto_credito"],
      shortlistToken: randomBytes(20).toString("hex"),
    })
    .returning();

  await db.insert(proposals).values([
    {
      searchId: search.id,
      agencyId: agency.id,
      status: "published",
      priceUsd: 165000,
      areaM2: 58,
      rooms: 2,
      zoneLabel: "Palermo Hollywood",
      attributes: { balcon: true, apto_credito: true, cochera: false },
      description: "Depto luminoso a metros de Plaza Serrano, con balcón y muy buena orientación.",
      photos: [],
      matchScore: 92,
    },
    {
      searchId: search.id,
      agencyId: agency.id,
      status: "published",
      priceUsd: 178000,
      areaM2: 65,
      rooms: 3,
      zoneLabel: "Belgrano R",
      attributes: { balcon: false, apto_credito: true, cochera: true },
      description: "Departamento de 3 ambientes con cochera fija en Belgrano R.",
      photos: [],
      matchScore: 81,
    },
  ]);

  console.log("Búsqueda de prueba creada.");
  console.log(`Shortlist: http://localhost:3000/s/${search.shortlistToken}`);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
