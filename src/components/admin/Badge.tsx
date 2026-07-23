export type BadgeVariant = "success" | "warning" | "neutral" | "danger" | "info";

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: "bg-[var(--verde-claro)] text-[var(--verde-profundo)]",
  warning: "bg-[var(--ambar)]/20 text-[#7a4f0f]",
  neutral: "bg-black/[0.06] text-[var(--tinta)]/60",
  danger: "bg-red-50 text-red-600",
  info: "bg-blue-50 text-blue-700",
};

export function Badge({
  children,
  variant = "neutral",
  className = "",
}: {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${VARIANT_CLASSES[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
