import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, proposals, searches } from "@/db/schema";

export default async function AdminHome() {
  const activeAgencies = await db
    .select({ id: agencies.id })
    .from(agencies)
    .where(eq(agencies.status, "active"));

  const pendingProposals = await db
    .select({ id: proposals.id })
    .from(proposals)
    .where(eq(proposals.status, "pending_review"));

  const activeSearches = await db
    .select({ id: searches.id })
    .from(searches)
    .where(eq(searches.status, "active"));

  return (
    <div>
      <h1 className="font-display text-2xl text-[var(--tinta)]">Panel</h1>
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-[var(--tinta)]/10 bg-white p-5">
          <p className="text-sm text-[var(--tinta)]/60">Búsquedas activas</p>
          <p className="mt-1 font-display text-3xl">{activeSearches.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--tinta)]/10 bg-white p-5">
          <p className="text-sm text-[var(--tinta)]/60">Propuestas por revisar</p>
          <p className="mt-1 font-display text-3xl">{pendingProposals.length}</p>
          {pendingProposals.length > 0 && (
            <Link href="/admin/proposals" className="mt-2 inline-block text-sm text-[var(--verde-profundo)] underline">
              Revisar ahora
            </Link>
          )}
        </div>
        <div className="rounded-xl border border-[var(--tinta)]/10 bg-white p-5">
          <p className="text-sm text-[var(--tinta)]/60">Inmobiliarias activas</p>
          <p className="mt-1 font-display text-3xl">{activeAgencies.length}</p>
        </div>
      </div>
    </div>
  );
}
