import { CABA_ZONES } from "@/lib/caba-zones";

/** Grilla de checkboxes de barrios — sin JS de cliente, el form nativo junta todos los "zones" tildados via formData.getAll(). */
export function ZoneCheckboxes({ selected }: { selected: string[] }) {
  const selectedSet = new Set(selected);

  return (
    <div>
      <label className="block text-sm font-medium">Zonas</label>
      <div className="mt-1 grid max-h-56 grid-cols-2 gap-x-3 gap-y-1 overflow-y-auto rounded-lg border border-[var(--tinta)]/20 p-3 sm:grid-cols-3">
        {CABA_ZONES.map((zone) => (
          <label key={zone} className="flex items-center gap-1.5 text-sm">
            <input type="checkbox" name="zones" value={zone} defaultChecked={selectedSet.has(zone)} />
            {zone}
          </label>
        ))}
      </div>
    </div>
  );
}
