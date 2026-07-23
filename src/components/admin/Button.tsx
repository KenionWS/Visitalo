import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: "bg-[var(--verde-profundo)] text-white",
  secondary: "border border-[var(--tinta)]/15 bg-white text-[var(--tinta)]/80",
  danger: "border border-red-200 bg-white text-red-600",
  ghost: "text-[var(--tinta)]/60",
};

export function Button({
  variant = "secondary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      {...props}
      className={`rounded-full px-4 py-2 text-sm font-medium disabled:opacity-50 ${VARIANT_CLASSES[variant]} ${className}`}
    />
  );
}
