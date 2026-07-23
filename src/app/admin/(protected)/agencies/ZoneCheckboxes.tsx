import { CABA_ZONES } from "@/lib/caba-zones";

/** Chips de barrios — sin JS de cliente: el checkbox real queda oculto (sr-only) y el label se pinta con :has(:checked). El form nativo junta todos los "zones" tildados via formData.getAll(). */
export function ZoneCheckboxes({ selected }: { selected: string[] }) {
  const selectedSet = new Set(selected);

  return (
    <div>
      <label className="block text-sm font-medium text-[var(--tinta)]/80">Zonas</label>
      <div className="mt-1.5 flex max-h-56 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[var(--tinta)]/15 p-3">
        {CABA_ZONES.map((zone) => (
          <label
            key={zone}
            className="cursor-pointer rounded-full border border-[var(--tinta)]/15 px-3 py-1.5 text-sm text-[var(--tinta)]/65 transition-colors has-[:checked]:border-[var(--verde)] has-[:checked]:bg-[var(--verde-claro)] has-[:checked]:font-medium has-[:checked]:text-[var(--verde-profundo)]"
          >
            <input
              type="checkbox"
              name="zones"
              value={zone}
              defaultChecked={selectedSet.has(zone)}
              className="sr-only"
            />
            {zone}
          </label>
        ))}
      </div>
    </div>
  );
}
