"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { verifySession } from "@/lib/auth/dal";
import { db } from "@/db";
import { proposals } from "@/db/schema";
import { enqueueJob } from "@/lib/queue";

function parseAttributes(raw: string): Record<string, boolean> {
  const attrs: Record<string, boolean> = {};
  for (const part of raw
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean)) {
    attrs[part.toLowerCase().replace(/\s+/g, "_")] = true;
  }
  return attrs;
}

function readEdits(formData: FormData) {
  const priceUsd = formData.get("priceUsd");
  const areaM2 = formData.get("areaM2");
  const rooms = formData.get("rooms");

  return {
    priceUsd: priceUsd ? Number(priceUsd) : null,
    areaM2: areaM2 ? Number(areaM2) : null,
    rooms: rooms ? Number(rooms) : null,
    zoneLabel: String(formData.get("zoneLabel") ?? "").trim() || null,
    description: String(formData.get("description") ?? "").trim() || null,
    attributes: parseAttributes(String(formData.get("attributes") ?? "")),
  };
}

export async function saveProposal(proposalId: string, formData: FormData) {
  await verifySession();
  await db.update(proposals).set(readEdits(formData)).where(eq(proposals.id, proposalId));
  revalidatePath("/admin/proposals");
}

export async function approveProposal(proposalId: string, formData: FormData) {
  await verifySession();

  const [updated] = await db
    .update(proposals)
    .set({ ...readEdits(formData), status: "published" })
    .where(eq(proposals.id, proposalId))
    .returning();

  if (updated) {
    await enqueueJob("proposal.notify_buyer", { searchId: updated.searchId });
  }

  revalidatePath("/admin/proposals");
}

export async function rejectProposal(proposalId: string) {
  await verifySession();
  await db.update(proposals).set({ status: "discarded" }).where(eq(proposals.id, proposalId));
  revalidatePath("/admin/proposals");
}
