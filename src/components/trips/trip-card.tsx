"use client";

import { useState } from "react";
import type { TripSummary } from "@/types/travel";
import { formatCompanionLabel, formatDisplayDate } from "@/lib/utils";
import { PhotoLightbox } from "@/components/trips/photo-lightbox";

interface TripCardProps {
  trip: TripSummary;
}

export function TripCard({ trip }: TripCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const coverPhoto = { id: `${trip.id}-cover`, url: trip.coverPhotoUrl, alt: trip.title };

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
        <button
          type="button"
          className="absolute right-4 top-4 z-10 rounded-full bg-ink/40 p-2 text-paper/90 backdrop-blur transition hover:bg-ink/60 focus:outline-none focus:ring-2 focus:ring-paper/50"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setLightboxOpen(true);
          }}
          aria-label="View cover photo"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        </button>
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

      {lightboxOpen && (
        <PhotoLightbox
          photos={[coverPhoto]}
          initialIndex={0}
          onClose={() => setLightboxOpen(false)}
        />
      )}
    </article>
  );
}

