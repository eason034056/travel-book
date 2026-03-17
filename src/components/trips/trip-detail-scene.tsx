import type { TripDetail } from "@/types/travel";

import { DayCard } from "@/components/trips/day-card";
import { ImportPanel } from "@/components/trips/import-panel";
import { InviteDialog } from "@/components/trips/invite-dialog";
import { OverviewMap } from "@/components/trips/overview-map";
import { PhotoStrip } from "@/components/trips/photo-strip";
import { formatCompanionLabel, formatDisplayDate } from "@/lib/utils";

interface TripDetailSceneProps {
  trip: TripDetail;
}

export function TripDetailScene({ trip }: TripDetailSceneProps) {
  const allStops = trip.days.flatMap((day) => day.stops);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.75rem] border border-ink/10 bg-paper shadow-float">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-25"
          style={{ backgroundImage: `url(${trip.coverPhotoUrl})` }}
        />
        <div className="absolute inset-0 bg-[linear-gradient(130deg,rgba(246,241,231,0.95),rgba(246,241,231,0.82),rgba(221,209,191,0.66))]" />
        <div className="relative grid gap-8 px-6 py-8 md:px-10 md:py-10 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3">
              <span className="rounded-full border border-olive/20 bg-paper/60 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.32em] text-olive">
                {trip.daysCount} days
              </span>
              <span className="rounded-full border border-olive/20 bg-paper/60 px-4 py-2 font-mono text-[0.68rem] uppercase tracking-[0.32em] text-ink/60">
                {formatCompanionLabel(trip.travelCompanions)}
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="max-w-4xl font-display text-6xl leading-[0.9] text-ink md:text-8xl">{trip.title}</h1>
              <p className="max-w-xl text-base leading-8 text-ink/76 md:text-lg">{trip.summary}</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[1.5rem] border border-ink/8 bg-paper/70 p-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">Dates</p>
                <p className="mt-3 text-sm leading-7 text-ink/72">
                  {formatDisplayDate(trip.startDate)} - {formatDisplayDate(trip.endDate)}
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-ink/8 bg-paper/70 p-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">Route</p>
                <p className="mt-3 text-sm leading-7 text-ink/72">{trip.routeSummary}</p>
              </div>
              <div className="rounded-[1.5rem] border border-ink/8 bg-paper/70 p-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">Mood</p>
                <p className="mt-3 text-sm leading-7 text-ink/72">{trip.highlightLabel}</p>
              </div>
            </div>
          </div>

          <OverviewMap center={trip.mapCenter} stops={allStops} />
        </div>
      </section>

      <section className="mt-8 grid gap-8 xl:grid-cols-[1.1fr_0.9fr]">
        <ImportPanel days={trip.days} timezone={trip.timezone} tripId={trip.id} />
        <InviteDialog tripId={trip.id} />
      </section>

      <section className="mt-8 grid gap-8">
        {trip.days.map((day, index) => (
          <DayCard
            key={day.id}
            className="animate-fade-rise"
            day={day}
          />
        ))}
      </section>

      <section className="mt-10 rounded-[2.4rem] border border-ink/10 bg-paper px-6 py-8 shadow-card md:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-olive">Trip ending</p>
            <h2 className="mt-3 font-display text-5xl leading-none text-ink">Last frames worth keeping</h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-ink/72">
            The closing strip is where the travel book stops feeling like logistics and starts feeling like memory.
          </p>
        </div>
        <div className="mt-6">
          <PhotoStrip photos={trip.days.flatMap((day) => day.gallery).slice(0, 3)} />
        </div>
      </section>
    </main>
  );
}

