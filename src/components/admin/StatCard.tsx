import Link from "next/link";
import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  icon: Icon,
  href,
  tone = "verde",
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  tone?: "verde" | "ambar" | "neutral";
}) {
  const toneClasses = {
    verde: "bg-[var(--verde-claro)] text-[var(--verde-profundo)]",
    ambar: "bg-[var(--ambar)]/15 text-[#7a4f0f]",
    neutral: "bg-black/[0.05] text-[var(--tinta)]/60",
  }[tone];

  const content = (
    <div className="group flex items-center gap-3 rounded-2xl border border-[var(--tinta)]/8 bg-white p-4 shadow-sm shadow-black/[0.02] transition-shadow hover:shadow-md">
      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${toneClasses}`}>
        <Icon size={19} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="truncate text-xs font-medium text-[var(--tinta)]/55">{label}</p>
        <p className="font-display text-2xl leading-tight text-[var(--tinta)]">{value}</p>
      </div>
    </div>
  );

  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}
