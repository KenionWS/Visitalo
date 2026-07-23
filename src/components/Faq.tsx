import { Plus } from "lucide-react";

export function Faq({ items }: { items: { q: string; a: string }[] }) {
  return (
    <div className="divide-y divide-[var(--tinta)]/8 overflow-hidden rounded-2xl border border-[var(--tinta)]/10 bg-white">
      {items.map((item) => (
        <details key={item.q} className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-[var(--tinta)]">
            {item.q}
            <Plus
              size={16}
              strokeWidth={2.5}
              className="shrink-0 text-[var(--tinta)]/40 transition-transform group-open:rotate-45"
            />
          </summary>
          <p className="px-5 pb-4 text-sm leading-relaxed text-[var(--tinta)]/65">{item.a}</p>
        </details>
      ))}
    </div>
  );
}
