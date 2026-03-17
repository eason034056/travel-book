import type { TripDetail } from "@/types/travel";

import { TripCard } from "@/components/trips/trip-card";

interface TripsArchiveProps {
  trips: TripDetail[];
}

export function TripsArchive({ trips }: TripsArchiveProps) {
  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.75rem] border border-ink/10 bg-paper px-6 py-10 shadow-float md:px-10 md:py-14">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,108,77,0.18),transparent_35%),radial-gradient(circle_at_bottom_left,rgba(102,115,90,0.16),transparent_40%)]" />
        <div className="relative grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.36em] text-olive">Travel book archive</p>
            <div className="space-y-4">
              <h1 className="max-w-3xl font-display text-6xl leading-[0.9] text-ink md:text-8xl">
                Journeys worth reopening.
              </h1>
              <p className="max-w-xl text-base leading-8 text-ink/75 md:text-lg">
                Mobile capture, desktop nostalgia. Keep the maps, photos, and handwritten details in one editorial
                archive that never feels like a generic dashboard.
              </p>
            </div>
            <div className="flex flex-wrap gap-3 text-xs uppercase tracking-[0.24em] text-ink/60">
              <span className="rounded-full border border-olive/20 bg-sand/50 px-4 py-2">Google Maps import</span>
              <span className="rounded-full border border-olive/20 bg-sand/50 px-4 py-2">Two-editor memory book</span>
              <span className="rounded-full border border-olive/20 bg-sand/50 px-4 py-2">Editorial scrapbook UI</span>
            </div>
          </div>
          <div className="grid gap-4 rounded-[2rem] border border-ink/10 bg-sand/35 p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] border border-paper/60 bg-paper p-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-olive">Capture</p>
                <p className="mt-3 font-display text-3xl leading-none text-ink">Paste links</p>
                <p className="mt-3 text-sm leading-7 text-ink/70">
                  Drop place links or route links from Google Maps while you are still on the move.
                </p>
              </div>
              <div className="rounded-[1.5rem] border border-paper/60 bg-paper p-4">
                <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-olive">Review</p>
                <p className="mt-3 font-display text-3xl leading-none text-ink">Shape the days</p>
                <p className="mt-3 text-sm leading-7 text-ink/70">
                  Edit the title, hero image, and the line that best captures the day.
                </p>
              </div>
            </div>
            <div className="rounded-[1.7rem] border border-terracotta/20 bg-terracotta/10 p-5">
              <p className="font-mono text-[0.68rem] uppercase tracking-[0.3em] text-terracotta">Remember</p>
              <p className="mt-3 font-display text-4xl leading-none text-ink">A quiet archive with a strong visual memory.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-10 grid gap-6 md:grid-cols-2">
        {trips.map((trip) => (
          <a key={trip.id} className="block" href={`/trips/${trip.id}`}>
            <TripCard trip={trip} />
          </a>
        ))}
      </section>
    </main>
  );
}

