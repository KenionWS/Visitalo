"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Riel lateral (desktop) que resalta el paso actual a medida que se scrollea.
 * Los pasos se pasan como `children` ya renderizados por el server component
 * llamante (cada uno con `data-scrolly-step`) — un componente de ícono de
 * una librería sin "use client" no es serializable como prop de datos hacia
 * un client component, así que este componente nunca recibe los íconos como
 * data, solo observa el DOM que ya vino armado.
 */
export function ScrollySteps({ stepCount, children }: { stepCount: number; children: React.ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const stepEls = Array.from(container.querySelectorAll<HTMLElement>("[data-scrolly-step]"));

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const idx = stepEls.indexOf(entry.target as HTMLElement);
          if (idx !== -1) setActive(idx);
        }
      },
      { threshold: 0.5, rootMargin: "-15% 0px -35% 0px" }
    );
    stepEls.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div className="grid grid-cols-1 gap-10 md:grid-cols-[64px_1fr] md:gap-12">
      <div className="hidden md:sticky md:top-28 md:flex md:h-fit md:flex-col md:items-center md:gap-3">
        {Array.from({ length: stepCount }).map((_, i) => (
          <div
            key={i}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-colors duration-300 ${
              i === active ? "bg-[var(--verde)] text-white" : "bg-[var(--tinta)]/8 text-[var(--tinta)]/35"
            }`}
          >
            {i + 1}
          </div>
        ))}
      </div>

      <div ref={containerRef} className="space-y-14 md:space-y-24">
        {children}
      </div>
    </div>
  );
}
