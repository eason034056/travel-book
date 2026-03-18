import type { TripSummary } from "@/types/travel";

import { TripCard } from "@/components/trips/trip-card";

interface TripsArchiveProps {
  trips: TripSummary[];
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
            <div className="pt-2">
              <a
                className="inline-flex items-center rounded-full border border-ink/10 bg-ink px-5 py-3 text-sm uppercase tracking-[0.22em] text-paper transition hover:bg-olive"
                href="/trips/new"
              >
                Start a new trip
              </a>
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

      {trips.length > 0 ? (
        <section className="mt-10 grid gap-6 md:grid-cols-2">
          {trips.map((trip) => (
            <a key={trip.id} className="block" href={`/trips/${trip.id}`}>
              <TripCard trip={trip} />
            </a>
          ))}
        </section>
      ) : (
        <section className="mt-10 flex flex-col items-center rounded-[2.4rem] border border-ink/10 bg-paper px-8 py-16 text-center shadow-card">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-sand/50">
            <svg className="h-10 w-10 text-olive/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" />
            </svg>
          </div>
          <h2 className="mt-6 font-display text-4xl leading-none text-ink">No trips yet</h2>
          <p className="mt-3 max-w-md text-sm leading-7 text-ink/65">
            Start by pasting a Google Maps link to build your first route, then shape the days with stories and photos.
          </p>
          <a
            className="mt-6 inline-flex items-center rounded-full bg-ink px-6 py-3 text-sm uppercase tracking-[0.22em] text-paper transition hover:bg-olive"
            href="/trips/new"
          >
            Plan your first trip
          </a>
        </section>
      )}
    </main>
  );
}
