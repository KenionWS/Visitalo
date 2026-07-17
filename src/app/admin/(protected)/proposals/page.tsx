import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { agencies, proposals, searches } from "@/db/schema";
import { approveProposal, rejectProposal, saveProposal } from "./actions";

export default async function ProposalsQueuePage() {
  const rows = await db
    .select({
      proposal: proposals,
      agencyName: agencies.name,
      searchZones: searches.zones,
      searchBudget: searches.budgetUsdMax,
    })
    .from(proposals)
    .innerJoin(agencies, eq(proposals.agencyId, agencies.id))
    .innerJoin(searches, eq(proposals.searchId, searches.id))
    .where(eq(proposals.status, "pending_review"))
    .orderBy(desc(proposals.createdAt));

  return (
    <div>
      <h1 className="font-display text-2xl text-[var(--tinta)]">Propuestas por revisar</h1>

      {rows.length === 0 && (
        <p className="mt-4 text-sm text-[var(--tinta)]/50">No hay propuestas pendientes.</p>
      )}

      <ul className="mt-6 space-y-6">
        {rows.map(({ proposal, agencyName, searchZones, searchBudget }) => {
          const saveWithId = saveProposal.bind(null, proposal.id);
          const approveWithId = approveProposal.bind(null, proposal.id);
          const rejectWithId = rejectProposal.bind(null, proposal.id);
          const rawText = (proposal.sourceRaw as { text?: string } | null)?.text ?? "";
          const attributes = (proposal.attributes as Record<string, boolean>) ?? {};
          const attributesList = Object.keys(attributes)
            .filter((k) => attributes[k])
            .join(", ");

          return (
            <li key={proposal.id} className="rounded-xl border border-[var(--tinta)]/10 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-[var(--tinta)]/60">
                <span>
                  <strong>{agencyName}</strong> · {proposal.matchScore ?? 0}% match
                </span>
                <span>
                  Búsqueda: {searchZones.join(", ") || "sin especificar"} · hasta USD{" "}
                  {searchBudget?.toLocaleString("es-AR") ?? "sin especificar"}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">
                    Mensaje original
                  </p>
                  <p className="mt-1 whitespace-pre-wrap rounded-lg bg-[var(--fondo)] p-3 text-sm">
                    {rawText || "(sin texto)"}
                  </p>
                </div>

                <form action={saveWithId} className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-wide text-[var(--tinta)]/40">
                    Ficha normalizada (editable)
                  </p>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      name="priceUsd"
                      type="number"
                      defaultValue={proposal.priceUsd ?? ""}
                      placeholder="Precio USD"
                      className="rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
                    />
                    <input
                      name="areaM2"
                      type="number"
                      defaultValue={proposal.areaM2 ?? ""}
                      placeholder="m²"
                      className="rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
                    />
                    <input
                      name="rooms"
                      type="number"
                      defaultValue={proposal.rooms ?? ""}
                      placeholder="Ambientes"
                      className="rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
                    />
                  </div>
                  <input
                    name="zoneLabel"
                    defaultValue={proposal.zoneLabel ?? ""}
                    placeholder="Zona aproximada"
                    className="w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
                  />
                  <textarea
                    name="description"
                    defaultValue={proposal.description ?? ""}
                    rows={3}
                    placeholder="Descripción"
                    className="w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
                  />
                  <input
                    name="attributes"
                    defaultValue={attributesList}
                    placeholder="Atributos (balcon, cochera, apto_credito...)"
                    className="w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
                  />

                  <div className="flex flex-wrap gap-2 pt-1">
                    <button
                      type="submit"
                      className="rounded-full border border-[var(--tinta)]/20 px-4 py-2 text-sm"
                    >
                      Guardar
                    </button>
                    <button
                      type="submit"
                      formAction={approveWithId}
                      className="rounded-full bg-[var(--verde-profundo)] px-4 py-2 text-sm text-white"
                    >
                      Publicar
                    </button>
                    <button
                      type="submit"
                      formAction={rejectWithId}
                      className="rounded-full border border-red-300 px-4 py-2 text-sm text-red-600"
                    >
                      Rechazar
                    </button>
                  </div>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
