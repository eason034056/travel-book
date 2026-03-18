"use client";

import type { Dispatch, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import heic2any from "heic2any";
import { GripVertical, Trash2, ArrowRightLeft, ChevronDown, MapPin, Loader2 } from "lucide-react";

import type { PlaceStop, TripStudioPhoto, TripStudioSnapshot } from "@/types/travel";
import { parseGoogleMapsLink } from "@/lib/google-maps-parser";
import { RouteEditorMap, computeCentroid } from "@/components/trips/route-editor-map";
import { useAutosave } from "@/hooks/use-autosave";

interface TripStudioProps {
  mode: "create" | "edit";
  initialSnapshot?: TripStudioSnapshot;
}

interface StudioDayDraft {
  id: string;
  date: string;
  dayIndex: number;
  cityLabel: string;
  title: string;
  summary: string;
  highlightMoment: string;
  journal: string;
  heroPhotoValue: string;
  heroPhotoPreviewUrl: string;
  stops: PlaceStop[];
}

export function TripStudio({ mode, initialSnapshot }: TripStudioProps) {
  const router = useRouter();

  const [title, setTitle] = useState(initialSnapshot?.title ?? "");
  const [startDate, setStartDate] = useState(initialSnapshot?.startDate ?? "");
  const [endDate, setEndDate] = useState(initialSnapshot?.endDate ?? "");
  const [timezone, setTimezone] = useState(initialSnapshot?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  const [summary, setSummary] = useState(initialSnapshot?.summary ?? "");
  const [travelCompanions, setTravelCompanions] = useState((initialSnapshot?.travelCompanions ?? []).join(", "));
  const [highlightLabel, setHighlightLabel] = useState(initialSnapshot?.highlightLabel ?? "");
  const [routeSummary, setRouteSummary] = useState(initialSnapshot?.routeSummary ?? "");
  const [coverPhotoValue, setCoverPhotoValue] = useState(initialSnapshot?.coverPhotoValue ?? "");
  const [endingPhotoIds, setEndingPhotoIds] = useState<string[]>(initialSnapshot?.endingPhotoIds ?? []);
  const [days, setDays] = useState<StudioDayDraft[]>(() => toStudioDays(initialSnapshot));
  const [photos, setPhotos] = useState<TripStudioPhoto[]>(initialSnapshot?.photos ?? []);
  const [pendingInviteEmail, setPendingInviteEmail] = useState("");
  const [stopImportUrls, setStopImportUrls] = useState("");
  const [stopImportDayId, setStopImportDayId] = useState(initialSnapshot?.days[0]?.id ?? "");
  const [stopDraftName, setStopDraftName] = useState("");
  const [stopDraftDayId, setStopDraftDayId] = useState(initialSnapshot?.days[0]?.id ?? "");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [activeStopId, setActiveStopId] = useState<string | null>(null);
  const [savingOverview, setSavingOverview] = useState(false);
  const [savingDays, setSavingDays] = useState(false);
  const [creatingTrip, setCreatingTrip] = useState(false);
  const [importingLinks, setImportingLinks] = useState(false);
  const [addingStop, setAddingStop] = useState(false);
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set());
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [batchDayId, setBatchDayId] = useState("");
  const [savingBatchPhotos, setSavingBatchPhotos] = useState(false);
  const [mobileStopsTab, setMobileStopsTab] = useState<"list" | "map">("list");

  useEffect(() => {
    if (!initialSnapshot) return;
    setTitle(initialSnapshot.title);
    setStartDate(initialSnapshot.startDate);
    setEndDate(initialSnapshot.endDate);
    setTimezone(initialSnapshot.timezone);
    setSummary(initialSnapshot.summary);
    setTravelCompanions(initialSnapshot.travelCompanions.join(", "));
    setHighlightLabel(initialSnapshot.highlightLabel);
    setRouteSummary(initialSnapshot.routeSummary);
    setCoverPhotoValue(initialSnapshot.coverPhotoValue);
    setEndingPhotoIds(initialSnapshot.endingPhotoIds);
    setDays(toStudioDays(initialSnapshot));
    setPhotos(initialSnapshot.photos);
    setStopDraftDayId(initialSnapshot.days[0]?.id ?? "");
    setStopImportDayId(initialSnapshot.days[0]?.id ?? "");
  }, [initialSnapshot]);

  useEffect(() => {
    if (mode !== "create" || !startDate || !endDate) return;
    setDays((currentDays) => syncDateDrivenDays(currentDays, startDate, endDate));
  }, [endDate, mode, startDate]);

  const isOwner = initialSnapshot?.viewerRole === "owner";

  const allStops = useMemo(() => days.flatMap((d) => d.stops), [days]);
  const readyPhotosForEndingSelection = useMemo(
    () => photos.filter((photo) => photo.status === "ready" && Boolean(photo.dayId)),
    [photos]
  );

  const mapCenter = useMemo((): [number, number] => {
    const withCoords = allStops.filter((s) => s.lat !== null && s.lng !== null);
    if (withCoords.length === 0) return [0, 0];
    return computeCentroid(withCoords);
  }, [allStops]);

  useEffect(() => {
    setEndingPhotoIds((current) => current.filter((photoId) => photos.some((photo) => photo.id === photoId)));
  }, [photos]);

  const [importPreview, setImportPreview] = useState<{
    resolvedCount: number;
    unresolvedCount: number;
    stopNames: string[];
    total: number;
    expandedUrls?: string[];
  } | null>(null);

  useEffect(() => {
    const lines = stopImportUrls.split("\n").map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) {
      setImportPreview(null);
      return;
    }

    const hasShortUrls = lines.some((l) => l.includes("goo.gl/"));

    if (!hasShortUrls) {
      const parsed = lines.map(parseGoogleMapsLink);
      const resolved = parsed.filter((p) => p.status === "resolved");
      const unresolvedCount = parsed.filter((p) => p.status === "unresolved").length;
      const stopNames = resolved.flatMap((p) => p.status === "resolved" ? p.stops.map((s) => s.name) : []);
      setImportPreview({ resolvedCount: resolved.length, unresolvedCount, stopNames, total: lines.length });
      return;
    }

    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const response = await fetch("/api/resolve-google-links", {
          body: JSON.stringify({ urls: lines }),
          headers: { "Content-Type": "application/json" },
          method: "POST"
        });
        if (!response.ok || cancelled) return;
        const data = (await response.json()) as {
          results: Array<{ expanded: string; parsed: { status: string; stops?: Array<{ name: string }> } }>;
        };
        if (cancelled) return;

        const expanded = data.results.map((r) => r.expanded);
        const resolved = data.results.filter((r) => r.parsed.status === "resolved");
        const unresolvedCount = data.results.filter((r) => r.parsed.status === "unresolved").length;
        const stopNames = resolved.flatMap((r) => r.parsed.stops?.map((s) => s.name) ?? []);
        setImportPreview({ resolvedCount: resolved.length, unresolvedCount, stopNames, total: lines.length, expandedUrls: expanded });
      } catch {
        // ignore
      }
    }, 500);

    return () => { cancelled = true; clearTimeout(timer); };
  }, [stopImportUrls]);

  // --- Autosave for overview ---
  const overviewSaveFn = useCallback(async () => {
    if (!initialSnapshot || mode !== "edit") return;
    if (hasInvalidDateRange(startDate, endDate)) {
      toast.error("End date must be on or after start date.");
      return;
    }
    const response = await fetch(`/api/trips/${initialSnapshot.id}/overview`, {
      body: JSON.stringify({
        confirmDateShrink: true,
        coverPhotoValue,
        endingPhotoIds,
        endDate,
        highlightLabel,
        mapCenter,
        routeSummary,
        startDate,
        summary,
        timezone,
        title,
        travelCompanions: parseCompanions(travelCompanions)
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message ?? "Unable to save overview");
    }
  }, [initialSnapshot, mode, startDate, endDate, coverPhotoValue, endingPhotoIds, highlightLabel, mapCenter, routeSummary, summary, timezone, title, travelCompanions]);

  const overviewAutoSave = useAutosave(overviewSaveFn, 2500);

  // --- Autosave for days ---
  const daysSaveFn = useCallback(async () => {
    if (!initialSnapshot || mode !== "edit") return;
    const response = await fetch(`/api/trips/${initialSnapshot.id}/days`, {
      body: JSON.stringify({
        days: days.map((day) => ({
          cityLabel: day.cityLabel,
          dayId: day.id,
          heroPhotoValue: day.heroPhotoValue,
          highlightMoment: day.highlightMoment,
          journal: day.journal,
          summary: day.summary,
          title: day.title
        }))
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH"
    });
    if (!response.ok) {
      const payload = (await response.json()) as { message?: string };
      throw new Error(payload.message ?? "Unable to save days");
    }
  }, [initialSnapshot, mode, days]);

  const daysAutoSave = useAutosave(daysSaveFn, 2500);

  function updateOverviewField<T>(setter: Dispatch<SetStateAction<T>>) {
    return (value: T) => {
      setter(value);
      if (mode === "edit") overviewAutoSave.markDirty();
    };
  }

  function updateDayField(dayId: string, patch: Partial<StudioDayDraft>) {
    patchDay(dayId, patch, setDays);
    if (mode === "edit") daysAutoSave.markDirty();
  }

  // --- Unsaved changes warning ---
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (overviewAutoSave.dirty || daysAutoSave.dirty) {
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [overviewAutoSave.dirty, daysAutoSave.dirty]);

  async function handleCreateTrip() {
    if (hasInvalidDateRange(startDate, endDate)) {
      toast.error("End date must be on or after start date.");
      return;
    }

    setCreatingTrip(true);
    try {
      const stopsPayload = days.flatMap((day) =>
        day.stops.map((stop) => ({
          dayDate: day.date,
          name: stop.name,
          lat: stop.lat,
          lng: stop.lng,
          orderIndex: stop.orderIndex,
          sourceType: stop.sourceType,
          originalUrl: stop.originalUrl
        }))
      );

      const response = await fetch("/api/trips", {
        body: JSON.stringify({
          coverPhotoValue,
          endingPhotoIds,
          days: days.map((day) => ({
            cityLabel: day.cityLabel,
            date: day.date,
            heroPhotoValue: day.heroPhotoValue,
            highlightMoment: day.highlightMoment,
            journal: day.journal,
            summary: day.summary,
            title: day.title
          })),
          endDate,
          highlightLabel,
          mapCenter,
          routeSummary,
          startDate,
          summary,
          timezone,
          title,
          travelCompanions: parseCompanions(travelCompanions),
          stops: stopsPayload
        }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as { tripId?: string; message?: string };

      if (!response.ok || !payload.tripId) {
        toast.error(payload.message ?? "Unable to create trip");
        return;
      }

      toast.success("Trip created!");
      window.location.assign(`/trips/${payload.tripId}/edit`);
    } finally {
      setCreatingTrip(false);
    }
  }

  async function handleSaveOverview() {
    if (!initialSnapshot) return;
    if (hasInvalidDateRange(startDate, endDate)) {
      toast.error("End date must be on or after start date.");
      return;
    }

    setSavingOverview(true);
    try {
      const isShrinkingRange = enumerateDates(startDate, endDate).length < initialSnapshot.days.length;
      const confirmDateShrink = !isShrinkingRange || window.confirm("Shortening the date range removes day content, stops, and unassigns photos. Continue?");

      const response = await fetch(`/api/trips/${initialSnapshot.id}/overview`, {
        body: JSON.stringify({
          confirmDateShrink,
          coverPhotoValue,
          endingPhotoIds,
          endDate,
          highlightLabel,
          mapCenter,
          routeSummary,
          startDate,
          summary,
          timezone,
          title,
          travelCompanions: parseCompanions(travelCompanions)
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(payload.message ?? "Unable to save overview");
        return;
      }

      toast.success("Overview saved");
      if (isShrinkingRange && confirmDateShrink) {
        router.refresh();
      }
    } finally {
      setSavingOverview(false);
    }
  }

  async function handleSaveDays() {
    if (!initialSnapshot) return;
    setSavingDays(true);
    try {
      const response = await fetch(`/api/trips/${initialSnapshot.id}/days`, {
        body: JSON.stringify({
          days: days.map((day) => ({
            cityLabel: day.cityLabel,
            dayId: day.id,
            heroPhotoValue: day.heroPhotoValue,
            highlightMoment: day.highlightMoment,
            journal: day.journal,
            summary: day.summary,
            title: day.title
          }))
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
      const payload = (await response.json()) as { message?: string };

      if (!response.ok) {
        toast.error(payload.message ?? "Unable to save days");
        return;
      }
      toast.success("Days saved");
    } finally {
      setSavingDays(false);
    }
  }

  async function handleImportLinks() {
    const targetDayId = mode === "create" ? stopImportDayId : stopImportDayId;
    if (!targetDayId) {
      toast.error("Please select a day before importing.");
      return;
    }
    const urls = stopImportUrls.split("\n").map((v) => v.trim()).filter(Boolean);
    if (urls.length === 0) return;

    if (mode === "create") {
      setImportingLinks(true);
      try {
        const linksToResolve = importPreview?.expandedUrls ?? urls;
        const hasShortUrls = urls.some((u) => u.includes("goo.gl/"));
        let resolvedUrls = linksToResolve;

        if (hasShortUrls && !importPreview?.expandedUrls) {
          const res = await fetch("/api/resolve-google-links", {
            body: JSON.stringify({ urls }),
            headers: { "Content-Type": "application/json" },
            method: "POST"
          });
          if (res.ok) {
            const data = (await res.json()) as { results: Array<{ expanded: string }> };
            resolvedUrls = data.results.map((r) => r.expanded);
          }
        }

        const parsed = resolvedUrls.map(parseGoogleMapsLink);
        const targetDay = days.find((d) => d.id === targetDayId);
        if (!targetDay) return;

        let nextOrder = targetDay.stops.length;
        const newStops: PlaceStop[] = [];
        let resolvedCount = 0;

        for (const result of parsed) {
          if (result.status === "resolved") {
            resolvedCount++;
            for (const stop of result.stops) {
              newStops.push({
                id: `draft-stop-${Date.now()}-${nextOrder}`,
                name: stop.name,
                lat: stop.lat,
                lng: stop.lng,
                orderIndex: nextOrder,
                sourceType: result.kind,
                originalUrl: result.originalUrl
              });
              nextOrder++;
            }
          }
        }

        setDays((current) =>
          current.map((d) => d.id === targetDayId ? { ...d, stops: [...d.stops, ...newStops] } : d)
        );
        setStopImportUrls("");
        toast.success(`${newStops.length} stop${newStops.length === 1 ? "" : "s"} added from ${resolvedCount} link${resolvedCount === 1 ? "" : "s"}`);
      } finally {
        setImportingLinks(false);
      }
      return;
    }

    if (!initialSnapshot) return;
    setImportingLinks(true);
    try {
      const response = await fetch(`/api/trips/${initialSnapshot.id}/stops/import`, {
        body: JSON.stringify({ dayId: targetDayId, urls }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as {
        resolvedCount?: number;
        unresolved?: Array<{ originalUrl: string; reason: string }>;
        rows?: Array<{ stop_id: string; name: string; lat: string; lng: string; order_index: string; source_type: string; original_url: string }>;
        message?: string;
      };

      if (!response.ok) {
        toast.error(payload.message ?? "Unable to import stops");
        return;
      }

      const newStops: PlaceStop[] = (payload.rows ?? []).map((row) => ({
        id: row.stop_id,
        name: row.name,
        lat: row.lat ? Number(row.lat) : null,
        lng: row.lng ? Number(row.lng) : null,
        orderIndex: Number(row.order_index),
        sourceType: row.source_type as "place" | "route",
        originalUrl: row.original_url
      }));

      setDays((current) =>
        current.map((d) => d.id === targetDayId ? { ...d, stops: [...d.stops, ...newStops] } : d)
      );
      setStopImportUrls("");
      toast.success(`${newStops.length} stop${newStops.length === 1 ? "" : "s"} imported`);

      if (payload.unresolved && payload.unresolved.length > 0) {
        toast.error(`${payload.unresolved.length} link${payload.unresolved.length === 1 ? "" : "s"} could not be resolved`);
      }
    } finally {
      setImportingLinks(false);
    }
  }

  async function handleAddStop() {
    if (!stopDraftName.trim() || !stopDraftDayId) {
      toast.error("Enter a stop name and select a day.");
      return;
    }

    if (mode === "create") {
      const targetDay = days.find((d) => d.id === stopDraftDayId);
      if (!targetDay) return;
      const newStop: PlaceStop = {
        id: `draft-stop-${Date.now()}`,
        name: stopDraftName.trim(),
        lat: null,
        lng: null,
        orderIndex: targetDay.stops.length,
        sourceType: "place",
        originalUrl: ""
      };
      setDays((current) =>
        current.map((d) => d.id === stopDraftDayId ? { ...d, stops: [...d.stops, newStop] } : d)
      );
      setStopDraftName("");
      toast.success(`"${newStop.name}" added`);
      return;
    }

    if (!initialSnapshot) return;
    setAddingStop(true);
    try {
      const response = await fetch(`/api/trips/${initialSnapshot.id}/stops`, {
        body: JSON.stringify({ dayId: stopDraftDayId, name: stopDraftName, lat: null, lng: null }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
      const payload = (await response.json()) as { message?: string };
      if (!response.ok) {
        toast.error(payload.message ?? "Unable to add stop");
        return;
      }
      setStopDraftName("");
      toast.success(`"${stopDraftName}" added`);
      router.refresh();
    } finally {
      setAddingStop(false);
    }
  }

  async function handleDeleteStop(dayId: string, stopId: string, stopName: string) {
    if (mode === "create") {
      setDays((current) =>
        current.map((d) =>
          d.id === dayId
            ? { ...d, stops: d.stops.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, orderIndex: i })) }
            : d
        )
      );
      toast.success(`"${stopName}" removed`);
      return;
    }
    if (!initialSnapshot) return;

    setDays((current) =>
      current.map((d) =>
        d.id === dayId
          ? { ...d, stops: d.stops.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, orderIndex: i })) }
          : d
      )
    );

    const response = await fetch(`/api/trips/${initialSnapshot.id}/stops/${stopId}`, { method: "DELETE" });
    if (!response.ok) {
      toast.error("Unable to delete stop");
      router.refresh();
      return;
    }
    toast.success(`"${stopName}" removed`);
  }

  async function handleReorderDrop(dayId: string, event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    setDays((current) =>
      current.map((d) => {
        if (d.id !== dayId) return d;
        const oldIndex = d.stops.findIndex((s) => s.id === active.id);
        const newIndex = d.stops.findIndex((s) => s.id === over.id);
        if (oldIndex < 0 || newIndex < 0) return d;
        const reordered = [...d.stops];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);
        return { ...d, stops: reordered.map((s, i) => ({ ...s, orderIndex: i })) };
      })
    );

    if (mode === "edit" && initialSnapshot) {
      const day = days.find((d) => d.id === dayId);
      if (!day) return;
      const oldIndex = day.stops.findIndex((s) => s.id === active.id);
      const newIndex = day.stops.findIndex((s) => s.id === over.id);
      const reordered = [...day.stops];
      const [moved] = reordered.splice(oldIndex, 1);
      reordered.splice(newIndex, 0, moved);

      await fetch(`/api/trips/${initialSnapshot.id}/stops/reorder`, {
        body: JSON.stringify({ dayId, stopIds: reordered.map((s) => s.id) }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
    }
  }

  async function handleMoveStopToDay(fromDayId: string, stopId: string, toDayId: string) {
    const fromDay = days.find((d) => d.id === fromDayId);
    const stop = fromDay?.stops.find((s) => s.id === stopId);
    if (!stop || !fromDay) return;

    setDays((current) =>
      current.map((d) => {
        if (d.id === fromDayId) {
          return { ...d, stops: d.stops.filter((s) => s.id !== stopId).map((s, i) => ({ ...s, orderIndex: i })) };
        }
        if (d.id === toDayId) {
          return { ...d, stops: [...d.stops, { ...stop, orderIndex: d.stops.length }] };
        }
        return d;
      })
    );

    if (mode === "edit" && initialSnapshot) {
      await fetch(`/api/trips/${initialSnapshot.id}/stops/${stopId}`, { method: "DELETE" });
      await fetch(`/api/trips/${initialSnapshot.id}/stops`, {
        body: JSON.stringify({ dayId: toDayId, name: stop.name, lat: stop.lat, lng: stop.lng }),
        headers: { "Content-Type": "application/json" },
        method: "POST"
      });
    }
    toast.success(`Moved "${stop.name}" to another day`);
  }

  async function handleRenameStop(dayId: string, stopId: string, newName: string) {
    if (!newName.trim()) return;

    setDays((current) =>
      current.map((d) =>
        d.id === dayId
          ? { ...d, stops: d.stops.map((s) => s.id === stopId ? { ...s, name: newName.trim() } : s) }
          : d
      )
    );

    if (mode === "edit" && initialSnapshot) {
      await fetch(`/api/trips/${initialSnapshot.id}/stops/${stopId}`, {
        body: JSON.stringify({ name: newName.trim() }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH"
      });
    }
  }

  function toggleDayExpanded(dayId: string) {
    setExpandedDays((current) => {
      const next = new Set(current);
      if (next.has(dayId)) next.delete(dayId);
      else next.add(dayId);
      return next;
    });
  }

  async function handleBatchAssignPhotos() {
    if (selectedPhotoIds.size === 0 || !batchDayId) return;
    if (!initialSnapshot) return;

    setSavingBatchPhotos(true);
    try {
      const photosToUpdate = photos.filter((p) => selectedPhotoIds.has(p.id));
      for (const photo of photosToUpdate) {
        await fetch(`/api/trips/${initialSnapshot.id}/photos/${photo.id}`, {
          body: JSON.stringify({ alt: photo.alt, dayId: batchDayId }),
          headers: { "Content-Type": "application/json" },
          method: "PATCH"
        });
      }
      setPhotos((current) =>
        current.map((p) =>
          selectedPhotoIds.has(p.id) ? { ...p, dayId: batchDayId, status: "ready" as const } : p
        )
      );
      toast.success(`${selectedPhotoIds.size} photo${selectedPhotoIds.size === 1 ? "" : "s"} assigned`);
      setSelectedPhotoIds(new Set());
    } catch {
      toast.error("Failed to assign some photos");
    } finally {
      setSavingBatchPhotos(false);
    }
  }

  const saveStatusLabel = (status: string) => {
    if (status === "saving") return "Saving...";
    if (status === "saved") return "All changes saved";
    if (status === "error") return "Save failed";
    return null;
  };

  return (
    <main className="mx-auto max-w-7xl px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      <section className="relative overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-float sm:rounded-[2.8rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,108,77,0.16),transparent_30%),linear-gradient(180deg,rgba(246,241,231,0.98),rgba(221,209,191,0.78))]" />
        <div className="relative grid gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:grid-cols-[0.32fr_0.68fr]">
          <aside className="space-y-4 sm:space-y-5 lg:sticky lg:top-8 lg:self-start">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.36em] text-olive">Trip Studio</p>
            <h1 className="font-display text-4xl leading-[0.92] text-ink sm:text-5xl md:text-6xl">Trip Studio</h1>
            <p className="hidden font-display text-2xl leading-tight text-ink/76 sm:block">
              {mode === "create" ? "Compose the next field notebook." : "Refine the travel book."}
            </p>
            <p className="hidden text-sm leading-7 text-ink/70 sm:block">
              Add stops first to shape your route, then enrich each day with stories and photos.
            </p>
            <nav className="flex flex-wrap gap-2 rounded-xl border border-ink/10 bg-paper/80 p-3 text-sm text-ink/72 sm:grid sm:gap-2 sm:rounded-[1.8rem] sm:p-4">
              <a className="rounded-full border border-ink/8 px-3 py-1 text-xs sm:rounded-none sm:border-0 sm:px-0 sm:py-0 sm:text-sm" href="#overview">Overview</a>
              <a className="rounded-full border border-ink/8 px-3 py-1 text-xs sm:rounded-none sm:border-0 sm:px-0 sm:py-0 sm:text-sm" href="#stops">Stops &amp; Route</a>
              <a className="rounded-full border border-ink/8 px-3 py-1 text-xs sm:rounded-none sm:border-0 sm:px-0 sm:py-0 sm:text-sm" href="#days">Days</a>
              {mode === "edit" && <a className="rounded-full border border-ink/8 px-3 py-1 text-xs sm:rounded-none sm:border-0 sm:px-0 sm:py-0 sm:text-sm" href="#photos">Photos</a>}
              {mode === "edit" && isOwner && <a className="rounded-full border border-ink/8 px-3 py-1 text-xs sm:rounded-none sm:border-0 sm:px-0 sm:py-0 sm:text-sm" href="#collaborators">Collaborators</a>}
              {mode === "edit" && isOwner && <a className="rounded-full border border-ink/8 px-3 py-1 text-xs sm:rounded-none sm:border-0 sm:px-0 sm:py-0 sm:text-sm" href="#danger-zone">Danger Zone</a>}
            </nav>
            {mode === "edit" && (
              <div className="rounded-xl border border-ink/10 bg-paper/80 px-3 py-2 text-xs text-ink/60 sm:rounded-[1.4rem] sm:px-4 sm:py-3">
                {saveStatusLabel(overviewAutoSave.status) && (
                  <p>{saveStatusLabel(overviewAutoSave.status)}</p>
                )}
                {saveStatusLabel(daysAutoSave.status) && (
                  <p>{saveStatusLabel(daysAutoSave.status)}</p>
                )}
                {!saveStatusLabel(overviewAutoSave.status) && !saveStatusLabel(daysAutoSave.status) && (
                  <p>Changes auto-save</p>
                )}
              </div>
            )}
          </aside>

          <div className="grid gap-4 sm:gap-6">
            {/* === OVERVIEW === */}
            <section id="overview" className="rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
              <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-olive">Trip Studio</p>
                  <h2 className="mt-2 font-display text-3xl leading-none text-ink sm:mt-3 sm:text-4xl">Overview</h2>
                </div>
                {mode === "edit" && (
                  <button
                    className="rounded-full bg-ink px-5 py-3 text-sm uppercase tracking-[0.22em] text-paper disabled:opacity-55"
                    disabled={savingOverview}
                    onClick={handleSaveOverview}
                    type="button"
                  >
                    {savingOverview ? "Saving..." : "Save now"}
                  </button>
                )}
              </header>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <StudioField label="Trip title" value={title} onChange={updateOverviewField(setTitle)} />
                <StudioField label="Timezone" value={timezone} onChange={updateOverviewField(setTimezone)} />
                <StudioField label="Start date" type="date" value={startDate} onChange={updateOverviewField(setStartDate)} />
                <StudioField label="End date" type="date" value={endDate} onChange={updateOverviewField(setEndDate)} />
                <StudioField label="Travel companions" value={travelCompanions} onChange={updateOverviewField(setTravelCompanions)} />
                <StudioField label="Route overview" value={routeSummary} onChange={updateOverviewField(setRouteSummary)} />
                <StudioField label="Trip vibe" value={highlightLabel} onChange={updateOverviewField(setHighlightLabel)} />
                <StudioField label="Trip cover photo" value={coverPhotoValue} onChange={updateOverviewField(setCoverPhotoValue)} />
                <StudioTextArea className="md:col-span-2" label="Summary" value={summary} onChange={updateOverviewField(setSummary)} />
              </div>
              {photos.length > 0 && (
                <div className="mt-6 space-y-3">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">Set cover from uploaded photos</p>
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {photos.slice(0, 6).map((photo) => (
                      <button
                        key={photo.id}
                        className="overflow-hidden rounded-[1.4rem] border border-ink/10 bg-sand/30 text-left"
                        onClick={() => { setCoverPhotoValue(photo.storageKey); if (mode === "edit") overviewAutoSave.markDirty(); }}
                        type="button"
                      >
                        <img alt={photo.alt} className="h-32 w-full object-cover" src={photo.previewUrl} />
                        <div className="px-4 py-3 text-sm text-ink/72">Use as cover</div>
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2 pt-2">
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">
                      Trip ending photos
                    </p>
                    <p className="text-xs text-ink/62">
                      Select which photos appear in the final “Last frames worth keeping” section.
                    </p>
                    {readyPhotosForEndingSelection.length === 0 ? (
                      <p className="rounded-[1rem] border border-ink/10 bg-paper px-3 py-2 text-xs text-ink/55">
                        Upload and assign photos to days first, then you can choose ending photos here.
                      </p>
                    ) : (
                      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                        {readyPhotosForEndingSelection.map((photo) => {
                          const isSelected = endingPhotoIds.includes(photo.id);

                          return (
                            <button
                              key={`ending-${photo.id}`}
                              className={`overflow-hidden rounded-[1rem] border text-left transition ${
                                isSelected
                                  ? "border-terracotta/45 ring-1 ring-terracotta/25"
                                  : "border-ink/10 hover:border-ink/25"
                              }`}
                              onClick={() => {
                                setEndingPhotoIds((current) => {
                                  const next = current.includes(photo.id)
                                    ? current.filter((photoId) => photoId !== photo.id)
                                    : [...current, photo.id];

                                  return next;
                                });
                                if (mode === "edit") overviewAutoSave.markDirty();
                              }}
                              type="button"
                            >
                              <img alt={photo.alt || photo.originalFilename} className="h-20 w-full object-cover" src={photo.previewUrl} />
                              <p className="truncate px-2 py-1.5 text-[0.65rem] text-ink/55">
                                {isSelected ? "Selected" : "Tap to add"}
                              </p>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </section>

            {/* === STOPS & ROUTE === */}
            <section id="stops" className="rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-olive">Route planner</p>
                  <h2 className="mt-2 font-display text-3xl leading-none text-ink sm:mt-3 sm:text-4xl">Stops &amp; Route</h2>
                </div>
              </div>

              {/* Mobile tab toggle */}
              <div className="mt-4 flex gap-2 xl:hidden">
                <button
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs uppercase tracking-[0.22em] transition ${mobileStopsTab === "list" ? "bg-ink text-paper" : "border border-ink/10 text-ink/70"}`}
                  onClick={() => setMobileStopsTab("list")}
                  type="button"
                >
                  List
                </button>
                <button
                  className={`flex-1 rounded-full px-4 py-2.5 text-xs uppercase tracking-[0.22em] transition ${mobileStopsTab === "map" ? "bg-ink text-paper" : "border border-ink/10 text-ink/70"}`}
                  onClick={() => setMobileStopsTab("map")}
                  type="button"
                >
                  Map
                </button>
              </div>

              <div className="mt-4 grid gap-6 xl:mt-6 xl:grid-cols-[0.48fr_0.52fr]">
                <div className={`grid gap-5 ${mobileStopsTab === "map" ? "hidden xl:grid" : ""}`}>
                  {/* Import from Google Maps */}
                  <div className="rounded-xl border border-olive/15 bg-sand/20 p-3 sm:rounded-[1.6rem] sm:p-4">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-olive" />
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Add from Google Maps</p>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-ink/55">Paste place or route links, one per line</p>
                    <label className="mt-3 grid gap-2 text-sm text-ink/75">
                      <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Add to day</span>
                      <select
                        className="h-12 rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-base text-ink outline-none"
                        onChange={(e) => setStopImportDayId(e.target.value)}
                        value={stopImportDayId}
                      >
                        <option value="">Choose a day</option>
                        {days.map((day) => (
                          <option key={day.id} value={day.id}>Day {day.dayIndex} · {day.title || day.date}</option>
                        ))}
                      </select>
                    </label>
                    <textarea
                      className="mt-3 min-h-28 w-full rounded-[1.4rem] border border-ink/10 bg-paper px-4 py-4 text-base leading-7 text-ink outline-none transition focus:border-olive/45"
                      onChange={(e) => setStopImportUrls(e.target.value)}
                      placeholder={"https://maps.google.com/maps/place/Fushimi+Inari/@34.9671...\nhttps://maps.google.com/maps/dir/Kyoto+Station/Kiyomizu-dera/..."}
                      value={stopImportUrls}
                    />
                    {importPreview && (
                      <div className="mt-2 rounded-[1rem] border border-ink/10 bg-paper px-3 py-2 text-xs text-ink/70">
                        <span className="text-olive">{importPreview.stopNames.length} stop{importPreview.stopNames.length === 1 ? "" : "s"} found</span>
                        {importPreview.unresolvedCount > 0 && (
                          <span className="ml-2 text-terracotta">{importPreview.unresolvedCount} unresolved</span>
                        )}
                        {importPreview.stopNames.length > 0 && (
                          <p className="mt-1 truncate">{importPreview.stopNames.join(", ")}</p>
                        )}
                      </div>
                    )}
                    <button
                      className="mt-3 w-full rounded-full bg-ink px-5 py-3 text-sm uppercase tracking-[0.22em] text-paper disabled:opacity-55"
                      disabled={importingLinks || !stopImportUrls.trim() || !stopImportDayId}
                      onClick={handleImportLinks}
                      type="button"
                    >
                      {importingLinks ? <span className="flex items-center justify-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Importing...</span> : "Import links"}
                    </button>
                  </div>

                  {/* Manual add stop */}
                  <div className="rounded-xl border border-ink/10 bg-paper/70 p-3 sm:rounded-[1.6rem] sm:p-4">
                    <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Or add manually</p>
                    <div className="mt-3 grid gap-3">
                      <select
                        className="h-12 rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-base text-ink outline-none"
                        onChange={(e) => setStopDraftDayId(e.target.value)}
                        value={stopDraftDayId}
                      >
                        <option value="">Choose a day</option>
                        {days.map((day) => (
                          <option key={day.id} value={day.id}>Day {day.dayIndex} · {day.title || day.date}</option>
                        ))}
                      </select>
                      <input
                        className="h-12 rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-base text-ink outline-none transition focus:border-olive/45"
                        onChange={(e) => setStopDraftName(e.target.value)}
                        placeholder="Stop name"
                        value={stopDraftName}
                      />
                      <button
                        className="rounded-full border border-ink/10 px-5 py-3 text-sm uppercase tracking-[0.22em] text-ink disabled:opacity-55"
                        disabled={addingStop || !stopDraftName.trim() || !stopDraftDayId}
                        onClick={handleAddStop}
                        type="button"
                      >
                        {addingStop ? "Adding..." : "Add stop"}
                      </button>
                    </div>
                  </div>

                  {/* Stop lists per day */}
                  <div className="grid gap-3">
                    {days.map((day) => (
                      <DayStopList
                        key={day.id}
                        day={day}
                        allDays={days}
                        tripId={initialSnapshot?.id}
                        mode={mode}
                        activeStopId={activeStopId}
                        onDeleteStop={handleDeleteStop}
                        onReorderDrop={handleReorderDrop}
                        onMoveStop={handleMoveStopToDay}
                        onRenameStop={handleRenameStop}
                        onStopClick={setActiveStopId}
                      />
                    ))}
                  </div>
                </div>

                {/* Live map */}
                <div className={`lg:sticky lg:top-8 lg:self-start ${mobileStopsTab === "list" ? "hidden xl:block" : ""}`}>
                  <RouteEditorMap
                    stops={allStops}
                    activeStopId={activeStopId}
                    onMarkerClick={setActiveStopId}
                  />
                </div>
              </div>
            </section>

            {/* === DAYS === */}
            <section id="days" className="rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
              <header className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-olive">Editorial sequence</p>
                  <h2 className="mt-2 font-display text-3xl leading-none text-ink sm:mt-3 sm:text-4xl">Days</h2>
                </div>
                <button
                  className="rounded-full bg-ink px-5 py-3 text-sm uppercase tracking-[0.22em] text-paper disabled:opacity-55"
                  disabled={creatingTrip || savingDays}
                  onClick={mode === "create" ? handleCreateTrip : handleSaveDays}
                  type="button"
                >
                  {mode === "create" ? (creatingTrip ? "Creating..." : "Create trip") : (savingDays ? "Saving..." : "Save days")}
                </button>
              </header>
              <div className="mt-6 grid gap-4">
                {days.map((day) => {
                  const isExpanded = expandedDays.has(day.id);
                  return (
                    <article key={day.id} className="overflow-hidden rounded-xl border border-ink/10 bg-sand/30 sm:rounded-[1.8rem]">
                      <button
                        className="flex w-full items-center justify-between gap-2 px-3 py-3 text-left sm:gap-3 sm:px-4 sm:py-4"
                        onClick={() => toggleDayExpanded(day.id)}
                        type="button"
                      >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1 sm:gap-3">
                          <h3 className="font-display text-xl text-ink sm:text-2xl">Day {day.dayIndex}</h3>
                          <span className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-ink/55 sm:text-xs">
                            {day.cityLabel || day.date}
                          </span>
                          {day.title && <span className="hidden text-sm text-ink/60 sm:inline">· {day.title}</span>}
                        </div>
                        <ChevronDown className={`h-5 w-5 text-ink/40 transition ${isExpanded ? "rotate-180" : ""}`} />
                      </button>
                      {isExpanded && (
                        <div className="border-t border-ink/10 px-3 pb-3 pt-3 sm:px-4 sm:pb-4 sm:pt-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <StudioField label="City" value={day.cityLabel} onChange={(v) => updateDayField(day.id, { cityLabel: v })} />
                            <StudioField label="Title" value={day.title} onChange={(v) => updateDayField(day.id, { title: v })} />
                            <StudioTextArea className="md:col-span-2" label="Summary" value={day.summary} onChange={(v) => updateDayField(day.id, { summary: v })} />
                            <StudioField label="Best moment" value={day.highlightMoment} onChange={(v) => updateDayField(day.id, { highlightMoment: v })} />
                            <StudioField label="Day cover photo" value={day.heroPhotoValue} onChange={(v) => updateDayField(day.id, { heroPhotoPreviewUrl: v, heroPhotoValue: v })} />
                            <StudioTextArea className="md:col-span-2" label="Journal" value={day.journal} onChange={(v) => updateDayField(day.id, { journal: v })} />
                          </div>
                          {photos.length > 0 && (
                            <div className="mt-4 space-y-2">
                              <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Select cover photo</p>
                              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                                {photos.map((photo) => (
                                  <button
                                    key={`${day.id}-${photo.id}`}
                                    className={`overflow-hidden rounded-[1rem] border text-left transition ${
                                      day.heroPhotoValue === photo.storageKey
                                        ? "border-terracotta/40 ring-1 ring-terracotta/20"
                                        : "border-ink/10 hover:border-ink/25"
                                    }`}
                                    onClick={() => updateDayField(day.id, { heroPhotoPreviewUrl: photo.previewUrl, heroPhotoValue: photo.storageKey })}
                                    type="button"
                                  >
                                    <img alt={photo.alt || photo.originalFilename} className="h-20 w-full object-cover" src={photo.previewUrl} />
                                    <p className="truncate px-2 py-1.5 text-[0.65rem] text-ink/55">{photo.originalFilename}</p>
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            {/* === PHOTOS, COLLABORATORS, DANGER ZONE (edit only) === */}
            {mode === "edit" && initialSnapshot && (
              <>
                <PhotosSection
                  days={days}
                  isOwner={isOwner}
                  photos={photos}
                  setPhotos={setPhotos}
                  tripId={initialSnapshot.id}
                  selectedPhotoIds={selectedPhotoIds}
                  setSelectedPhotoIds={setSelectedPhotoIds}
                  batchDayId={batchDayId}
                  setBatchDayId={setBatchDayId}
                  savingBatch={savingBatchPhotos}
                  onBatchAssign={handleBatchAssignPhotos}
                />
                {isOwner && (
                  <CollaboratorsSection
                    collaborators={initialSnapshot.collaborators}
                    inviteeEmail={pendingInviteEmail}
                    pendingInvites={initialSnapshot.pendingInvites}
                    setInviteeEmail={setPendingInviteEmail}
                    tripId={initialSnapshot.id}
                  />
                )}
                {isOwner && (
                  <section id="danger-zone" className="rounded-xl border border-terracotta/25 bg-terracotta/8 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
                    <h2 className="font-display text-3xl leading-none text-ink sm:text-4xl">Danger Zone</h2>
                    <p className="mt-3 text-sm leading-7 text-ink/72">Deleting a trip removes its sheet rows and internal photo objects permanently.</p>
                    <div className="mt-5 flex flex-col gap-3 md:flex-row">
                      <input
                        className="h-12 flex-1 rounded-full border border-terracotta/20 bg-paper px-4 text-base text-ink outline-none"
                        onChange={(e) => setDeleteConfirmation(e.target.value)}
                        placeholder={`Type "${initialSnapshot.title}" to confirm`}
                        value={deleteConfirmation}
                      />
                      <button
                        className="h-12 rounded-full bg-terracotta px-5 text-sm uppercase tracking-[0.22em] text-paper disabled:cursor-not-allowed disabled:opacity-55"
                        disabled={deleteConfirmation !== initialSnapshot.title}
                        onClick={async () => {
                          const response = await fetch(`/api/trips/${initialSnapshot.id}`, { method: "DELETE" });
                          const payload = (await response.json()) as { message?: string };
                          if (!response.ok) {
                            toast.error(payload.message ?? "Unable to delete trip");
                            return;
                          }
                          toast.success("Trip deleted");
                          window.location.assign("/");
                        }}
                        type="button"
                      >
                        Delete trip
                      </button>
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

// ------ DnD Sortable Stop List per Day ------

function DayStopList(props: {
  day: StudioDayDraft;
  allDays: StudioDayDraft[];
  tripId?: string;
  mode: "create" | "edit";
  activeStopId: string | null;
  onDeleteStop: (dayId: string, stopId: string, name: string) => void;
  onReorderDrop: (dayId: string, event: DragEndEvent) => void;
  onMoveStop: (fromDayId: string, stopId: string, toDayId: string) => void;
  onRenameStop: (dayId: string, stopId: string, newName: string) => void;
  onStopClick: (stopId: string) => void;
}) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  if (props.day.stops.length === 0) {
    return (
      <article className="rounded-xl border border-ink/10 bg-sand/30 p-3 sm:rounded-[1.4rem] sm:p-4">
        <h3 className="font-display text-xl text-ink">Day {props.day.dayIndex}</h3>
        <p className="mt-1 text-xs text-ink/45">No stops yet</p>
      </article>
    );
  }

  return (
    <article className="rounded-xl border border-ink/10 bg-sand/30 p-3 sm:rounded-[1.4rem] sm:p-4">
      <h3 className="font-display text-xl text-ink">Day {props.day.dayIndex} <span className="text-sm font-normal text-ink/50">{props.day.title || props.day.date}</span></h3>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => props.onReorderDrop(props.day.id, e)}>
        <SortableContext items={props.day.stops.map((s) => s.id)} strategy={verticalListSortingStrategy}>
          <div className="mt-3 grid gap-2">
            {props.day.stops.map((stop, index) => (
              <SortableStopItem
                key={stop.id}
                stop={stop}
                index={index}
                dayId={props.day.id}
                allDays={props.allDays}
                isActive={props.activeStopId === stop.id}
                onDelete={() => props.onDeleteStop(props.day.id, stop.id, stop.name)}
                onMove={(toDayId) => props.onMoveStop(props.day.id, stop.id, toDayId)}
                onRename={(newName) => props.onRenameStop(props.day.id, stop.id, newName)}
                onClick={() => props.onStopClick(stop.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </article>
  );
}

function SortableStopItem(props: {
  stop: PlaceStop;
  index: number;
  dayId: string;
  allDays: StudioDayDraft[];
  isActive: boolean;
  onDelete: () => void;
  onMove: (toDayId: string) => void;
  onRename: (newName: string) => void;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.stop.id });
  const [showMove, setShowMove] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(props.stop.name);
  const inputRef = useRef<HTMLInputElement>(null);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  };

  const otherDays = props.allDays.filter((d) => d.id !== props.dayId);

  function commitRename() {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== props.stop.name) {
      props.onRename(trimmed);
    } else {
      setEditName(props.stop.name);
    }
    setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center gap-1.5 rounded-xl border bg-paper px-1.5 py-1.5 text-sm transition sm:gap-2 sm:rounded-[1.2rem] sm:px-2 sm:py-2 ${
        props.isActive ? "border-terracotta/30 ring-1 ring-terracotta/20" : "border-paper/60"
      }`}
      onClick={props.onClick}
    >
      <button className="flex h-9 w-9 cursor-grab touch-none items-center justify-center text-ink/30 hover:text-ink/60 sm:h-11 sm:w-11" {...attributes} {...listeners} type="button">
        <GripVertical className="h-4 w-4" />
      </button>
      {editing ? (
        <input
          ref={inputRef}
          className="flex-1 rounded-lg border border-ink/15 bg-sand/30 px-2 py-1 text-sm text-ink/80 outline-none focus:border-olive/40"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={commitRename}
          onKeyDown={(e) => {
            if (e.key === "Enter") commitRename();
            if (e.key === "Escape") { setEditName(props.stop.name); setEditing(false); }
          }}
          onClick={(e) => e.stopPropagation()}
          autoFocus
        />
      ) : (
        <span
          className="flex-1 cursor-text text-ink/75"
          onDoubleClick={(e) => { e.stopPropagation(); setEditName(props.stop.name); setEditing(true); }}
          title="Double-click to rename"
        >
          {props.index + 1}. {props.stop.name}
        </span>
      )}
      <div className="flex flex-shrink-0 items-center gap-0.5 sm:gap-1">
        {otherDays.length > 0 && (
          <div className="relative">
            <button
              className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 hover:bg-sand/50 hover:text-ink/70 sm:h-11 sm:w-11"
              onClick={(e) => { e.stopPropagation(); setShowMove(!showMove); }}
              title="Move to another day"
              type="button"
            >
              <ArrowRightLeft className="h-3.5 w-3.5" />
            </button>
            {showMove && (
              <div className="absolute right-0 top-full z-10 mt-1 min-w-[10rem] rounded-[1rem] border border-ink/10 bg-paper p-2 shadow-card">
                {otherDays.map((d) => (
                  <button
                    key={d.id}
                    className="w-full rounded-lg px-3 py-1.5 text-left text-xs text-ink/70 hover:bg-sand/40"
                    onClick={(e) => { e.stopPropagation(); props.onMove(d.id); setShowMove(false); }}
                    type="button"
                  >
                    Day {d.dayIndex} · {d.title || d.date}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        <button
          className="flex h-9 w-9 items-center justify-center rounded-full text-ink/40 hover:bg-terracotta/10 hover:text-terracotta sm:h-11 sm:w-11"
          onClick={(e) => { e.stopPropagation(); props.onDelete(); }}
          title="Remove stop"
          type="button"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ------ Photos Section with batch assign ------

function PhotosSection(props: {
  tripId: string;
  photos: TripStudioPhoto[];
  days: StudioDayDraft[];
  setPhotos: Dispatch<SetStateAction<TripStudioPhoto[]>>;
  isOwner: boolean;
  selectedPhotoIds: Set<string>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  batchDayId: string;
  setBatchDayId: (value: string) => void;
  savingBatch: boolean;
  onBatchAssign: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const router = useRouter();

  const unassigned = props.photos.filter((p) => p.status === "unassigned");

  return (
    <section id="photos" className="rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
      <h2 className="font-display text-3xl leading-none text-ink sm:text-4xl">Photos</h2>
      <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border border-dashed border-olive/25 bg-sand/25 px-3 py-3 text-sm text-ink/72 sm:mt-6 sm:rounded-[1.4rem] sm:px-4 sm:py-4">
        <span>{uploading ? "Uploading..." : "Upload trip photos"}</span>
        <input
          className="hidden"
          multiple
          disabled={uploading}
          onChange={async (event) => {
            const files = Array.from(event.target.files ?? []);
            if (files.length === 0) return;
            setUploading(true);
            try {
              const isHeic = (f: File) =>
                f.type === "image/heic" || f.type === "image/heif" || /\.(heic|heif)$/i.test(f.name);
              const toUpload = (
                await Promise.all(
                  files.map(async (file): Promise<File[]> => {
                    if (!isHeic(file)) return [file];
                    const result = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.92 });
                    const blobs = Array.isArray(result) ? result : [result];
                    const base = file.name.replace(/\.(heic|heif)$/i, "");
                    return blobs.map((blob, i) =>
                      new File([blob], blobs.length > 1 ? `${base}-${i}.jpg` : `${base}.jpg`, {
                        type: "image/jpeg"
                      })
                    );
                  })
                )
              ).flat();

              const formData = new FormData();
              formData.set("tripId", props.tripId);
              formData.set("timezone", Intl.DateTimeFormat().resolvedOptions().timeZone);
              formData.set("tripDays", JSON.stringify(props.days.map((day) => ({ date: day.date, id: day.id }))));
              for (const file of toUpload) formData.append("photos", file);

              const response = await fetch(`/api/trips/${props.tripId}/photos/upload`, { body: formData, method: "POST" });
              if (!response.ok) {
                toast.error("Unable to upload photos");
                return;
              }
              toast.success(`${toUpload.length} photo${toUpload.length === 1 ? "" : "s"} uploaded`);
              router.refresh();
            } finally {
              setUploading(false);
            }
          }}
          type="file"
          accept="image/*"
        />
        <span className="font-mono text-xs uppercase tracking-[0.22em] text-olive">Pick files</span>
      </label>

      {/* Batch assign bar */}
      {unassigned.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-olive/15 bg-sand/20 px-4 py-3">
          <button
            className="rounded-full border border-ink/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink/70"
            onClick={() => {
              const allUnassignedIds = new Set(unassigned.map((p) => p.id));
              props.setSelectedPhotoIds((current) => current.size === allUnassignedIds.size ? new Set() : allUnassignedIds);
            }}
            type="button"
          >
            {props.selectedPhotoIds.size === unassigned.length ? "Deselect all" : `Select all unassigned (${unassigned.length})`}
          </button>
          {props.selectedPhotoIds.size > 0 && (
            <>
              <select
                className="h-10 rounded-[1rem] border border-ink/10 bg-paper px-3 text-sm text-ink outline-none"
                onChange={(e) => props.setBatchDayId(e.target.value)}
                value={props.batchDayId}
              >
                <option value="">Assign to day...</option>
                {props.days.map((day) => (
                  <option key={day.id} value={day.id}>Day {day.dayIndex} · {day.title || day.date}</option>
                ))}
              </select>
              <button
                className="rounded-full bg-ink px-4 py-2 text-xs uppercase tracking-[0.18em] text-paper disabled:opacity-55"
                disabled={!props.batchDayId || props.savingBatch}
                onClick={props.onBatchAssign}
                type="button"
              >
                {props.savingBatch ? "Assigning..." : `Assign ${props.selectedPhotoIds.size} photo${props.selectedPhotoIds.size === 1 ? "" : "s"}`}
              </button>
            </>
          )}
        </div>
      )}

      <div className="mt-4 grid gap-3 sm:mt-6 sm:gap-4 md:grid-cols-2">
        {props.photos.map((photo) => (
          <article key={photo.id} className={`overflow-hidden rounded-xl border bg-sand/30 sm:rounded-[1.6rem] ${props.selectedPhotoIds.has(photo.id) ? "border-terracotta/30 ring-1 ring-terracotta/20" : "border-ink/10"}`}>
            <div className="relative">
              <img alt={photo.alt} className="h-48 w-full object-cover" src={photo.previewUrl} />
              {photo.status === "unassigned" && (
                <button
                  className="absolute left-3 top-3 h-6 w-6 rounded-md border-2 border-paper bg-paper/80"
                  onClick={() => props.setSelectedPhotoIds((current) => {
                    const next = new Set(current);
                    if (next.has(photo.id)) next.delete(photo.id);
                    else next.add(photo.id);
                    return next;
                  })}
                  type="button"
                >
                  {props.selectedPhotoIds.has(photo.id) && <span className="block h-full w-full rounded bg-terracotta" />}
                </button>
              )}
            </div>
            <div className="grid gap-3 p-4">
              <StudioField
                label="Alt text"
                value={photo.alt}
                onChange={(value) =>
                  props.setPhotos((c) => c.map((p) => (p.id === photo.id ? { ...p, alt: value } : p)))
                }
              />
              <label className="grid gap-2 text-sm text-ink/75">
                <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Assign to day</span>
                <select
                  className="h-12 rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-base text-ink outline-none"
                  onChange={(e) =>
                    props.setPhotos((c) =>
                      c.map((p) =>
                        p.id === photo.id
                          ? { ...p, dayId: e.target.value, status: e.target.value ? "ready" : "unassigned" }
                          : p
                      )
                    )
                  }
                  value={photo.dayId}
                >
                  <option value="">Unassigned</option>
                  {props.days.map((day) => (
                    <option key={day.id} value={day.id}>Day {day.dayIndex} · {day.title || day.date}</option>
                  ))}
                </select>
              </label>
              <div className="flex flex-wrap gap-2">
                <PhotoActionButton
                  label="Save photo"
                  tripId={props.tripId}
                  photoId={photo.id}
                  action={async () => {
                    const response = await fetch(`/api/trips/${props.tripId}/photos/${photo.id}`, {
                      body: JSON.stringify({ alt: photo.alt, dayId: photo.dayId }),
                      headers: { "Content-Type": "application/json" },
                      method: "PATCH"
                    });
                    if (!response.ok) throw new Error("Unable to save photo");
                    toast.success("Photo saved");
                  }}
                />
                <button
                  className="rounded-full border border-terracotta/20 px-4 py-2 text-xs uppercase tracking-[0.18em] text-terracotta"
                  onClick={async () => {
                    const response = await fetch(`/api/trips/${props.tripId}/photos/${photo.id}`, { method: "DELETE" });
                    if (!response.ok) {
                      toast.error("Unable to delete photo");
                      return;
                    }
                    props.setPhotos((c) => c.filter((p) => p.id !== photo.id));
                    toast.success("Photo deleted");
                  }}
                  type="button"
                >
                  Delete
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function PhotoActionButton(props: { label: string; tripId: string; photoId: string; action: () => Promise<void> }) {
  const [pending, setPending] = useState(false);
  return (
    <button
      className="rounded-full bg-ink px-4 py-2 text-xs uppercase tracking-[0.18em] text-paper disabled:opacity-55"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try { await props.action(); } catch (e) { toast.error(e instanceof Error ? e.message : "Action failed"); }
        finally { setPending(false); }
      }}
      type="button"
    >
      {pending ? "Saving..." : props.label}
    </button>
  );
}

// ------ Collaborators Section ------

function CollaboratorsSection(props: {
  tripId: string;
  collaborators: TripStudioSnapshot["collaborators"];
  pendingInvites: TripStudioSnapshot["pendingInvites"];
  inviteeEmail: string;
  setInviteeEmail: (value: string) => void;
}) {
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteExpiresAt, setInviteExpiresAt] = useState<string | null>(null);
  const [localPendingInvites, setLocalPendingInvites] = useState(props.pendingInvites);
  const [localCollaborators, setLocalCollaborators] = useState(props.collaborators);
  const [inviting, setInviting] = useState(false);

  useEffect(() => { setLocalPendingInvites(props.pendingInvites); }, [props.pendingInvites]);
  useEffect(() => { setLocalCollaborators(props.collaborators); }, [props.collaborators]);

  return (
    <section id="collaborators" className="rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
      <h2 className="font-display text-3xl leading-none text-ink sm:text-4xl">Collaborators</h2>
      <div className="mt-6 flex flex-col gap-3 md:flex-row">
        <input
          className="h-12 flex-1 rounded-full border border-ink/10 bg-sand/25 px-4 text-base text-ink outline-none"
          onChange={(e) => props.setInviteeEmail(e.target.value)}
          placeholder="co-editor@email.com"
          value={props.inviteeEmail}
        />
        <button
          className="h-12 rounded-full bg-ink px-5 text-sm uppercase tracking-[0.22em] text-paper disabled:opacity-55"
          disabled={inviting || !props.inviteeEmail.trim()}
          onClick={async () => {
            setInviting(true);
            try {
              const response = await fetch(`/api/trips/${props.tripId}/collaborators`, {
                body: JSON.stringify({ email: props.inviteeEmail }),
                headers: { "Content-Type": "application/json" },
                method: "POST"
              });
              const payload = (await response.json()) as { email?: string; expiresAt?: string; inviteId?: string; inviteUrl?: string; message?: string };
              if (!response.ok) {
                toast.error(payload.message ?? "Unable to invite collaborator");
                setInviteUrl(null);
                return;
              }
              if (payload.inviteId && payload.expiresAt) {
                setLocalPendingInvites((c) => [
                  { createdAt: new Date().toISOString(), email: payload.email ?? props.inviteeEmail.trim().toLowerCase(), expiresAt: payload.expiresAt!, inviteId: payload.inviteId!, role: "editor" },
                  ...c.filter((i) => i.inviteId !== payload.inviteId)
                ]);
              }
              props.setInviteeEmail("");
              setInviteExpiresAt(payload.expiresAt ?? null);
              setInviteUrl(payload.inviteUrl ?? null);
              toast.success("Invite sent");
            } finally {
              setInviting(false);
            }
          }}
          type="button"
        >
          {inviting ? "Inviting..." : "Invite editor"}
        </button>
      </div>
      {inviteUrl && (
        <div className="mt-4 rounded-[1.4rem] border border-ink/10 bg-sand/35 p-4">
          <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">One-time invite link</p>
          <p className="mt-3 break-all text-sm leading-7 text-ink/75">{inviteUrl}</p>
          {inviteExpiresAt && <p className="mt-2 text-xs text-ink/55">Expires {new Date(inviteExpiresAt).toLocaleString()}</p>}
          <button
            className="mt-4 rounded-full border border-ink/10 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink"
            onClick={async () => {
              if (!navigator.clipboard) { toast.error("Clipboard unavailable"); return; }
              await navigator.clipboard.writeText(inviteUrl);
              toast.success("Link copied");
            }}
            type="button"
          >
            Copy link
          </button>
        </div>
      )}
      <div className="mt-6 grid gap-3">
        {localCollaborators.map((collaborator) => (
          <div key={collaborator.email} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-ink/10 bg-sand/30 px-4 py-3 text-sm text-ink/75">
            <span>{collaborator.email} · {collaborator.role}</span>
            {collaborator.role === "editor" && (
              <button
                className="rounded-full border border-terracotta/20 px-3 py-1 text-xs uppercase tracking-[0.16em] text-terracotta"
                onClick={async () => {
                  const response = await fetch(`/api/trips/${props.tripId}/collaborators/${encodeURIComponent(collaborator.email)}`, { method: "DELETE" });
                  if (!response.ok) { toast.error("Unable to revoke collaborator"); return; }
                  setLocalCollaborators((c) => c.filter((col) => col.email !== collaborator.email));
                  toast.success("Collaborator revoked");
                }}
                type="button"
              >
                Revoke
              </button>
            )}
          </div>
        ))}
      </div>
      {localPendingInvites.length > 0 && (
        <div className="mt-6 grid gap-3">
          {localPendingInvites.map((invite) => (
            <div key={invite.inviteId} className="flex flex-wrap items-center justify-between gap-3 rounded-[1.4rem] border border-ink/10 bg-paper px-4 py-3 text-sm text-ink/75">
              <span>{invite.email} · pending until {new Date(invite.expiresAt).toLocaleDateString()}</span>
              <button
                className="rounded-full border border-ink/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink/72"
                onClick={async () => {
                  const response = await fetch(`/api/trips/${props.tripId}/invites/${invite.inviteId}`, { method: "DELETE" });
                  if (!response.ok) { toast.error("Unable to cancel invite"); return; }
                  setLocalPendingInvites((c) => c.filter((i) => i.inviteId !== invite.inviteId));
                  toast.success("Invite cancelled");
                }}
                type="button"
              >
                Cancel invite
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// ------ Shared form primitives ------

function StudioField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-ink/75">
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">{props.label}</span>
      <input
        className="h-12 rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-base text-ink outline-none transition focus:border-olive/45"
        onChange={(e) => props.onChange(e.target.value)}
        type={props.type ?? "text"}
        value={props.value}
      />
    </label>
  );
}

function StudioTextArea(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm text-ink/75 ${props.className ?? ""}`}>
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">{props.label}</span>
      <textarea
        className="min-h-28 rounded-[1.4rem] border border-ink/10 bg-paper px-4 py-4 text-base leading-7 text-ink outline-none transition focus:border-olive/45"
        onChange={(e) => props.onChange(e.target.value)}
        value={props.value}
      />
    </label>
  );
}

// ------ Pure helpers ------

function parseCompanions(value: string) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function toStudioDays(snapshot?: TripStudioSnapshot) {
  if (!snapshot) return [];
  return snapshot.days.map((day) => ({
    cityLabel: day.cityLabel,
    date: day.date,
    dayIndex: day.dayIndex,
    heroPhotoPreviewUrl: day.heroPhotoPreviewUrl,
    heroPhotoValue: day.heroPhotoValue,
    highlightMoment: day.highlightMoment,
    id: day.id,
    journal: day.journal,
    stops: day.stops,
    summary: day.summary,
    title: day.title
  }));
}

function syncDateDrivenDays(currentDays: StudioDayDraft[], startDate: string, endDate: string) {
  const existingByDate = new Map(currentDays.map((day) => [day.date, day]));
  return enumerateDates(startDate, endDate).map((date, index) => {
    const existing = existingByDate.get(date);
    if (existing) return { ...existing, dayIndex: index + 1 };
    return {
      cityLabel: "", date, dayIndex: index + 1, heroPhotoPreviewUrl: "", heroPhotoValue: "",
      highlightMoment: "", id: `draft-${date}`, journal: "", stops: [] as PlaceStop[], summary: "", title: ""
    };
  });
}

function enumerateDates(startDate: string, endDate: string) {
  if (!startDate || !endDate) return [];
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const finalDate = new Date(`${endDate}T00:00:00.000Z`);
  while (cursor <= finalDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

function hasInvalidDateRange(startDate: string, endDate: string) {
  if (!startDate || !endDate) return false;
  return new Date(`${startDate}T00:00:00.000Z`) > new Date(`${endDate}T00:00:00.000Z`);
}

function patchDay(
  dayId: string,
  patch: Partial<StudioDayDraft>,
  setDays: Dispatch<SetStateAction<StudioDayDraft[]>>
) {
  setDays((currentDays) => currentDays.map((day) => (day.id === dayId ? { ...day, ...patch } : day)));
}
