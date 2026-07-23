"use client";

import { useState } from "react";
import { Lightbox } from "@/components/Lightbox";

export function PhotoCarousel({ photos, alt }: { photos: string[]; alt: string }) {
  const [index, setIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  if (photos.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center bg-[var(--verde-claro)] text-[var(--verde-profundo)]">
        <span className="font-display text-lg">{alt}</span>
      </div>
    );
  }

  return (
    <div className="relative h-40 w-full overflow-hidden bg-[var(--verde-claro)]">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photos[index]}
        alt={alt}
        className="h-full w-full cursor-zoom-in object-cover"
        onClick={() => setLightboxOpen(true)}
      />

      {photos.length > 1 && (
        <>
          <button
            type="button"
            onClick={() => setIndex((i) => (i - 1 + photos.length) % photos.length)}
            aria-label="Foto anterior"
            className="absolute left-2 top-1/2 flex h-7 w-7 min-h-0 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-sm text-white"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => setIndex((i) => (i + 1) % photos.length)}
            aria-label="Foto siguiente"
            className="absolute right-2 top-1/2 flex h-7 w-7 min-h-0 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-sm text-white"
          >
            ›
          </button>
          <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1.5">
            {photos.map((photo, i) => (
              <button
                key={photo}
                type="button"
                onClick={() => setIndex(i)}
                aria-label={`Ver foto ${i + 1}`}
                className={`h-1.5 w-1.5 min-h-0 rounded-full p-0 ${i === index ? "bg-white" : "bg-white/40"}`}
              />
            ))}
          </div>
          <div className="absolute right-2 top-2 rounded-full bg-black/40 px-2 py-0.5 text-xs text-white">
            {index + 1}/{photos.length}
          </div>
        </>
      )}

      {lightboxOpen && <Lightbox photos={photos} index={index} onClose={() => setLightboxOpen(false)} />}
    </div>
  );
}
