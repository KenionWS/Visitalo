/** Isotipo de Visitalo: burbuja de chat con casa adentro. Colores de marca embebidos (no hereda currentColor) para que se vea igual en cualquier fondo. */
export function VisitaloIso({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 110 104" className={className} role="img" aria-label="Visitalo">
      <rect x="10" y="8" width="90" height="64" rx="16" fill="#0C4A31" />
      <polygon points="32,70 32,96 56,70" fill="#0C4A31" />
      <path
        d="M32 48 L55 28 L78 48"
        fill="none"
        stroke="#F6F3EC"
        strokeWidth="9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <rect x="49" y="44" width="12" height="14" rx="2" fill="#E8A13C" />
    </svg>
  );
}
