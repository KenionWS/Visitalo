import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, jobs, proposals, relayThreads, searches, visits } from "@/db/schema";

function StatCard({ label, value, href }: { label: string; value: number | string; href?: string }) {
  const content = (
    <div className="rounded-xl border border-[var(--tinta)]/10 bg-white p-5">
      <p className="text-sm text-[var(--tinta)]/60">{label}</p>
      <p className="mt-1 font-display text-3xl">{value}</p>
      {href && <span className="mt-2 inline-block text-sm text-[var(--verde-profundo)] underline">Ver</span>}
    </div>
  );
  return href ? <Link href={href}>{content}</Link> : content;
}

export default async function AdminHome() {
  const activeAgencies = await db.select({ id: agencies.id }).from(agencies).where(eq(agencies.status, "active"));

  const pendingProposals = await db
    .select({ id: proposals.id })
    .from(proposals)
    .where(eq(proposals.status, "pending_review"));

  const activeSearchRows = await db
    .select({ id: searches.id, operation: searches.operation })
    .from(searches)
    .where(eq(searches.status, "active"));
  const ventaCount = activeSearchRows.filter((s) => s.operation === "venta").length;
  const alquilerCount = activeSearchRows.filter((s) => s.operation === "alquiler").length;

  const visitRows = await db.select({ status: visits.status }).from(visits);
  const visitsRequested = visitRows.filter((v) => v.status === "requested").length;
  const visitsConfirmed = visitRows.filter((v) => v.status === "confirmed").length;
  const visitsCancelled = visitRows.filter((v) => v.status === "cancelled").length;

  const relayRows = await db.select({ status: relayThreads.status }).from(relayThreads);
  const relayAnswered = relayRows.filter((r) => r.status === "answered").length;
  const relayPending = relayRows.filter((r) => r.status === "sent").length;

  const agencyCredits = await db
    .select({ creditsUsed: agencies.creditsUsed, creditsFree: agencies.creditsFree })
    .from(agencies);
  const totalCreditsUsed = agencyCredits.reduce((sum, a) => sum + a.creditsUsed, 0);
  const totalCreditsFree = agencyCredits.reduce((sum, a) => sum + a.creditsFree, 0);

  const failedJobs = await db
    .select()
    .from(jobs)
    .where(eq(jobs.status, "failed"))
    .orderBy(jobs.createdAt);

  return (
    <div>
      <h1 className="font-display text-2xl text-[var(--tinta)]">Panel</h1>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">Búsquedas</p>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Búsquedas activas" value={activeSearchRows.length} />
        <StatCard label="Venta" value={ventaCount} />
        <StatCard label="Alquiler" value={alquilerCount} />
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">
        Propuestas e inmobiliarias
      </p>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Propuestas por revisar"
          value={pendingProposals.length}
          href={pendingProposals.length > 0 ? "/admin/proposals" : undefined}
        />
        <StatCard label="Inmobiliarias activas" value={activeAgencies.length} href="/admin/agencies" />
        <StatCard label="Créditos usados" value={`${totalCreditsUsed} / ${totalCreditsFree}`} />
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">Visitas</p>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Solicitadas" value={visitsRequested} />
        <StatCard label="Confirmadas" value={visitsConfirmed} />
        <StatCard label="Canceladas" value={visitsCancelled} />
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">
        Relay de preguntas
      </p>
      <div className="mt-2 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Respondidas" value={relayAnswered} />
        <StatCard label="Esperando respuesta" value={relayPending} />
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">
        Jobs fallidos ({failedJobs.length})
      </p>
      <div className="mt-2 rounded-xl border border-[var(--tinta)]/10 bg-white">
        {failedJobs.length === 0 ? (
          <p className="p-5 text-sm text-[var(--tinta)]/50">Ninguno — todo está procesándose bien.</p>
        ) : (
          <ul className="divide-y divide-[var(--tinta)]/10">
            {failedJobs.map((job) => (
              <li key={job.id} className="p-4 text-sm">
                <p className="font-medium">
                  {job.type} <span className="font-normal text-[var(--tinta)]/50">· {job.createdAt.toLocaleString("es-AR")}</span>
                </p>
                <p className="mt-1 break-words text-[var(--tinta)]/70">{job.lastError}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
