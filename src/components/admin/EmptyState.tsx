import type { LucideIcon } from "lucide-react";

export function EmptyState({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--fondo)] text-[var(--tinta)]/40">
        <Icon size={20} strokeWidth={1.75} />
      </div>
      <p className="text-sm text-[var(--tinta)]/50">{text}</p>
    </div>
  );
}
