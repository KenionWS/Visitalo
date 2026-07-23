"use client";

import { useState } from "react";
import { Lightbox } from "@/components/Lightbox";

export function PhotoThumbnails({ photos, alt }: { photos: string[]; alt: string }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  return (
    <div className="mb-3 flex gap-2 overflow-x-auto">
      {photos.map((url, i) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          key={url}
          src={url}
          alt={alt}
          className="h-24 w-24 flex-shrink-0 cursor-zoom-in rounded-xl object-cover"
          onClick={() => setOpenIndex(i)}
        />
      ))}

      {openIndex !== null && (
        <Lightbox photos={photos} index={openIndex} onClose={() => setOpenIndex(null)} />
      )}
    </div>
  );
}
