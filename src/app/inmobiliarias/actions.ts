"use server";

import { db } from "@/db";
import { agencyLeads } from "@/db/schema";

export type SubmitAgencyLeadResult = { ok: true } | { ok: false; error: string };

export async function submitAgencyLead(formData: FormData): Promise<SubmitAgencyLeadResult> {
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const zones = formData.getAll("zones").map((z) => String(z));

  if (!name || !phone) {
    return { ok: false, error: "Nombre y teléfono son obligatorios." };
  }

  await db.insert(agencyLeads).values({ name, phone, zones });

  return { ok: true };
}
