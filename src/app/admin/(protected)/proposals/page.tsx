import { desc, eq } from "drizzle-orm";
import { AlertTriangle, Save, CheckCircle2, XCircle, Inbox } from "lucide-react";
import { db } from "@/db";
import { agencies, proposals, searches } from "@/db/schema";
import { formatMoney } from "@/lib/text";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { Badge } from "@/components/admin/Badge";
import { Button } from "@/components/admin/Button";
import { EmptyState } from "@/components/admin/EmptyState";
import { approveProposal, rejectProposal, saveProposal } from "./actions";

const inputClass =
  "rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]";

export default async function ProposalsQueuePage() {
  const rows = await db
    .select({
      proposal: proposals,
      agencyName: agencies.name,
      searchZones: searches.zones,
      searchBudget: searches.budgetMax,
      searchOperation: searches.operation,
    })
    .from(proposals)
    .innerJoin(agencies, eq(proposals.agencyId, agencies.id))
    .innerJoin(searches, eq(proposals.searchId, searches.id))
    .where(eq(proposals.status, "pending_review"))
    .orderBy(desc(proposals.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Propuestas por revisar"
        description={rows.length > 0 ? `${rows.length} esperando aprobación` : undefined}
      />

      {rows.length === 0 ? (
        <Card padded={false}>
          <EmptyState icon={Inbox} text="No hay propuestas pendientes." />
        </Card>
      ) : (
        <ul className="space-y-5">
          {rows.map(({ proposal, agencyName, searchZones, searchBudget, searchOperation }) => {
            const saveWithId = saveProposal.bind(null, proposal.id);
            const approveWithId = approveProposal.bind(null, proposal.id);
            const rejectWithId = rejectProposal.bind(null, proposal.id);
            const rawText = (proposal.sourceRaw as { text?: string } | null)?.text ?? "";
            const attributes = (proposal.attributes as Record<string, boolean>) ?? {};
            const attributesList = Object.keys(attributes)
              .filter((k) => attributes[k])
              .join(", ");

            return (
              <li key={proposal.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="font-semibold text-[var(--tinta)]">{agencyName}</span>
                      <Badge variant="info">{proposal.matchScore ?? 0}% match</Badge>
                      <Badge variant="neutral">{searchOperation === "alquiler" ? "alquiler" : "venta"}</Badge>
                    </div>
                    <span className="text-sm text-[var(--tinta)]/55">
                      Búsqueda: {searchZones.join(", ") || "sin especificar"} · hasta{" "}
                      {formatMoney(searchBudget, searchOperation)}
                    </span>
                  </div>

                  {proposal.photoWarning && (
                    <div className="mt-3 flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
                      <AlertTriangle size={16} strokeWidth={2} className="mt-0.5 shrink-0" />
                      <span>Posible dato de contacto visible en una foto: {proposal.photoWarning}</span>
                    </div>
                  )}

                  <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
                    <div>
                      {proposal.photos.length > 0 && (
                        <div className="mb-3 flex gap-2 overflow-x-auto">
                          {proposal.photos.map((url) => (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              key={url}
                              src={url}
                              alt="Foto de la propiedad"
                              className="h-24 w-24 flex-shrink-0 rounded-xl object-cover"
                            />
                          ))}
                        </div>
                      )}
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tinta)]/40">
                        Mensaje original
                      </p>
                      <p className="mt-1.5 whitespace-pre-wrap rounded-xl bg-[var(--fondo)] p-3 text-sm text-[var(--tinta)]/80">
                        {rawText || "(sin texto)"}
                      </p>
                    </div>

                    <form action={saveWithId} className="space-y-2.5">
                      <p className="text-xs font-semibold uppercase tracking-wider text-[var(--tinta)]/40">
                        Ficha normalizada (editable)
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        <input
                          name="price"
                          type="number"
                          defaultValue={proposal.price ?? ""}
                          placeholder={searchOperation === "alquiler" ? "Precio ARS (mensual)" : "Precio USD"}
                          className={inputClass}
                        />
                        <input
                          name="areaM2"
                          type="number"
                          defaultValue={proposal.areaM2 ?? ""}
                          placeholder="m²"
                          className={inputClass}
                        />
                        <input
                          name="rooms"
                          type="number"
                          defaultValue={proposal.rooms ?? ""}
                          placeholder="Ambientes"
                          className={inputClass}
                        />
                      </div>
                      <input
                        name="zoneLabel"
                        defaultValue={proposal.zoneLabel ?? ""}
                        placeholder="Zona aproximada"
                        className={`w-full ${inputClass}`}
                      />
                      <textarea
                        name="description"
                        defaultValue={proposal.description ?? ""}
                        rows={3}
                        placeholder="Descripción"
                        className={`w-full ${inputClass}`}
                      />
                      <input
                        name="attributes"
                        defaultValue={attributesList}
                        placeholder="Atributos (balcon, cochera, apto_credito...)"
                        className={`w-full ${inputClass}`}
                      />

                      <div className="flex flex-wrap gap-2 pt-1">
                        <Button type="submit" variant="secondary">
                          <span className="inline-flex items-center gap-1.5">
                            <Save size={15} strokeWidth={2} />
                            Guardar
                          </span>
                        </Button>
                        <Button type="submit" formAction={approveWithId} variant="primary">
                          <span className="inline-flex items-center gap-1.5">
                            <CheckCircle2 size={15} strokeWidth={2} />
                            Publicar
                          </span>
                        </Button>
                        <Button type="submit" formAction={rejectWithId} variant="danger">
                          <span className="inline-flex items-center gap-1.5">
                            <XCircle size={15} strokeWidth={2} />
                            Rechazar
                          </span>
                        </Button>
                      </div>
                    </form>
                  </div>
                </Card>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
