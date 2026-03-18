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
        "grid gap-5 rounded-2xl border border-ink/10 bg-paper/90 p-4 shadow-card backdrop-blur sm:gap-6 sm:rounded-[2rem] sm:p-5 md:grid-cols-[1.05fr_0.95fr] md:p-7",
        className
      )}
    >
      <div className="space-y-5">
        <div className="flex items-start justify-between gap-5">
          <div>
            <p className="font-mono text-[0.7rem] uppercase tracking-[0.35em] text-olive">Day {day.dayIndex}</p>
            <h3 className="mt-2 font-display text-2xl leading-none text-ink sm:text-3xl">Day {day.dayIndex}</h3>
          </div>
          <div className="text-right">
            <p className="font-mono text-xs uppercase tracking-[0.25em] text-ink/55">{day.cityLabel}</p>
            <p className="mt-2 text-sm text-ink/70">{formatDisplayDate(day.date)}</p>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-display text-2xl leading-none text-ink sm:text-4xl">{day.title}</h4>
          <p className="max-w-xl text-base leading-7 text-ink/80">{day.summary}</p>
        </div>

        {/* Route timeline */}
        {day.stops.length > 0 && (
          <div className="rounded-xl border border-ink/8 bg-sand/30 p-3 sm:rounded-[1.5rem] sm:p-4">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-olive">Route</p>
            <div className="mt-3 space-y-0">
              {day.stops.map((stop, index) => (
                <div key={stop.id} className="flex items-stretch gap-3">
                  <div className="flex flex-col items-center">
                    <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-terracotta text-[0.65rem] font-medium text-paper">
                      {index + 1}
                    </div>
                    {index < day.stops.length - 1 && (
                      <div className="w-px flex-1 bg-olive/20" />
                    )}
                  </div>
                  <div className={cn("pb-3", index === day.stops.length - 1 && "pb-0")}>
                    <p className="text-sm font-medium leading-6 text-ink/80">{stop.name}</p>
                    {stop.originalUrl && (
                      <a
                        className="text-xs text-olive hover:text-terracotta"
                        href={stop.originalUrl}
                        rel="noopener noreferrer"
                        target="_blank"
                      >
                        View on Google Maps
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-terracotta/20 bg-terracotta/10 p-3 sm:rounded-[1.5rem] sm:p-4">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-terracotta">Best moment</p>
          <p className="mt-2 font-display text-xl leading-tight text-ink sm:mt-3 sm:text-2xl">{day.highlightMoment}</p>
        </div>

        <p className="max-w-2xl text-sm leading-7 text-ink/78">{day.journal}</p>
      </div>

      <div className="grid gap-4 md:grid-rows-[1.4fr_0.9fr]">
        <div
          className="relative min-h-[12rem] overflow-hidden rounded-xl border border-ink/10 bg-sand sm:min-h-0 sm:rounded-[1.75rem]"
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

        <div className="grid gap-3 rounded-xl border border-ink/10 bg-sand/50 p-3 sm:rounded-[1.75rem] sm:p-4">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-olive">Gallery</p>
            <p className="text-xs text-ink/55">{day.gallery.length} photo{day.gallery.length === 1 ? "" : "s"}</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {day.gallery.map((photo) => (
              <figure
                key={photo.id}
                className="flex-shrink-0 overflow-hidden rounded-[1.2rem] border border-paper/50 bg-paper shadow-sm"
              >
                <img
                  alt={photo.alt}
                  className="h-36 max-w-none transition duration-500 hover:scale-[1.03]"
                  src={photo.url}
                />
              </figure>
            ))}
          </div>
        </div>
      </div>
    </article>
  );
}
