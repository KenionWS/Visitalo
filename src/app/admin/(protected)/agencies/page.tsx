import Link from "next/link";
import { desc } from "drizzle-orm";
import { ChevronRight, Plus, Building2 } from "lucide-react";
import { db } from "@/db";
import { agencies } from "@/db/schema";
import { PageHeader } from "@/components/admin/PageHeader";
import { Card } from "@/components/admin/Card";
import { Badge } from "@/components/admin/Badge";
import { EmptyState } from "@/components/admin/EmptyState";
import { createAgency } from "./actions";
import { ZoneCheckboxes } from "./ZoneCheckboxes";

export default async function AgenciesPage() {
  const rows = await db.select().from(agencies).orderBy(desc(agencies.createdAt));

  return (
    <div className="space-y-6">
      <PageHeader title="Inmobiliarias" description={`${rows.length} dadas de alta`} />

      <details className="group rounded-2xl border border-[var(--tinta)]/8 bg-white shadow-sm shadow-black/[0.02] open:shadow-md">
        <summary className="flex cursor-pointer list-none items-center gap-2 px-5 py-4 text-sm font-medium text-[var(--verde-profundo)]">
          <Plus size={16} strokeWidth={2.5} className="transition-transform group-open:rotate-45" />
          Dar de alta una inmobiliaria
        </summary>

        <form action={createAgency} className="grid grid-cols-1 gap-3 border-t border-[var(--tinta)]/8 p-5 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-[var(--tinta)]/80">Teléfono (WhatsApp)</label>
            <input
              name="phone"
              required
              placeholder="5491122334455"
              className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--tinta)]/80">Nombre de la inmobiliaria</label>
            <input
              name="name"
              required
              className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[var(--tinta)]/80">Nombre de contacto (opcional)</label>
            <input
              name="contactName"
              className="mt-1.5 w-full rounded-xl border border-[var(--tinta)]/15 p-2.5 text-sm outline-none focus:border-[var(--verde)] focus:ring-2 focus:ring-[var(--verde-claro)]"
            />
          </div>
          <div className="sm:col-span-2">
            <ZoneCheckboxes selected={[]} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="rounded-full bg-[var(--verde-profundo)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Dar de alta
            </button>
          </div>
        </form>
      </details>

      <Card padded={false}>
        {rows.length === 0 ? (
          <EmptyState icon={Building2} text="Todavía no diste de alta inmobiliarias." />
        ) : (
          <ul className="divide-y divide-[var(--tinta)]/8">
            {rows.map((a) => (
              <li key={a.id}>
                <Link
                  href={`/admin/agencies/${a.id}`}
                  className="flex items-center justify-between gap-4 p-4 transition-colors hover:bg-[var(--fondo)]/60"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--tinta)]">{a.name}</p>
                    <p className="mt-0.5 truncate text-sm text-[var(--tinta)]/55">
                      {a.phone} · {a.zones.join(", ") || "sin zonas"} · créditos: {a.creditsFree - a.creditsUsed} libres
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <Badge variant={a.status === "active" ? "success" : "neutral"}>{a.status}</Badge>
                    <ChevronRight size={18} className="text-[var(--tinta)]/30" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
