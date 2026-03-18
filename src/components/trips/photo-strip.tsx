"use client";

import { useState } from "react";
import type { GalleryPhoto } from "@/types/travel";
import { PhotoLightbox } from "@/components/trips/photo-lightbox";

interface PhotoStripProps {
  photos: GalleryPhoto[];
}

export function PhotoStrip({ photos }: PhotoStripProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) return null;

  const lightboxPhotos = photos.map((p) => ({ id: p.id, url: p.url, alt: p.alt }));

  return (
    <>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {photos.map((photo, index) => (
          <button
            key={photo.id}
            type="button"
            className="flex-shrink-0 overflow-hidden rounded-[1.5rem] border border-paper/70 bg-paper shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-card focus:outline-none focus:ring-2 focus:ring-olive/50"
            onClick={() => setLightboxIndex(index)}
          >
            <img alt={photo.alt} className="h-48 max-w-none cursor-pointer" src={photo.url} />
          </button>
        ))}
      </div>
      {lightboxIndex !== null && (
        <PhotoLightbox
          photos={lightboxPhotos}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}

