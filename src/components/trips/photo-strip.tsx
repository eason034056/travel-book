import type { GalleryPhoto } from "@/types/travel";

interface PhotoStripProps {
  photos: GalleryPhoto[];
}

export function PhotoStrip({ photos }: PhotoStripProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {photos.map((photo) => (
        <figure
          key={photo.id}
          className="overflow-hidden rounded-[1.5rem] border border-paper/70 bg-paper shadow-sm transition duration-500 hover:-translate-y-1 hover:shadow-card"
        >
          <img alt={photo.alt} className="h-48 w-full object-cover" src={photo.url} />
        </figure>
      ))}
    </div>
  );
}

