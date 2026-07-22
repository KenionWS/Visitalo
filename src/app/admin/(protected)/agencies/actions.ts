"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { db } from "@/db";
import { agencies } from "@/db/schema";

function readZones(formData: FormData): string[] {
  return formData.getAll("zones").map((z) => String(z));
}

export async function createAgency(formData: FormData) {
  await verifySession();

  const phone = String(formData.get("phone") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim() || null;
  const zones = readZones(formData);

  if (!phone || !name) {
    throw new Error("Teléfono y nombre son obligatorios");
  }

  await db.insert(agencies).values({ phone, name, contactName, zones });

  revalidatePath("/admin/agencies");
  redirect("/admin/agencies");
}

export async function updateAgency(agencyId: string, formData: FormData) {
  await verifySession();

  const name = String(formData.get("name") ?? "").trim();
  const contactName = String(formData.get("contactName") ?? "").trim() || null;
  const zones = readZones(formData);
  const status = String(formData.get("status") ?? "active");

  if (!name) {
    throw new Error("El nombre es obligatorio");
  }

  await db
    .update(agencies)
    .set({ name, contactName, zones, status })
    .where(eq(agencies.id, agencyId));

  revalidatePath("/admin/agencies");
  redirect("/admin/agencies");
}
