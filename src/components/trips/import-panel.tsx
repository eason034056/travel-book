"use client";

import { startTransition, useState } from "react";

import type { TripDay } from "@/types/travel";

interface ImportPanelProps {
  tripId: string;
  timezone: string;
  days: TripDay[];
}

type ImportPreview = {
  resolvedCount: number;
  unresolved: Array<{ originalUrl: string; reason: string }>;
  stops: Array<{ name: string; orderIndex: number }>;
};

export function ImportPanel({ tripId, timezone, days }: ImportPanelProps) {
  const [links, setLinks] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [photoStatus, setPhotoStatus] = useState<string>("Pending review");
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  async function handleImport() {
    setError(null);
    setIsPending(true);

    try {
      const importResponse = await fetch("/api/import/google-links", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          tripId,
          urls: links.split("\n")
        })
      });

      if (!importResponse.ok) {
        throw new Error("Link parsing failed");
      }

      const importPreview = (await importResponse.json()) as ImportPreview;
      setPreview(importPreview);

      if (files.length > 0) {
        const formData = new FormData();
        formData.set("tripId", tripId);
        formData.set("timezone", timezone);
        formData.set(
          "tripDays",
          JSON.stringify(days.map((day) => ({ id: day.id, date: day.date })))
        );

        for (const file of files) {
          formData.append("photos", file);
        }

        const photoResponse = await fetch("/api/uploads/photos", {
          method: "POST",
          body: formData
        });

        if (!photoResponse.ok) {
          throw new Error("Photo analysis failed");
        }

        const photoPreview = (await photoResponse.json()) as {
          assigned: Array<{ photoId: string; dayId: string }>;
          unassigned: Array<{ photoId: string; reason: string }>;
        };

        setPhotoStatus(
          `${photoPreview.assigned.length} assigned · ${photoPreview.unassigned.length} pending review`
        );
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
              onChange={(event) => setFiles(Array.from(event.target.files ?? []))}
              type="file"
            />
          </label>
          <button
            className="rounded-full bg-ink px-5 py-3 text-sm uppercase tracking-[0.24em] text-paper transition hover:bg-olive disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isPending || (!links.trim() && files.length === 0)}
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
              <p>Awaiting first import</p>
              <p className="leading-7">
                The first version groups photos by EXIF date, turns supported links into ordered stops, and surfaces
                anything unresolved for manual cleanup.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-4 text-sm text-ink/78">
              <p>
                {preview.resolvedCount} link batch{preview.resolvedCount === 1 ? "" : "es"} resolved, {preview.unresolved.length} unresolved.
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
