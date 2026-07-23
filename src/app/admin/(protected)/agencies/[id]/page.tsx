import { desc, eq, inArray } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { agencies, proposals, searches, visits } from "@/db/schema";
import { formatMoney } from "@/lib/text";
import { updateAgency } from "../actions";
import { ZoneCheckboxes } from "../ZoneCheckboxes";

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-xl border border-[var(--tinta)]/10 bg-white p-4">
      <p className="text-xs text-[var(--tinta)]/60">{label}</p>
      <p className="mt-1 font-display text-2xl">{value}</p>
    </div>
  );
}

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

function statusColor(status: string): string {
  switch (status) {
    case "published":
      return "bg-[var(--verde-claro)] text-[var(--verde-profundo)]";
    case "pending_review":
      return "bg-[var(--ambar)]/20 text-[var(--tinta)]";
    default:
      return "bg-black/5 text-[var(--tinta)]/60";
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
    <div>
      <h1 className="font-display text-2xl text-[var(--tinta)]">{agency.name}</h1>
      <p className="mt-1 text-sm text-[var(--tinta)]/60">Teléfono: {agency.phone} (no editable)</p>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">Estadísticas</p>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Propuestas totales" value={proposalRows.length} />
        <StatCard label="Publicadas" value={published} />
        <StatCard label="Por revisar" value={pendingReview} />
        <StatCard label="Descartadas" value={discarded} />
        <StatCard label="Créditos usados" value={`${agency.creditsUsed} / ${agency.creditsFree}`} />
        <StatCard label="Visitas solicitadas" value={visitsRequested} />
        <StatCard label="Visitas confirmadas" value={visitsConfirmed} />
        <StatCard label="Visitas canceladas" value={visitsCancelled} />
      </div>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">Editar</p>
      <form
        action={updateWithId}
        className="mt-2 grid grid-cols-1 gap-3 rounded-xl border border-[var(--tinta)]/10 bg-white p-5 sm:grid-cols-2"
      >
        <div>
          <label className="block text-sm font-medium">Nombre</label>
          <input
            name="name"
            defaultValue={agency.name}
            required
            className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Nombre de contacto</label>
          <input
            name="contactName"
            defaultValue={agency.contactName ?? ""}
            className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <ZoneCheckboxes selected={agency.zones} />
        </div>
        <div>
          <label className="block text-sm font-medium">Estado</label>
          <select
            name="status"
            defaultValue={agency.status}
            className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
          >
            <option value="active">Activa</option>
            <option value="paused">Pausada</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--verde-profundo)] px-4 py-2 text-sm font-medium text-white"
          >
            Guardar cambios
          </button>
        </div>
      </form>

      <p className="mt-6 text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">
        Historial de propuestas ({proposalRows.length})
      </p>
      <div className="mt-2 rounded-xl border border-[var(--tinta)]/10 bg-white">
        {proposalRows.length === 0 ? (
          <p className="p-5 text-sm text-[var(--tinta)]/50">Todavía no mandó ninguna propuesta.</p>
        ) : (
          <ul className="divide-y divide-[var(--tinta)]/10">
            {proposalRows.map(({ proposal, searchOperation, searchZones }) => (
              <li key={proposal.id} className="flex flex-wrap items-center justify-between gap-2 p-4 text-sm">
                <div>
                  <p>
                    {proposal.zoneLabel ?? "Sin zona"} ·{" "}
                    {proposal.price != null ? formatMoney(proposal.price, searchOperation) : "sin precio"}
                  </p>
                  <p className="text-xs text-[var(--tinta)]/50">
                    {proposal.createdAt.toLocaleString("es-AR")} · búsqueda en {searchZones.join(", ") || "sin especificar"}
                    {proposal.matchScore !== null ? ` · ${proposal.matchScore}% match` : ""}
                  </p>
                </div>
                <span className={`rounded-full px-2 py-0.5 text-xs ${statusColor(proposal.status)}`}>
                  {statusLabel(proposal.status)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
