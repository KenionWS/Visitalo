"use client";

import { useEffect, useState } from "react";

/** Overlay a pantalla completa para ver una foto más grande, con navegación entre varias. */
export function Lightbox({
  photos,
  index,
  onClose,
}: {
  photos: string[];
  index: number;
  onClose: () => void;
}) {
  const [current, setCurrent] = useState(index);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") setCurrent((i) => (i - 1 + photos.length) % photos.length);
      if (e.key === "ArrowRight") setCurrent((i) => (i + 1) % photos.length);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photos.length, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4"
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar"
        className="absolute right-4 top-4 flex h-9 w-9 min-h-0 items-center justify-center rounded-full bg-white/10 text-xl text-white"
      >
        ×
      </button>

      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[current]}
        alt=""
        className="max-h-full max-w-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrent((i) => (i - 1 + photos.length) % photos.length);
            }}
            aria-label="Foto anterior"
            className="absolute left-4 top-1/2 flex h-10 w-10 min-h-0 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setCurrent((i) => (i + 1) % photos.length);
            }}
            aria-label="Foto siguiente"
            className="absolute right-4 top-1/2 flex h-10 w-10 min-h-0 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-2xl text-white"
          >
            ›
          </button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
            {current + 1}/{photos.length}
          </div>
        </>
      )}
    </div>
  );
}
