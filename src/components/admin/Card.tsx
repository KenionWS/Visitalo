import type { ReactNode } from "react";

export function Card({
  children,
  className = "",
  padded = true,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border border-[var(--tinta)]/8 bg-white shadow-sm shadow-black/[0.02] ${
        padded ? "p-5" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}
