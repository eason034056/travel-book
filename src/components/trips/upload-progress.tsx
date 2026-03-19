"use client";

import type { TripPhotoUploadProgress } from "@/lib/trip-photo-upload-contract";
import { getTripPhotoUploadPercent } from "@/lib/trip-photo-upload-client";
import { cn } from "@/lib/utils";

interface UploadProgressProps {
  progress: TripPhotoUploadProgress;
  label: string;
  className?: string;
}

export function UploadProgress({ progress, label, className }: UploadProgressProps) {
  const percent = getTripPhotoUploadPercent(progress);

  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex items-center justify-between gap-3 text-xs uppercase tracking-[0.16em] text-ink/58">
        <span>{label}</span>
        <span>{progress.current}/{progress.total}</span>
      </div>
      <div
        aria-label="Photo upload progress"
        aria-valuemax={progress.total}
        aria-valuemin={0}
        aria-valuenow={progress.current}
        className="h-2 overflow-hidden rounded-full bg-ink/10"
        role="progressbar"
      >
        <div
          className="h-full rounded-full bg-olive transition-[width] duration-200 ease-out"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}
