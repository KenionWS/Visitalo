import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { agencies } from "@/db/schema";
import { updateAgency } from "../actions";
import { ZoneCheckboxes } from "../ZoneCheckboxes";

export default async function EditAgencyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [agency] = await db.select().from(agencies).where(eq(agencies.id, id)).limit(1);
  if (!agency) notFound();

  const updateWithId = updateAgency.bind(null, agency.id);

  return (
    <div>
      <h1 className="font-display text-2xl text-[var(--tinta)]">Editar inmobiliaria</h1>
      <p className="mt-1 text-sm text-[var(--tinta)]/60">Teléfono: {agency.phone} (no editable)</p>

      <form
        action={updateWithId}
        className="mt-6 grid grid-cols-1 gap-3 rounded-xl border border-[var(--tinta)]/10 bg-white p-5 sm:grid-cols-2"
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
    </div>
  );
}
