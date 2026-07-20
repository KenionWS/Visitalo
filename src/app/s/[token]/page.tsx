import type { Metadata } from "next";
import { and, desc, eq, inArray, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { proposalEvents, proposals, relayThreads, searches, visits } from "@/db/schema";
import { DiscardButton } from "./DiscardButton";
import { FavoriteButton, RequestVisitButton, AskQuestionForm } from "./ActionButtons";

export const metadata: Metadata = {
  title: "Tu shortlist — visitalo.",
  robots: { index: false, follow: false },
};

function paymentMethodLabel(method: string | null): string {
  switch (method) {
    case "contado":
      return "Contado";
    case "credito":
      return "Crédito";
    case "mixto":
      return "Mixto";
    default:
      return "Sin especificar";
  }
}

function isNew(createdAt: Date): boolean {
  return Date.now() - createdAt.getTime() < 48 * 60 * 60 * 1000;
}

function formatAttributeLabel(key: string): string {
  return key.replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
}

export default async function ShortlistPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const [search] = await db.select().from(searches).where(eq(searches.shortlistToken, token)).limit(1);
  if (!search) notFound();

  const proposalRows = await db
    .select()
    .from(proposals)
    .where(and(eq(proposals.searchId, search.id), ne(proposals.status, "withdrawn")))
    .orderBy(desc(proposals.createdAt));

  const proposalIds = proposalRows.map((p) => p.id);
  const events =
    proposalIds.length > 0
      ? await db
          .select()
          .from(proposalEvents)
          .where(eq(proposalEvents.type, "favorite"))
          .orderBy(proposalEvents.createdAt)
      : [];

  const favoritedByProposal = new Map<string, boolean>();
  for (const ev of events) {
    if (!proposalIds.includes(ev.proposalId)) continue;
    const active = Boolean((ev.payload as { active?: boolean } | null)?.active);
    // events vienen ordenados por id de inserción ascendente; nos quedamos con el último.
    favoritedByProposal.set(ev.proposalId, active);
  }

  const requestedVisits =
    proposalIds.length > 0
      ? await db
          .select({ proposalId: visits.proposalId })
          .from(visits)
          .where(and(inArray(visits.proposalId, proposalIds), ne(visits.status, "cancelled")))
      : [];
  const visitRequestedByProposal = new Set(requestedVisits.map((v) => v.proposalId));

  const answeredQuestions =
    proposalIds.length > 0
      ? await db
          .select()
          .from(relayThreads)
          .where(and(inArray(relayThreads.proposalId, proposalIds), eq(relayThreads.status, "answered")))
          .orderBy(relayThreads.answeredAt)
      : [];
  const questionsByProposal = new Map<string, typeof answeredQuestions>();
  for (const q of answeredQuestions) {
    const list = questionsByProposal.get(q.proposalId) ?? [];
    list.push(q);
    questionsByProposal.set(q.proposalId, list);
  }

  const publishedProposals = proposalRows.filter((p) => p.status !== "discarded");
  const discardedProposals = proposalRows.filter((p) => p.status === "discarded");

  return (
    <div className="mx-auto flex min-h-screen max-w-2xl flex-col">
      <header className="bg-[var(--verde-profundo)] px-5 py-6 text-white">
        <p className="font-display text-xl">
          visitalo<span className="text-[var(--ambar)]">.</span>
        </p>
        <h1 className="mt-3 font-display text-2xl">
          Tu búsqueda {search.operation === "alquiler" ? "de alquiler" : "de compra"}
        </h1>
        <dl className="mt-3 space-y-1 text-sm text-white/90">
          <div>
            <dt className="inline font-medium">Zona: </dt>
            <dd className="inline">{search.zones.join(", ") || "sin especificar"}</dd>
          </div>
          <div>
            <dt className="inline font-medium">Presupuesto: </dt>
            <dd className="inline">
              hasta USD {search.budgetUsdMax?.toLocaleString("es-AR") ?? "sin especificar"}
              {search.operation === "alquiler" ? " por mes" : ""}
            </dd>
          </div>
          {search.operation !== "alquiler" && (
            <div>
              <dt className="inline font-medium">Forma de pago: </dt>
              <dd className="inline">{paymentMethodLabel(search.paymentMethod)}</dd>
            </div>
          )}
        </dl>
      </header>

      <main className="flex-1 px-5 py-6">
        {publishedProposals.length === 0 ? (
          <p className="mt-10 text-center text-[var(--tinta)]/60">
            Todavía no tenés propuestas. Te avisamos por WhatsApp apenas llegue la primera.
          </p>
        ) : (
          <ul className="space-y-4">
            {publishedProposals.map((proposal) => {
              const favorited = favoritedByProposal.get(proposal.id) ?? false;
              const attributeChips = Object.entries(
                (proposal.attributes as Record<string, unknown>) ?? {}
              ).filter(([, v]) => v === true);

              return (
                <li
                  key={proposal.id}
                  className="overflow-hidden rounded-2xl border border-[var(--tinta)]/10 bg-white shadow-sm"
                >
                  <div className="flex h-40 items-center justify-center bg-[var(--verde-claro)] text-[var(--verde-profundo)]">
                    {proposal.photos[0] ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={proposal.photos[0]}
                        alt={proposal.zoneLabel ?? "Propiedad"}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="font-display text-lg">{proposal.zoneLabel ?? "Sin foto"}</span>
                    )}
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-display text-xl">
                          USD {proposal.priceUsd?.toLocaleString("es-AR") ?? "consultar"}
                        </p>
                        <p className="text-sm text-[var(--tinta)]/70">
                          {proposal.zoneLabel ?? "Zona sin especificar"}
                          {proposal.areaM2 ? ` · ${proposal.areaM2} m²` : ""}
                          {proposal.rooms ? ` · ${proposal.rooms} amb.` : ""}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {isNew(proposal.createdAt) && (
                          <span className="rounded-full bg-[var(--ambar)] px-2 py-0.5 text-xs font-semibold text-[var(--tinta)]">
                            Nueva
                          </span>
                        )}
                        {proposal.matchScore !== null && (
                          <span className="text-xs text-[var(--verde-profundo)]">
                            {proposal.matchScore}% match
                          </span>
                        )}
                      </div>
                    </div>

                    {proposal.description && (
                      <p className="mt-2 text-sm text-[var(--tinta)]/80">{proposal.description}</p>
                    )}

                    {attributeChips.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {attributeChips.map(([key]) => (
                          <span
                            key={key}
                            className="rounded-full bg-[var(--fondo)] px-2 py-0.5 text-xs text-[var(--tinta)]/70"
                          >
                            {formatAttributeLabel(key)}
                          </span>
                        ))}
                      </div>
                    )}

                    {(questionsByProposal.get(proposal.id)?.length ?? 0) > 0 && (
                      <div className="mt-3 space-y-2 border-t border-[var(--tinta)]/10 pt-3">
                        {questionsByProposal.get(proposal.id)!.map((q) => (
                          <div key={q.id} className="text-sm">
                            <p className="text-[var(--tinta)]/60">Vos: {q.question}</p>
                            <p className="text-[var(--tinta)]">Inmobiliaria: {q.answer}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <FavoriteButton token={token} proposalId={proposal.id} favorited={favorited} />
                      <DiscardButton token={token} proposalId={proposal.id} />
                      <AskQuestionForm token={token} proposalId={proposal.id} />
                      <RequestVisitButton
                        token={token}
                        proposalId={proposal.id}
                        alreadyRequested={visitRequestedByProposal.has(proposal.id)}
                      />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {discardedProposals.length > 0 && (
          <p className="mt-6 text-center text-xs text-[var(--tinta)]/40">
            Descartaste {discardedProposals.length}{" "}
            {discardedProposals.length === 1 ? "propuesta" : "propuestas"}.
          </p>
        )}
      </main>
    </div>
  );
}
