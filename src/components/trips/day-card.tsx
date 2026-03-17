import type { TripDay } from "@/types/travel";
import { cn, formatDisplayDate } from "@/lib/utils";

interface DayCardProps {
  day: TripDay;
  className?: string;
}

export function DayCard({ day, className }: DayCardProps) {
  return (
    <article
      className={cn(
        "grid gap-6 rounded-[2rem] border border-ink/10 bg-paper/90 p-5 shadow-card backdrop-blur md:grid-cols-[1.05fr_0.95fr] md:p-7",
        className
      )}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.35em] text-olive">Day {day.dayIndex}</p>
            <h3 className="mt-2 font-display text-3xl leading-none text-ink">Day {day.dayIndex}</h3>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/55">{day.cityLabel}</p>
            <p className="mt-2 text-sm text-ink/70">{formatDisplayDate(day.date)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-4xl leading-none text-ink">{day.title}</h4>
          <p className="max-w-xl text-base leading-7 text-ink/80">{day.summary}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {day.stops.map((stop) => (
            <span
              key={stop.id}
              className="rounded-full border border-olive/20 bg-sand/70 px-3 py-1.5 text-xs uppercase tracking-[0.2em] text-ink/75"
            >
              {stop.name}
            </span>
          ))}
        </div>

        <div className="rounded-[1.5rem] border border-terracotta/20 bg-terracotta/10 p-4">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-terracotta">Highlight moment</p>
          <p className="mt-3 font-display text-2xl leading-tight text-ink">{day.highlightMoment}</p>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-ink/78">{day.journal}</p>
      </div>

      <div className="grid gap-4 md:grid-rows-[1.4fr_0.9fr]">
        <div
          className="relative overflow-hidden rounded-[1.75rem] border border-ink/10 bg-sand"
          style={{
            backgroundImage: `linear-gradient(180deg, rgba(31,42,58,0.08), rgba(31,42,58,0.32)), url(${day.heroPhotoUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center"
          }}
        >
          <div className="absolute inset-x-5 bottom-5 rounded-[1.4rem] bg-paper/88 p-4 backdrop-blur">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-olive">Memory note</p>
            <p className="mt-2 text-sm leading-6 text-ink/80">{day.summary}</p>
          </div>
        </div>

        <div className="grid gap-3 rounded-[1.75rem] border border-ink/10 bg-sand/50 p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-olive">Gallery</p>
            <p className="text-xs text-ink/55">{day.gallery.length} photo{day.gallery.length === 1 ? "" : "s"}</p>
          </div>
          <div className="grid grid-cols-[1.5fr_1fr] gap-3">
            {day.gallery.slice(0, 2).map((photo, index) => (
              <div
                key={photo.id}
                className={cn(
                  "overflow-hidden rounded-[1.2rem] border border-paper/50 bg-paper shadow-sm",
                  index === 0 ? "min-h-36" : "min-h-36"
                )}
              >
                <img
                  alt={photo.alt}
                  className="h-full w-full object-cover transition duration-500 hover:scale-[1.03]"
                  src={photo.url}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
