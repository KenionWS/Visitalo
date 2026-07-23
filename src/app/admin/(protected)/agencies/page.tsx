import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { agencies } from "@/db/schema";
import { createAgency } from "./actions";
import { ZoneCheckboxes } from "./ZoneCheckboxes";

export default async function AgenciesPage() {
  const rows = await db.select().from(agencies).orderBy(desc(agencies.createdAt));

  return (
    <div>
      <h1 className="font-display text-2xl text-[var(--tinta)]">Inmobiliarias</h1>

      <form
        action={createAgency}
        className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-[var(--tinta)]/10 bg-white p-5 sm:grid-cols-2"
      >
        <div>
          <label className="block text-sm font-medium">Teléfono (WhatsApp)</label>
          <input
            name="phone"
            required
            placeholder="5491122334455"
            className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Nombre de la inmobiliaria</label>
          <input
            name="name"
            required
            className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Nombre de contacto (opcional)</label>
          <input
            name="contactName"
            className="mt-1 w-full rounded-lg border border-[var(--tinta)]/20 p-2 text-sm"
          />
        </div>
        <div className="sm:col-span-2">
          <ZoneCheckboxes selected={[]} />
        </div>
        <div className="sm:col-span-2">
          <button
            type="submit"
            className="rounded-full bg-[var(--verde-profundo)] px-4 py-2 text-sm font-medium text-white"
          >
            Dar de alta
          </button>
        </div>
      </form>

      <ul className="mt-6 divide-y divide-[var(--tinta)]/10 rounded-xl border border-[var(--tinta)]/10 bg-white">
        {rows.length === 0 && (
          <li className="p-5 text-sm text-[var(--tinta)]/50">Todavía no diste de alta inmobiliarias.</li>
        )}
        {rows.map((a) => (
          <li key={a.id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{a.name}</p>
              <p className="text-sm text-[var(--tinta)]/60">
                {a.phone} · {a.zones.join(", ") || "sin zonas"} · créditos:{" "}
                {a.creditsFree - a.creditsUsed} libres
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-2 py-0.5 text-xs ${
                  a.status === "active"
                    ? "bg-[var(--verde-claro)] text-[var(--verde-profundo)]"
                    : "bg-black/5 text-[var(--tinta)]/60"
                }`}
              >
                {a.status}
              </span>
              <Link href={`/admin/agencies/${a.id}`} className="text-sm text-[var(--verde-profundo)] underline">
                Ver perfil
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
