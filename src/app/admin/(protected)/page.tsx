import { eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, jobs, proposals, relayThreads, searches, visits } from "@/db/schema";
import { PageHeader, SectionLabel } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/admin/Card";
import { EmptyState } from "@/components/admin/EmptyState";
import {
  Search,
  Home,
  KeyRound,
  ClipboardList,
  Building2,
  CreditCard,
  CalendarClock,
  CalendarCheck2,
  CalendarX2,
  MessageSquareText,
  Clock,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

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
    <div className="space-y-8">
      <PageHeader title="Panel" description="Estado general de Visitalo en producción." />

      <div>
        <SectionLabel>Búsquedas</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Búsquedas activas" value={activeSearchRows.length} icon={Search} />
          <StatCard label="Venta" value={ventaCount} icon={Home} tone="neutral" />
          <StatCard label="Alquiler" value={alquilerCount} icon={KeyRound} tone="neutral" />
        </div>
      </div>

      <div>
        <SectionLabel>Propuestas e inmobiliarias</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            label="Propuestas por revisar"
            value={pendingProposals.length}
            icon={ClipboardList}
            tone={pendingProposals.length > 0 ? "ambar" : "verde"}
            href={pendingProposals.length > 0 ? "/admin/proposals" : undefined}
          />
          <StatCard label="Inmobiliarias activas" value={activeAgencies.length} icon={Building2} href="/admin/agencies" />
          <StatCard label="Créditos usados" value={`${totalCreditsUsed} / ${totalCreditsFree}`} icon={CreditCard} tone="neutral" />
        </div>
      </div>

      <div>
        <SectionLabel>Visitas</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard label="Solicitadas" value={visitsRequested} icon={CalendarClock} tone="ambar" />
          <StatCard label="Confirmadas" value={visitsConfirmed} icon={CalendarCheck2} />
          <StatCard label="Canceladas" value={visitsCancelled} icon={CalendarX2} tone="neutral" />
        </div>
      </div>

      <div>
        <SectionLabel>Relay de preguntas</SectionLabel>
        <div className="mt-3 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <StatCard label="Respondidas" value={relayAnswered} icon={MessageSquareText} />
          <StatCard label="Esperando respuesta" value={relayPending} icon={Clock} tone="ambar" />
        </div>
      </div>

      <div>
        <SectionLabel>Jobs fallidos ({failedJobs.length})</SectionLabel>
        <Card className="mt-3" padded={false}>
          {failedJobs.length === 0 ? (
            <EmptyState icon={CheckCircle2} text="Ninguno — todo está procesándose bien." />
          ) : (
            <ul className="divide-y divide-[var(--tinta)]/8">
              {failedJobs.map((job) => (
                <li key={job.id} className="flex gap-3 p-4 text-sm">
                  <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0 text-red-500" />
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--tinta)]">
                      {job.type}{" "}
                      <span className="font-normal text-[var(--tinta)]/45">
                        · {job.createdAt.toLocaleString("es-AR")}
                      </span>
                    </p>
                    <p className="mt-0.5 break-words text-[var(--tinta)]/60">{job.lastError}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
