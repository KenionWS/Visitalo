/**
 * Fórmula simple de match (spec sección 5.4: "filtro por zona + presupuesto
 * ±10% + must-haves"). No es ML, es una heurística de 0-100 para ordenar y
 * mostrar el "% match" en la shortlist.
 */

type SearchForMatch = {
  zones: string[];
  budgetMax: number | null;
  mustHaves: string[];
};

type ProposalForMatch = {
  zoneLabel: string | null;
  price: number | null;
  attributes: Record<string, unknown> | null;
};

const ZONE_WEIGHT = 40;
const BUDGET_WEIGHT = 40;
const MUST_HAVES_WEIGHT = 20;
const BUDGET_TOLERANCE = 1.1; // ±10%

function zoneMatches(zoneLabel: string, searchZones: string[]): boolean {
  const label = zoneLabel.toLowerCase();
  return searchZones.some((z) => {
    const zone = z.toLowerCase();
    return label.includes(zone) || zone.includes(label);
  });
}

export function computeMatchScore(search: SearchForMatch, proposal: ProposalForMatch): number {
  let score = 0;

  if (proposal.zoneLabel && zoneMatches(proposal.zoneLabel, search.zones)) {
    score += ZONE_WEIGHT;
  }

  if (search.budgetMax && proposal.price) {
    if (proposal.price <= search.budgetMax * BUDGET_TOLERANCE) {
      score += BUDGET_WEIGHT;
    }
  } else if (!search.budgetMax) {
    score += BUDGET_WEIGHT;
  }

  if (search.mustHaves.length === 0) {
    score += MUST_HAVES_WEIGHT;
  } else {
    const attrs = proposal.attributes ?? {};
    const matched = search.mustHaves.filter((m) => attrs[m] === true).length;
    score += Math.round((matched / search.mustHaves.length) * MUST_HAVES_WEIGHT);
  }

  return Math.min(100, score);
}
