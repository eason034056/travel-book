import type { GalleryPhoto } from "@/types/travel";

interface PhotoStripProps {
  photos: GalleryPhoto[];
}

export function PhotoStrip({ photos }: PhotoStripProps) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2">
      {photos.map((photo) => (
        <figure
          key={photo.id}
          className="flex-shrink-0 overflow-hidden rounded-[1.5rem] border border-paper/70 bg-paper shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-card"
        >
          <img alt={photo.alt} className="h-48 max-w-none" src={photo.url} />
        </figure>
      ))}
    </div>
  );
}

