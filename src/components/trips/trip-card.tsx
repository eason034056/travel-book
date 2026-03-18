import type { TripSummary } from "@/types/travel";
import { formatCompanionLabel, formatDisplayDate } from "@/lib/utils";

interface TripCardProps {
  trip: TripSummary;
}

export function TripCard({ trip }: TripCardProps) {
  return (
    <article className="group relative overflow-hidden rounded-[2rem] border border-ink/10 bg-paper shadow-card transition duration-500 hover:-translate-y-1 hover:shadow-float">
      <div
        className="relative min-h-[25rem] overflow-hidden"
        style={{
          backgroundImage: `linear-gradient(180deg, rgba(31,42,58,0.04), rgba(31,42,58,0.66)), url(${trip.coverPhotoUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }}
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(246,241,231,0.18),transparent_40%)] opacity-70" />
        <div className="absolute inset-0 translate-y-4 bg-gradient-to-t from-ink/90 via-ink/15 to-transparent transition duration-500 group-hover:translate-y-0" />
        <div className="relative flex min-h-[25rem] flex-col justify-end gap-5 p-7 text-paper md:p-8">
          <div className="flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.4em] text-paper/80">
            <span>{trip.daysCount} days</span>
            <span className="h-px w-10 bg-paper/40" />
            <span>{trip.stopCount} stops</span>
          </div>

          <div className="space-y-3">
            <h2 className="font-display text-4xl leading-none md:text-5xl">{trip.title}</h2>
            <p className="max-w-sm text-sm text-paper/90 md:text-base">{trip.summary}</p>
          </div>

          <div className="flex flex-wrap items-center gap-4 border-t border-paper/20 pt-4 text-sm text-paper/80">
            <span>
              {formatDisplayDate(trip.startDate)} - {formatDisplayDate(trip.endDate)}
            </span>
            <span>{formatCompanionLabel(trip.travelCompanions)}</span>
          </div>
        </div>
      </div>
    </article>
  );
}

