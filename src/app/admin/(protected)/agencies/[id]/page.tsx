import Link from "next/link";
import { desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ClipboardList,
  CheckCircle2,
  Clock,
  XCircle,
  CreditCard,
  CalendarClock,
  CalendarCheck2,
  CalendarX2,
  Inbox,
} from "lucide-react";
import { db } from "@/db";
import { agencies, proposals, searches, visits } from "@/db/schema";
import { formatMoney } from "@/lib/text";
import { PageHeader, SectionLabel } from "@/components/admin/PageHeader";
import { StatCard } from "@/components/admin/StatCard";
import { Card } from "@/components/admin/Card";
import { Badge, type BadgeVariant } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { updateAgency } from "../actions";
import { ZoneCheckboxes } from "@/components/ZoneCheckboxes";

function statusLabel(status: string): string {
  switch (status) {
    case "pending_review":
      return "Por revisar";
    case "published":
      return "Publicada";
    case "discarded":
      return "Descartada";
    case "withdrawn":
      return "Retirada";
    default:
      return status;
  }
}

function statusVariant(status: string): BadgeVariant {
  switch (status) {
    case "published":
      return "success";
    case "pending_review":
      return "warning";
    default:
      return "neutral";
  }
}

export default async function AgencyProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1);
  if (!agency) notFound();

  const updateWithId = updateAgency.bind(null, agency.id);

  const proposalRows = await db
    .select({ proposal: proposals, searchOperation: searches.operation, searchZones: searches.zones })
    .from(proposals)
    .innerJoin(searches, eq(proposals.searchId, searches.id))
    .where(eq(proposals.agencyId, agency.id))
    .orderBy(desc(proposals.createdAt));

  const proposalIds = proposalRows.map((r) => r.proposal.id);
  const visitRows =
    proposalIds.length > 0
      ? await db.select().from(visits).where(inArray(visits.proposalId, proposalIds))
      : [];

  const published = proposalRows.filter((r) => r.proposal.status === "published").length;
  const pendingReview = proposalRows.filter((r) => r.proposal.status === "pending_review").length;
  const discarded = proposalRows.filter((r) => r.proposal.status === "discarded").length;
  const visitsRequested = visitRows.filter((v) => v.status === "requested").length;
  const visitsConfirmed = visitRows.filter((v) => v.status === "confirmed").length;
  const visitsCancelled = visitRows.filter((v) => v.status === "cancelled").length;

  return (
    <div className="space-y-8">
      <div>
        <Link
          href="/admin/agencies"
          className="inline-flex items-center gap-1 text-sm text-[var(--tinta)]/50 hover:text-[var(--tinta)]/80"
        >
          <ArrowLeft size={14} strokeWidth={2} />
          Inmobiliarias
        </Link>
        <div className="mt-2">
          <PageHeader title={agency.name} description={`${agency.phone} (no editable)`} />
        </div>
      </div>

      <div>
        <SectionLabel>Estadísticas</SectionLabel>
        <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Propuestas totales" value={proposalRows.length} icon={ClipboardList} tone="neutral" />
          <StatCard label="Publicadas" value={published} icon={CheckCircle2} />
          <StatCard label="Por revisar" value={pendingReview} icon={Clock} tone="ambar" />
          <StatCard label="Descartadas" value={discarded} icon={XCircle} tone="neutral" />
          <StatCard label="Créditos usados" value={`${agency.creditsUsed} / ${agency.creditsFree}`} icon={CreditCard} tone="neutral" />
          <StatCard label="Visitas solicitadas" value={visitsRequested} icon={CalendarClock} tone="ambar" />
          <StatCard label="Visitas confirmadas" value={visitsConfirmed} icon={CalendarCheck2} />
          <StatCard label="Visitas canceladas" value={visitsCancelled} icon={CalendarX2} tone="neutral" />
        </div>
      </div>

      <div>
        <SectionLabel>Editar</SectionLabel>
        <Card className="mt-3">
          <form action={updateWithId} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-[var(--tinta)]/80">Nombre</label>
              <input
                name="name"
                defaultValue={agency.name}
                required
                className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--tinta)]/80">Nombre de contacto</label>
              <input
                name="contactName"
                defaultValue={agency.contactName ?? ""}
                className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
              />
            </div>
            <div className="sm:col-span-2">
              <ZoneCheckboxes selected={agency.zones} />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--tinta)]/80">Estado</label>
              <select
                name="status"
                defaultValue={agency.status}
                className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 bg-white p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
              >
                <option value="active">Activa</option>
                <option value="paused">Pausada</option>
              </select>
            </div>
            <div className="flex items-end sm:col-span-2">
              <button
                type="submit"
                className="rounded-full bg-[var(--verde-profundo)] px-5 py-2.5 text-sm font-medium text-white"
              >
                Guardar cambios
              </button>
            </div>
          </form>
        </Card>
      </div>

      <div>
        <SectionLabel>Historial de propuestas ({proposalRows.length})</SectionLabel>
        <Card className="mt-3" padded={false}>
          {proposalRows.length === 0 ? (
            <EmptyState icon={Inbox} text="Todavía no mandó ninguna propuesta." />
          ) : (
            <ul className="divide-y divide-[var(--tinta)]/8">
              {proposalRows.map(({ proposal, searchOperation, searchZones }) => (
                <li key={proposal.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                  <div>
                    <p className="font-medium text-[var(--tinta)]">
                      {proposal.zoneLabel ?? "Sin zona"} ·{" "}
                      {proposal.price != null ? formatMoney(proposal.price, searchOperation) : "sin precio"}
                    </p>
                    <p className="mt-0.5 text-xs text-[var(--tinta)]/50">
                      {proposal.createdAt.toLocaleString("es-AR")} · búsqueda en{" "}
                      {searchZones.join(", ") || "sin especificar"}
                      {proposal.matchScore !== null ? ` · ${proposal.matchScore}% match` : ""}
                    </p>
                  </div>
                  <Badge variant={statusVariant(proposal.status)}>{statusLabel(proposal.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
