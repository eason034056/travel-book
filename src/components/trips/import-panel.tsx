"use client";

import { startTransition, useState } from "react";

import { formatTripPhotoUploadProgress, uploadTripPhotosDirect } from "@/lib/trip-photo-upload-client";
import type { TripDay } from "@/types/travel";

interface ImportPanelProps {
  tripId: string;
  timezone: string;
  days: TripDay[];
}

type ImportPreview = {
  resolvedCount: number;
  savedCount: number;
  unresolved: Array<{ originalUrl: string; reason: string }>;
  stops: Array<{ name: string; orderIndex: number }>;
};

export function ImportPanel({ tripId, timezone, days }: ImportPanelProps) {
  const [links, setLinks] = useState("");
  const [selectedDayId, setSelectedDayId] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [photoStatus, setPhotoStatus] = useState<string>("Pending review");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleImport() {
    setError(null);
    setIsPending(true);

    try {
      if (links.trim()) {
        const importResponse = await fetch("/api/import/google-links", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            tripId,
            dayId: selectedDayId,
            urls: links.split("\n")
          })
        });

        if (!importResponse.ok) {
          throw new Error("Link parsing failed");
        }

        const importPreview = (await importResponse.json()) as ImportPreview;
        setPreview(importPreview);
      } else {
        setPreview(null);
      }

      if (files.length > 0) {
        const uploadResult = await uploadTripPhotosDirect({
          days: days.map((day) => ({ date: day.date, id: day.id })),
          files,
          onProgress: (progress) => setPhotoStatus(formatTripPhotoUploadProgress(progress)),
          timezone,
          tripId
        });

        setPhotoStatus(
          `${uploadResult.assignments.assigned.length} assigned · ${uploadResult.assignments.unassigned.length} pending review${
            uploadResult.failedCount > 0 ? ` · ${uploadResult.failedCount} failed upload${uploadResult.failedCount === 1 ? "" : "s"}` : ""
          }`
        );
        setError(uploadResult.failedCount > 0 ? `${uploadResult.failedCount} photo upload${uploadResult.failedCount === 1 ? "" : "s"} failed` : null);
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "Import failed");
    } finally {
      setIsPending(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-ink/10 bg-paper/95 p-5 shadow-card md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-6">
        <div className="max-w-xl">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.34em] text-olive">Import workflow</p>
          <h2 className="mt-3 font-display text-4xl leading-none text-ink">Drop links &amp; photos</h2>
          <p className="mt-3 text-sm leading-7 text-ink/75">
            Paste Google Maps place or route links, upload the raw photo batch, and review what the app grouped into
            each day.
          </p>
        </div>
        <div className="rounded-full border border-terracotta/20 bg-terracotta/10 px-4 py-2 text-xs uppercase tracking-[0.22em] text-terracotta">
          {photoStatus}
        </div>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="grid gap-4">
          <label className="grid gap-2 text-sm text-ink/70">
            <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Assign imported links to</span>
            <select
              aria-label="Assign imported links to"
              className="h-12 rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-sm text-ink outline-none transition focus:border-olive/45"
              onChange={(event) => setSelectedDayId(event.target.value)}
              value={selectedDayId}
            >
              <option value="">Choose a day</option>
              {days.map((day) => (
                <option key={day.id} value={day.id}>
                  Day {day.dayIndex} · {day.title}
                </option>
              ))}
            </select>
          </label>
          <textarea
            className="min-h-36 rounded-[1.5rem] border border-ink/10 bg-sand/40 px-4 py-4 text-sm leading-7 text-ink outline-none transition focus:border-olive/45 focus:bg-paper"
            onChange={(event) => setLinks(event.target.value)}
            placeholder="Paste one Google Maps link per line"
            value={links}
          />
          <label className="flex cursor-pointer items-center justify-between rounded-[1.4rem] border border-dashed border-olive/25 bg-paper px-4 py-4 text-sm text-ink/70 transition hover:border-olive/45 hover:bg-sand/30">
            <span>Select travel photos</span>
            <span className="font-mono text-xs uppercase tracking-[0.22em] text-olive">
              {files.length === 0 ? "No files yet" : `${files.length} selected`}
            </span>
            <input
              className="hidden"
              multiple
              accept="image/*"
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>
          <button
            className="rounded-full bg-ink px-5 py-3 text-sm uppercase tracking-[0.24em] text-paper transition hover:bg-olive disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || (!links.trim() && files.length === 0) || (Boolean(links.trim()) && !selectedDayId)}
            onClick={() => startTransition(handleImport)}
            type="button"
          >
            {isPending ? "Reviewing..." : "Build draft"}
          </button>
        </div>

        <div className="rounded-[1.6rem] border border-ink/10 bg-sand/35 p-4">
          <p className="font-mono text-[0.72rem] uppercase tracking-[0.3em] text-olive">Draft preview</p>
          {!preview ? (
            <div className="mt-4 space-y-3 text-sm text-ink/65">
              <p>Awaiting first save</p>
              <p className="leading-7">
                Imported links save directly into the selected day. Photo uploads still group by EXIF date and surface
                anything unmatched for manual cleanup.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-sm text-ink/78">
              <p>
                {preview.savedCount} stop{preview.savedCount === 1 ? "" : "s"} saved from {preview.resolvedCount} resolved link batch{preview.resolvedCount === 1 ? "" : "es"}, {preview.unresolved.length} unresolved.
              </p>
              <div className="space-y-2">
                {preview.stops.map((stop) => (
                  <div
                    key={`${stop.name}-${stop.orderIndex}`}
                    className="rounded-[1rem] border border-paper/60 bg-paper px-3 py-2 text-ink/75"
                  >
                    {stop.orderIndex + 1}. {stop.name}
                  </div>
                ))}
              </div>
              {preview.unresolved.length > 0 && (
                <div className="rounded-[1rem] border border-terracotta/25 bg-terracotta/8 p-3 text-terracotta">
                  {preview.unresolved.length} link needs manual review.
                </div>
              )}
            </div>
          )}
          {error && <p className="mt-4 text-sm text-terracotta">{error}</p>}
        </div>
      </div>
    </section>
  );
}
