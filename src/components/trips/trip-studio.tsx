"use client";

import dynamic from "next/dynamic";
import type { Dispatch, ReactNode, SetStateAction } from "react";
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
import { GripVertical, Trash2, ArrowRightLeft, ChevronDown, ChevronUp, MapPin, Loader2 } from "lucide-react";

import type { PlaceStop, TripStudioPhoto, TripStudioSnapshot } from "@/types/travel";
import { computeCentroid } from "@/lib/geo-utils";
import { parseGoogleMapsLink } from "@/lib/google-maps-parser";
import { useAutosave } from "@/hooks/use-autosave";

const RouteEditorMap = dynamic(
  () => import("@/components/trips/route-editor-map").then((mod) => ({ default: mod.RouteEditorMap })),
  { ssr: false, loading: () => <div className="min-h-[22rem] animate-pulse rounded-[1.8rem] border border-olive/15 bg-sand/30" /> }
);
import { cn, formatCompanionLabel, formatDisplayDate } from "@/lib/utils";

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
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [batchDayId, setBatchDayId] = useState("");
  const [savingBatchPhotos, setSavingBatchPhotos] = useState(false);
  const [mobileStopsTab, setMobileStopsTab] = useState<"list" | "map">("list");
  const [selectedDayId, setSelectedDayId] = useState(initialSnapshot?.days[0]?.id ?? "");
  const [activeSectionId, setActiveSectionId] = useState("hero");
  const [highlightedSectionId, setHighlightedSectionId] = useState<string | null>(null);
  const [showSectionNavigator, setShowSectionNavigator] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

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
    setSelectedDayId(initialSnapshot.days[0]?.id ?? "");
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

  useEffect(() => {
    if (days.length === 0) {
      setSelectedDayId("");
      return;
    }

    if (!days.some((day) => day.id === selectedDayId)) {
      setSelectedDayId(days[0]?.id ?? "");
    }
  }, [days, selectedDayId]);

  useEffect(() => {
    if (!highlightedSectionId) return;

    const timeout = window.setTimeout(() => setHighlightedSectionId(null), 1400);
    return () => window.clearTimeout(timeout);
  }, [highlightedSectionId]);

  const selectedDay = useMemo(() => {
    if (days.length === 0) return null;
    return days.find((day) => day.id === selectedDayId) ?? days[0] ?? null;
  }, [days, selectedDayId]);

  const selectedDayPhotos = useMemo(
    () => (selectedDay ? photos.filter((photo) => photo.dayId === selectedDay.id) : []),
    [photos, selectedDay]
  );

  const sectionItems = useMemo(() => {
    const items: Array<{
      id: string;
      title: string;
      summary: string;
      shownOnPage: string;
      status: SectionStatus;
    }> = [
      {
        id: "hero",
        title: "Hero",
        summary: "Title, summary, cover",
        shownOnPage: "Shown on Trip page: title, summary, cover image",
        status: getCompletionStatus([title, summary, coverPhotoValue])
      }
    ];

    if (mode === "edit") {
      items.push({
        id: "photo-library",
        title: "Photo library",
        summary: photos.length > 0 ? `${photos.length} uploaded photo${photos.length === 1 ? "" : "s"}` : "Upload and assign trip photos",
        shownOnPage: "Supports hero, day stories, and ending gallery",
        status: getCollectionStatus(photos.length)
      });
    }

    items.push(
      {
        id: "trip-facts",
        title: "Trip facts",
        summary: "Dates, companions, route, mood",
        shownOnPage: "Shown on Trip page: dates, route, and mood cards",
        status: getCompletionStatus([startDate, endDate, routeSummary, highlightLabel], [travelCompanions, timezone])
      },
      {
        id: "route-map",
        title: "Route map & stops",
        summary: `${allStops.length} stop${allStops.length === 1 ? "" : "s"} across ${days.length} day${days.length === 1 ? "" : "s"}`,
        shownOnPage: "Shown on Trip page: overview map and stop chips",
        status: getCollectionStatus(allStops.length)
      },
      {
        id: "day-stories",
        title: "Day stories",
        summary: `${days.length} day${days.length === 1 ? "" : "s"} of story editing`,
        shownOnPage: "Shown on Trip page: day cards",
        status: getDayStoriesStatus(days)
      },
      {
        id: "ending-gallery",
        title: "Last frames worth keeping",
        summary: endingPhotoIds.length > 0 ? `${endingPhotoIds.length} ending photo${endingPhotoIds.length === 1 ? "" : "s"} selected` : "Choose the closing photo strip",
        shownOnPage: "Shown on Trip page: Trip ending photo strip",
        status: endingPhotoIds.length > 0 ? "ready" : getCollectionStatus(readyPhotosForEndingSelection.length)
      }
    );

    if (mode === "edit" && isOwner) {
      items.push({
        id: "sharing",
        title: "Sharing",
        summary: "Invite editors and manage access",
        shownOnPage: "Shown on Trip page: edit access and invite flow",
        status: initialSnapshot && (initialSnapshot.collaborators.length > 1 || initialSnapshot.pendingInvites.length > 0) ? "ready" : "empty"
      });
      items.push({
        id: "danger-zone",
        title: "Danger zone",
        summary: "Delete this trip permanently",
        shownOnPage: "Owner-only administration",
        status: "empty"
      });
    }

    return items;
  }, [
    allStops.length,
    coverPhotoValue,
    days,
    endingPhotoIds.length,
    highlightLabel,
    initialSnapshot,
    isOwner,
    mode,
    photos.length,
    readyPhotosForEndingSelection.length,
    routeSummary,
    startDate,
    summary,
    title,
    travelCompanions,
    endDate,
    timezone
  ]);

  const currentSection = sectionItems.find((section) => section.id === activeSectionId) ?? sectionItems[0];

  // Update active section based on scroll position (for mobile sticky header)
  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const ids = sectionItems.map((s) => s.id);
    if (ids.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting);
        if (visible.length === 0) return;
        // Pick the section whose top is closest to the top of the viewport
        const sorted = visible
          .map((e) => ({ el: e.target as HTMLElement, rect: e.boundingClientRect }))
          .sort((a, b) => a.rect.top - b.rect.top);
        const top = sorted[0];
        const id = top.el.getAttribute("id");
        if (id && ids.includes(id)) setActiveSectionId(id);
      },
      { root: null, rootMargin: "-15% 0px -50% 0px", threshold: [0, 0.01, 0.1, 0.5, 1] }
    );

    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [sectionItems]);

  const jumpToSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setHighlightedSectionId(sectionId);
    setShowSectionNavigator(false);
    setExpandedSections((current) => new Set(current).add(sectionId));

    if (typeof document === "undefined") return;

    const section = document.getElementById(sectionId);
    if (section && "scrollIntoView" in section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const isSectionExpanded = (sectionId: string) => expandedSections.has(sectionId);

  const toggleSection = (sectionId: string) => {
    setActiveSectionId(sectionId);
    setExpandedSections((current) => {
      const next = new Set(current);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  return (
    <main className="mx-auto max-w-7xl overflow-x-hidden px-3 py-5 sm:px-6 sm:py-8 lg:px-8">
      {currentSection && (
        <div className="sticky top-3 z-30 mb-4 lg:hidden">
          <div className="rounded-[1.4rem] border border-ink/10 bg-paper/95 p-3 shadow-card backdrop-blur">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-olive">
                  {sectionItems.findIndex((section) => section.id === currentSection.id) + 1} of {sectionItems.length}
                </p>
                <p className="truncate font-display text-xl text-ink">{currentSection.title}</p>
              </div>
              <button
                aria-haspopup="dialog"
                className="rounded-full border-2 border-ink/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-ink"
                onClick={() => setShowSectionNavigator(true)}
                type="button"
              >
                Sections
              </button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-3 text-xs text-ink/62">
              <span className="truncate">{currentSection.summary}</span>
            </div>
          </div>
        </div>
      )}
      <section className="relative overflow-hidden rounded-2xl border border-ink/10 bg-paper shadow-float sm:rounded-[2.8rem]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(191,108,77,0.16),transparent_30%),linear-gradient(180deg,rgba(246,241,231,0.98),rgba(221,209,191,0.78))]" />
        <div className="relative grid gap-6 px-4 py-6 sm:gap-8 sm:px-6 sm:py-8 md:px-10 md:py-10 lg:grid-cols-[0.34fr_0.66fr]">
          <aside className="hidden space-y-4 sm:space-y-5 lg:block lg:sticky lg:top-8 lg:self-start">
            <p className="font-mono text-[0.72rem] uppercase tracking-[0.36em] text-olive">Trip Studio</p>
            <h1 className="font-display text-4xl leading-[0.92] text-ink sm:text-5xl md:text-6xl">
              {mode === "create" ? "Build the trip page" : "Edit the trip page"}
            </h1>
            <p className="hidden text-sm leading-7 text-ink/70 sm:block">
              Keep the editor in the same order as the trip readers see: hero first, route next, then day stories and the closing gallery.
            </p>
            <nav aria-label="Trip page sections" className="grid gap-2 rounded-[1.8rem] border border-ink/10 bg-paper/80 p-4">
              {sectionItems.map((section, index) => (
                <button
                  key={section.id}
                  className={cn(
                    "rounded-[1.2rem] border px-3 py-3 text-left transition",
                    activeSectionId === section.id
                      ? "border-olive/25 bg-olive/5"
                      : "border-transparent bg-paper/70 hover:border-ink/10"
                  )}
                  onClick={() => jumpToSection(section.id)}
                  type="button"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-olive">
                        {index + 1} of {sectionItems.length}
                      </p>
                      <p className="mt-1 text-sm font-medium text-ink">{section.title}</p>
                      <p className="mt-1 text-xs leading-5 text-ink/58">{section.summary}</p>
                    </div>
                  </div>
                </button>
              ))}
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

          <div className="grid min-w-0 gap-4 sm:gap-6">
            <section
              id="hero"
              className={cn(
                "rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6",
                highlightedSectionId === "hero" && "ring-2 ring-olive/25"
              )}
              onClick={() => setActiveSectionId("hero")}
            >
              <StudioSectionHeader
                description="Shown on Trip page: title, summary, cover image"
                eyebrow="Trip page"
                status={sectionItems.find((section) => section.id === "hero")?.status ?? "empty"}
                title="Hero"
                action={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StudioExpandButton
                      expanded={isSectionExpanded("hero")}
                      label="Hero"
                      onClick={() => toggleSection("hero")}
                    />
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
                  </div>
                }
              />
              {isSectionExpanded("hero") && (
                <>
                  <div className="mt-5 grid gap-4 rounded-[1.6rem] border border-ink/10 bg-sand/25 p-4">
                    <div
                      className="relative overflow-hidden rounded-[1.4rem] border border-ink/10 bg-paper px-4 py-5"
                      style={{
                        backgroundImage: coverPhotoValue ? `linear-gradient(135deg, rgba(246,241,231,0.92), rgba(246,241,231,0.82)), url(${coverPhotoValue})` : undefined,
                        backgroundPosition: "center",
                        backgroundSize: "cover"
                      }}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-olive/20 bg-paper/80 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-olive">
                          {days.length || 0} days
                        </span>
                        {travelCompanions && (
                          <span className="rounded-full border border-ink/10 bg-paper/80 px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-ink/60">
                            {formatCompanionLabel(parseCompanions(travelCompanions))}
                          </span>
                        )}
                      </div>
                      <h2 className="mt-4 font-display text-3xl leading-none text-ink sm:text-5xl">{title || "Trip title"}</h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-ink/72">
                        {summary || "This summary appears directly under the trip title on the public trip page."}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <StudioField
                      description="Shown as the large title at the top of the trip page."
                      label="Trip title"
                      value={title}
                      onChange={updateOverviewField(setTitle)}
                    />
                    <StudioField
                      description="Used for the hero background image."
                      label="Cover photo"
                      value={coverPhotoValue}
                      onChange={updateOverviewField(setCoverPhotoValue)}
                    />
                    <StudioTextArea
                      className="md:col-span-2"
                      description="Shown directly under the trip title."
                      label="Summary"
                      value={summary}
                      onChange={updateOverviewField(setSummary)}
                    />
                  </div>
                  {photos.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">Choose from photo library</p>
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {photos.slice(0, 6).map((photo) => (
                          <button
                            key={photo.id}
                            className="overflow-hidden rounded-[1.4rem] border border-ink/10 bg-sand/30 text-left"
                            onClick={() => {
                              setCoverPhotoValue(photo.storageKey);
                              if (mode === "edit") overviewAutoSave.markDirty();
                            }}
                            type="button"
                          >
                            <img alt={photo.alt} className="h-32 w-full object-cover" src={photo.previewUrl} />
                            <div className="px-4 py-3 text-sm text-ink/72">Use as hero cover</div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>

            {mode === "edit" && initialSnapshot && (
              <PhotosSection
                days={days}
                expanded={isSectionExpanded("photo-library")}
                isOwner={isOwner}
                photos={photos}
                setPhotos={setPhotos}
                onToggle={() => toggleSection("photo-library")}
                tripId={initialSnapshot.id}
                selectedPhotoIds={selectedPhotoIds}
                setSelectedPhotoIds={setSelectedPhotoIds}
                batchDayId={batchDayId}
                setBatchDayId={setBatchDayId}
                savingBatch={savingBatchPhotos}
                onBatchAssign={handleBatchAssignPhotos}
              />
            )}

            <section
              id="trip-facts"
              className={cn(
                "rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6",
                highlightedSectionId === "trip-facts" && "ring-2 ring-olive/25"
              )}
              onClick={() => setActiveSectionId("trip-facts")}
            >
              <StudioSectionHeader
                description="Shown on Trip page: dates, route, and mood cards"
                eyebrow="Trip page"
                status={sectionItems.find((section) => section.id === "trip-facts")?.status ?? "empty"}
                title="Trip facts"
                action={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StudioExpandButton
                      expanded={isSectionExpanded("trip-facts")}
                      label="Trip facts"
                      onClick={() => toggleSection("trip-facts")}
                    />
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
                  </div>
                }
              />
              {isSectionExpanded("trip-facts") && (
                <>
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <FactPreviewCard label="Dates" value={startDate && endDate ? `${formatDisplayDate(startDate)} - ${formatDisplayDate(endDate)}` : "Add trip dates"} />
                    <FactPreviewCard label="Route" value={routeSummary || "Describe the route shown in the trip facts row."} />
                    <FactPreviewCard label="Mood" value={highlightLabel || "Describe the mood label shown on the trip page."} />
                  </div>
                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                  <StudioField description="Used when displaying trip dates and matching imported photos." label="Timezone" value={timezone} onChange={updateOverviewField(setTimezone)} />
                  <StudioField description="Shown in the trip facts row." label="Travel companions" value={travelCompanions} onChange={updateOverviewField(setTravelCompanions)} />
                  <StudioField description="Shown in the trip facts row." label="Start date" type="date" value={startDate} onChange={updateOverviewField(setStartDate)} />
                  <StudioField description="Shown in the trip facts row." label="End date" type="date" value={endDate} onChange={updateOverviewField(setEndDate)} />
                  <StudioField description="Shown in the trip facts row as Route." label="Route" value={routeSummary} onChange={updateOverviewField(setRouteSummary)} />
                  <StudioField description="Shown in the trip facts row as Mood." label="Mood" value={highlightLabel} onChange={updateOverviewField(setHighlightLabel)} />
                </div>
                </>
              )}
            </section>

            <section
              id="route-map"
              className={cn(
                "rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6",
                highlightedSectionId === "route-map" && "ring-2 ring-olive/25"
              )}
              onClick={() => setActiveSectionId("route-map")}
            >
              <StudioSectionHeader
                description="Shown on Trip page: overview map and stop chips"
                eyebrow="Trip page"
                status={sectionItems.find((section) => section.id === "route-map")?.status ?? "empty"}
                title="Route map & stops"
                action={
                  <StudioExpandButton
                    expanded={isSectionExpanded("route-map")}
                    label="Route map & stops"
                    onClick={() => toggleSection("route-map")}
                  />
                }
              />
              <div className="mt-4 rounded-[1.6rem] border border-ink/10 bg-sand/20 p-3">
                <p className="text-sm leading-6 text-ink/62">
                  Add and arrange the route here. The same stops power the overview map, stop chips, and each day card route timeline.
                </p>
              </div>
              {isSectionExpanded("route-map") && (
                <>
                  {/* Mobile tab toggle */}
                  <div className="mt-4 flex gap-2 xl:hidden">
                    <button
                      className={`flex-1 rounded-full px-4 py-2.5 text-xs uppercase tracking-[0.22em] transition ${mobileStopsTab === "list" ? "bg-ink text-paper" : "border-2 border-ink/30 text-ink/70"}`}
                      onClick={() => setMobileStopsTab("list")}
                      type="button"
                    >
                      List
                    </button>
                    <button
                      className={`flex-1 rounded-full px-4 py-2.5 text-xs uppercase tracking-[0.22em] transition ${mobileStopsTab === "map" ? "bg-ink text-paper" : "border-2 border-ink/30 text-ink/70"}`}
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
                </>
              )}
            </section>

            <section
              id="day-stories"
              className={cn(
                "min-w-0 overflow-hidden rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6",
                highlightedSectionId === "day-stories" && "ring-2 ring-olive/25"
              )}
              onClick={() => setActiveSectionId("day-stories")}
            >
              <StudioSectionHeader
                description="Shown on Trip page: day cards"
                eyebrow="Trip page"
                status={sectionItems.find((section) => section.id === "day-stories")?.status ?? "empty"}
                title="Day stories"
                action={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StudioExpandButton
                      expanded={isSectionExpanded("day-stories")}
                      label="Day stories"
                      onClick={() => toggleSection("day-stories")}
                    />
                    <button
                      className="rounded-full bg-ink px-5 py-3 text-sm uppercase tracking-[0.22em] text-paper disabled:opacity-55"
                      disabled={creatingTrip || savingDays}
                      onClick={mode === "create" ? handleCreateTrip : handleSaveDays}
                      type="button"
                    >
                      {mode === "create" ? (creatingTrip ? "Creating..." : "Create trip") : (savingDays ? "Saving..." : "Save days")}
                    </button>
                  </div>
                }
              />
              {isSectionExpanded("day-stories") ? (days.length > 0 ? (
                <>
                  <div className="mt-5 flex min-w-0 gap-2 overflow-x-auto pb-1 [-webkit-overflow-scrolling:touch]">
                    {days.map((day) => (
                      <button
                        key={day.id}
                        className={cn(
                          "shrink-0 rounded-full border px-4 py-2 text-sm transition",
                          selectedDay?.id === day.id
                            ? "border-olive/25 bg-ink text-paper"
                            : "border-ink/10 bg-paper text-ink/70"
                        )}
                        onClick={() => setSelectedDayId(day.id)}
                        type="button"
                      >
                        Day {day.dayIndex}
                      </button>
                    ))}
                  </div>
                  {selectedDay && (
                    <div className="mt-4 grid min-w-0 gap-4">
                      <article className="min-w-0 overflow-hidden rounded-[1.6rem] border border-ink/10 bg-sand/25 p-4">
                        <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Shown on Trip page: day cards</p>
                        <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="font-display text-2xl text-ink">Day {selectedDay.dayIndex}</h3>
                            <p className="mt-1 text-sm text-ink/60">
                              {selectedDay.cityLabel || "City"} · {formatDisplayDate(selectedDay.date)}
                            </p>
                          </div>
                          <span className="rounded-full border border-ink/10 bg-paper px-3 py-1 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-ink/55">
                            {selectedDay.stops.length} stop{selectedDay.stops.length === 1 ? "" : "s"}
                          </span>
                        </div>
                        <p className="mt-3 font-display text-xl text-ink break-words">{selectedDay.title || "Add the day title"}</p>
                        <p className="mt-2 break-words text-sm leading-7 text-ink/68">
                          {selectedDay.summary || "Add the summary that appears under the day title on the public trip page."}
                        </p>
                        {selectedDay.stops.length > 0 && (
                          <div className="mt-4 min-w-0 overflow-hidden rounded-[1.2rem] border border-ink/10 bg-paper px-3 py-3">
                            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-olive">Route</p>
                            <p className="mt-2 break-words text-sm text-ink/68">{selectedDay.stops.map((stop) => stop.name).join(" → ")}</p>
                          </div>
                        )}
                        <div className="mt-4 grid gap-3 md:grid-cols-2">
                          <div className="min-w-0 overflow-hidden rounded-[1.2rem] border border-terracotta/20 bg-terracotta/10 p-3">
                            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-terracotta">Best moment</p>
                            <p className="mt-2 break-words text-sm text-ink/68">{selectedDay.highlightMoment || "Add the highlight moment that stands out on the day card."}</p>
                          </div>
                          <div className="rounded-[1.2rem] border border-ink/10 bg-paper p-3">
                            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-olive">Gallery</p>
                            <p className="mt-2 text-sm text-ink/68">{selectedDayPhotos.length} photo{selectedDayPhotos.length === 1 ? "" : "s"} assigned to this day</p>
                          </div>
                        </div>
                      </article>
                      <div className="grid gap-4 md:grid-cols-2">
                        <StudioField description="Shown at the top-right of the public day card." label="City" value={selectedDay.cityLabel} onChange={(value) => updateDayField(selectedDay.id, { cityLabel: value })} />
                        <StudioField description="Shown as the main heading inside the day card." label="Title" value={selectedDay.title} onChange={(value) => updateDayField(selectedDay.id, { title: value })} />
                        <StudioTextArea className="md:col-span-2" description="Shown under the day title and again as the memory note overlay." label="Summary" value={selectedDay.summary} onChange={(value) => updateDayField(selectedDay.id, { summary: value })} />
                        <StudioField description="Shown in the highlighted best-moment card." label="Best moment" value={selectedDay.highlightMoment} onChange={(value) => updateDayField(selectedDay.id, { highlightMoment: value })} />
                        <StudioField description="Used for the hero image on the selected day card." label="Day cover photo" value={selectedDay.heroPhotoValue} onChange={(value) => updateDayField(selectedDay.id, { heroPhotoPreviewUrl: value, heroPhotoValue: value })} />
                        <StudioTextArea className="md:col-span-2" description="Shown as the journal body text on the public day card." label="Journal" value={selectedDay.journal} onChange={(value) => updateDayField(selectedDay.id, { journal: value })} />
                      </div>
                      {photos.length > 0 && (
                        <div className="space-y-2">
                          <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Choose from photo library</p>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
                            {photos.map((photo) => (
                              <button
                                key={`${selectedDay.id}-${photo.id}`}
                                className={`overflow-hidden rounded-[1rem] border text-left transition ${
                                  selectedDay.heroPhotoValue === photo.storageKey
                                    ? "border-terracotta/40 ring-1 ring-terracotta/20"
                                    : "border-ink/10 hover:border-ink/25"
                                }`}
                                onClick={() => updateDayField(selectedDay.id, { heroPhotoPreviewUrl: photo.previewUrl, heroPhotoValue: photo.storageKey })}
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
                </>
              ) : (
                <div className="mt-5 rounded-[1.4rem] border border-ink/10 bg-sand/20 px-4 py-4 text-sm text-ink/62">
                  Add trip dates first so the day stories section can create one editor per day.
                </div>
              )) : null}
            </section>

            <section
              id="ending-gallery"
              className={cn(
                "rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6",
                highlightedSectionId === "ending-gallery" && "ring-2 ring-olive/25"
              )}
              onClick={() => setActiveSectionId("ending-gallery")}
            >
              <StudioSectionHeader
                description="Shown on Trip page: Trip ending photo strip"
                eyebrow="Trip page"
                status={sectionItems.find((section) => section.id === "ending-gallery")?.status ?? "empty"}
                title="Last frames worth keeping"
                action={
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    <StudioExpandButton
                      expanded={isSectionExpanded("ending-gallery")}
                      label="Last frames worth keeping"
                      onClick={() => toggleSection("ending-gallery")}
                    />
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
                  </div>
                }
              />
              <div className="mt-5 rounded-[1.6rem] border border-ink/10 bg-sand/25 p-4">
                <p className="text-sm leading-7 text-ink/68">
                  The closing strip is where the trip stops feeling like logistics and starts feeling like memory.
                </p>
                {endingPhotoIds.length > 0 ? (
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
                    {readyPhotosForEndingSelection
                      .filter((photo) => endingPhotoIds.includes(photo.id))
                      .map((photo) => (
                        <img
                          key={photo.id}
                          alt={photo.alt || photo.originalFilename}
                          className="h-24 w-full rounded-[1rem] object-cover"
                          src={photo.previewUrl}
                        />
                      ))}
                  </div>
                ) : (
                  <p className="mt-3 text-sm text-ink/55">Select the photos that should appear in the public ending gallery.</p>
                )}
              </div>
              {isSectionExpanded("ending-gallery") && (
                <div className="mt-6 space-y-2">
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">Ending gallery</p>
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
                              setEndingPhotoIds((current) =>
                                current.includes(photo.id)
                                  ? current.filter((photoId) => photoId !== photo.id)
                                  : [...current, photo.id]
                              );
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
              )}
            </section>

            {/* === COLLABORATORS, DANGER ZONE (edit only) === */}
            {mode === "edit" && initialSnapshot && (
              <>
                {isOwner && (
                  <CollaboratorsSection
                    collaborators={initialSnapshot.collaborators}
                    expanded={isSectionExpanded("sharing")}
                    inviteeEmail={pendingInviteEmail}
                    onToggle={() => toggleSection("sharing")}
                    pendingInvites={initialSnapshot.pendingInvites}
                    setInviteeEmail={setPendingInviteEmail}
                    tripId={initialSnapshot.id}
                  />
                )}
                {isOwner && (
                  <section
                    id="danger-zone"
                    className={cn(
                      "rounded-xl border border-terracotta/25 bg-terracotta/8 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6",
                      highlightedSectionId === "danger-zone" && "ring-2 ring-terracotta/20"
                    )}
                    onClick={() => setActiveSectionId("danger-zone")}
                  >
                    <StudioSectionHeader
                      description="Owner-only administration"
                      eyebrow="Support section"
                      status="empty"
                      title="Danger zone"
                      action={
                        <StudioExpandButton
                          expanded={isSectionExpanded("danger-zone")}
                          label="Danger zone"
                          onClick={() => toggleSection("danger-zone")}
                          variant="terracotta"
                        />
                      }
                    />
                    {isSectionExpanded("danger-zone") && (
                      <>
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
                      </>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        </div>
      </section>
      {showSectionNavigator && currentSection && (
        <SectionNavigatorDialog
          activeSectionId={activeSectionId}
          onClose={() => setShowSectionNavigator(false)}
          onSelect={jumpToSection}
          sections={sectionItems}
        />
      )}
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
  expanded: boolean;
  onToggle: () => void;
  selectedPhotoIds: Set<string>;
  setSelectedPhotoIds: Dispatch<SetStateAction<Set<string>>>;
  batchDayId: string;
  setBatchDayId: (value: string) => void;
  savingBatch: boolean;
  onBatchAssign: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhotoId, setSelectedPhotoId] = useState(props.photos[0]?.id ?? "");
  const router = useRouter();

  const unassigned = props.photos.filter((p) => p.status === "unassigned");
  const selectedPhoto = props.photos.find((photo) => photo.id === selectedPhotoId) ?? props.photos[0] ?? null;

  useEffect(() => {
    if (props.photos.length === 0) {
      setSelectedPhotoId("");
      return;
    }

    if (!props.photos.some((photo) => photo.id === selectedPhotoId)) {
      setSelectedPhotoId(props.photos[0]?.id ?? "");
    }
  }, [props.photos, selectedPhotoId]);

  return (
    <section id="photo-library" className="rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
      <StudioSectionHeader
        description="Supports hero, day stories, and ending gallery"
        eyebrow="Support section"
        status={props.photos.length > 0 ? "ready" : "empty"}
        title="Photo library"
        action={
          <StudioExpandButton
            expanded={props.expanded}
            label="Photo library"
            onClick={props.onToggle}
          />
        }
      />
      <p className="mt-3 text-sm leading-7 text-ink/68">
        Upload photos here, then reuse them in the hero, day stories, and ending gallery sections above.
      </p>
      {props.expanded && (
        <>
          <label className="mt-4 flex cursor-pointer items-center justify-between rounded-xl border-2 border-olive/70 bg-olive/15 px-5 py-6 text-base font-semibold text-ink shadow-md ring-2 ring-olive/20 transition hover:border-olive hover:bg-olive/25 hover:ring-olive/30 sm:mt-6 sm:rounded-[1.4rem] sm:px-8 sm:py-8">
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
        <span className="rounded-full bg-olive px-5 py-2.5 font-mono text-xs font-semibold uppercase tracking-[0.22em] text-paper shadow-sm">Pick files</span>
      </label>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-ink/55 sm:mt-5">
            <span className="rounded-full border border-ink/10 bg-paper px-3 py-1">{props.photos.length} photos in library</span>
            <span className="rounded-full border border-ink/10 bg-paper px-3 py-1">{unassigned.length} unassigned</span>
          </div>

      {/* Batch assign bar */}
          {unassigned.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center gap-3 rounded-[1.4rem] border border-olive/15 bg-sand/20 px-4 py-3">
          <button
            className="rounded-full border-2 border-ink/30 px-3 py-1 text-xs uppercase tracking-[0.18em] text-ink/70"
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

          {props.photos.length === 0 ? (
            <div className="mt-4 rounded-[1.4rem] border border-ink/10 bg-sand/20 px-4 py-6 text-sm text-ink/58">
              Upload photos to start building a reusable library for the hero, day stories, and ending gallery.
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:mt-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-3">
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Browse photos</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              {props.photos.map((photo) => {
                const isSelected = selectedPhoto?.id === photo.id;
                const isBatchSelected = props.selectedPhotoIds.has(photo.id);

                return (
                  <button
                    key={photo.id}
                    aria-label={`Open photo ${photo.originalFilename}`}
                    className={cn(
                      "overflow-hidden rounded-[1.2rem] border bg-sand/20 text-left transition",
                      isSelected ? "border-terracotta/35 ring-1 ring-terracotta/20" : "border-ink/10 hover:border-ink/25"
                    )}
                    onClick={() => setSelectedPhotoId(photo.id)}
                    type="button"
                  >
                    <div className="relative">
                      <img alt={photo.alt || photo.originalFilename} className="aspect-square w-full object-cover" src={photo.previewUrl} />
                      <div className="absolute inset-x-2 top-2 flex items-start justify-between gap-2">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-1 font-mono text-[0.6rem] font-semibold uppercase tracking-[0.18em] shadow-sm",
                            photo.status === "ready"
                              ? "bg-olive text-paper"
                              : "bg-terracotta/95 text-paper"
                          )}
                        >
                          {photo.status === "ready" ? "Assigned" : "Unassigned"}
                        </span>
                        {photo.status === "unassigned" && (
                          <button
                            className="flex h-6 w-6 items-center justify-center rounded-md border-2 border-paper bg-paper/85"
                            onClick={(event) => {
                              event.stopPropagation();
                              props.setSelectedPhotoIds((current) => {
                                const next = new Set(current);
                                if (next.has(photo.id)) next.delete(photo.id);
                                else next.add(photo.id);
                                return next;
                              });
                            }}
                            type="button"
                          >
                            {isBatchSelected && <span className="block h-3 w-3 rounded bg-terracotta" />}
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="px-3 py-2">
                      <p className="truncate text-sm text-ink/72">{photo.originalFilename}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {selectedPhoto && (
            <article className="rounded-[1.6rem] border border-ink/10 bg-sand/30 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Selected photo</p>
                  <h3 className="mt-2 font-display text-2xl text-ink">{selectedPhoto.originalFilename}</h3>
                  <p className="mt-2 text-sm text-ink/58">
                    Edit one photo at a time instead of opening a full card for every image.
                  </p>
                </div>
                <span
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em]",
                    selectedPhoto.status === "ready"
                      ? "bg-olive text-paper"
                      : "bg-terracotta/95 text-paper"
                  )}
                >
                  {selectedPhoto.status === "ready" ? "Assigned" : "Unassigned"}
                </span>
              </div>
              <img alt={selectedPhoto.alt || selectedPhoto.originalFilename} className="mt-4 h-64 w-full rounded-[1.2rem] object-cover" src={selectedPhoto.previewUrl} />
              <div className="mt-4 grid gap-3">
                <StudioField
                  label="Alt text"
                  value={selectedPhoto.alt}
                  onChange={(value) =>
                    props.setPhotos((current) => current.map((photo) => (photo.id === selectedPhoto.id ? { ...photo, alt: value } : photo)))
                  }
                />
                <label className="grid gap-2 text-sm text-ink/75">
                  <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">Assign to day</span>
                  <select
                    className="h-12 rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-base text-ink outline-none"
                    onChange={(e) =>
                      props.setPhotos((current) =>
                        current.map((photo) =>
                          photo.id === selectedPhoto.id
                            ? { ...photo, dayId: e.target.value, status: e.target.value ? "ready" : "unassigned" }
                            : photo
                        )
                      )
                    }
                    value={selectedPhoto.dayId}
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
                    photoId={selectedPhoto.id}
                    action={async () => {
                      const response = await fetch(`/api/trips/${props.tripId}/photos/${selectedPhoto.id}`, {
                        body: JSON.stringify({ alt: selectedPhoto.alt, dayId: selectedPhoto.dayId }),
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
                      const response = await fetch(`/api/trips/${props.tripId}/photos/${selectedPhoto.id}`, { method: "DELETE" });
                      if (!response.ok) {
                        toast.error("Unable to delete photo");
                        return;
                      }
                      props.setPhotos((current) => current.filter((photo) => photo.id !== selectedPhoto.id));
                      toast.success("Photo deleted");
                    }}
                    type="button"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          )}
            </div>
          )}
        </>
      )}
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
  expanded: boolean;
  onToggle: () => void;
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
    <section id="sharing" className="rounded-xl border border-ink/10 bg-paper/90 p-4 shadow-card sm:rounded-[2rem] sm:p-5 md:p-6">
      <StudioSectionHeader
        description="Invite editors and manage who can help refine this trip page."
        eyebrow="Support section"
        status={localCollaborators.length > 1 || localPendingInvites.length > 0 ? "ready" : "empty"}
        title="Sharing"
        action={
          <StudioExpandButton
            expanded={props.expanded}
            label="Sharing"
            onClick={props.onToggle}
          />
        }
      />
      <p className="mt-3 text-sm leading-7 text-ink/68">
        Invite editors and manage who can help refine this trip page.
      </p>
      {props.expanded && (
        <>
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
            className="mt-4 rounded-full border-2 border-ink/30 px-4 py-2 text-xs uppercase tracking-[0.2em] text-ink"
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
                className="rounded-full border-2 border-ink/30 px-3 py-1 text-xs uppercase tracking-[0.16em] text-ink/72"
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
        </>
      )}
    </section>
  );
}

// ------ Shared form primitives ------

type SectionStatus = "ready" | "in progress" | "empty";

function StudioSectionHeader(props: {
  eyebrow: string;
  title: string;
  description: string;
  status: SectionStatus;
  action?: ReactNode;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-olive">{props.eyebrow}</p>
        <h2 className="mt-2 font-display text-3xl leading-none text-ink sm:mt-3 sm:text-4xl">{props.title}</h2>
        <p className="mt-2 text-sm leading-7 text-ink/68">{props.description}</p>
      </div>
      {props.action && <div className="flex items-center gap-3">{props.action}</div>}
    </header>
  );
}

function StudioExpandButton(props: {
  expanded: boolean;
  label: string;
  onClick: () => void;
  variant?: "olive" | "terracotta";
}) {
  const isTerracotta = props.variant === "terracotta";
  return (
    <button
      aria-expanded={props.expanded}
      aria-label={props.expanded ? `Collapse ${props.label}` : `Edit ${props.label}`}
      className={cn(
        "flex items-center gap-2 rounded-full border-2 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.2em] shadow-sm ring-2 ring-inset ring-white/60 transition",
        isTerracotta
          ? "border-terracotta/80 bg-paper/60 text-terracotta hover:border-terracotta hover:bg-terracotta/10"
          : "border-gold bg-paper/60 text-ink hover:border-gold/90 hover:bg-gold/10"
      )}
      onClick={props.onClick}
      type="button"
    >
      {props.expanded ? <ChevronUp className="h-4 w-4 shrink-0" aria-hidden /> : <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />}
      {props.expanded ? "Collapse" : "Edit"}
    </button>
  );
}

function FactPreviewCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-[1.4rem] border border-ink/8 bg-paper/70 p-4">
      <p className="font-mono text-[0.68rem] uppercase tracking-[0.28em] text-olive">{props.label}</p>
      <p className="mt-3 text-sm leading-7 text-ink/72">{props.value}</p>
    </div>
  );
}

function SectionNavigatorDialog(props: {
  sections: Array<{
    id: string;
    title: string;
    summary: string;
    shownOnPage: string;
    status: SectionStatus;
  }>;
  activeSectionId: string;
  onSelect: (sectionId: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end bg-ink/35 px-3 pb-3 pt-10 sm:items-center sm:justify-center">
      <div
        aria-label="Trip sections"
        aria-modal="true"
        className="w-full max-w-xl rounded-[2rem] border border-ink/10 bg-paper p-5 shadow-float"
        role="dialog"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="font-mono text-[0.68rem] uppercase tracking-[0.32em] text-olive">Trip Studio</p>
            <h2 className="mt-2 font-display text-3xl leading-none text-ink">Trip sections</h2>
          </div>
          <button
            className="rounded-full border-2 border-ink/30 px-4 py-2 text-xs uppercase tracking-[0.22em] text-ink"
            onClick={props.onClose}
            type="button"
          >
            Close
          </button>
        </div>
        <div className="mt-5 grid gap-3">
          {props.sections.map((section) => (
            <button
              key={section.id}
              className={cn(
                "rounded-[1.4rem] border px-4 py-4 text-left transition",
                props.activeSectionId === section.id
                  ? "border-olive/25 bg-olive/5"
                  : "border-ink/10 bg-paper hover:border-ink/20"
              )}
              onClick={() => props.onSelect(section.id)}
              type="button"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{section.title}</p>
                  <p className="mt-1 text-sm text-ink/60">{section.summary}</p>
                  <p className="mt-2 text-xs text-ink/52">{section.shownOnPage}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function StudioField(props: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  description?: string;
}) {
  return (
    <label className="grid gap-2 text-sm text-ink/75">
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">{props.label}</span>
      {props.description && <span className="text-xs leading-5 text-ink/55">{props.description}</span>}
      <input
        className="h-12 min-w-0 max-w-full rounded-[1.2rem] border border-ink/10 bg-paper px-4 text-base text-ink outline-none transition focus:border-olive/45"
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
  description?: string;
}) {
  return (
    <label className={`grid gap-2 text-sm text-ink/75 ${props.className ?? ""}`}>
      <span className="font-mono text-[0.68rem] uppercase tracking-[0.24em] text-olive">{props.label}</span>
      {props.description && <span className="text-xs leading-5 text-ink/55">{props.description}</span>}
      <textarea
        className="min-h-28 min-w-0 max-w-full rounded-[1.4rem] border border-ink/10 bg-paper px-4 py-4 text-base leading-7 text-ink outline-none transition focus:border-olive/45"
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

function getCompletionStatus(requiredValues: string[], optionalValues: string[] = []): SectionStatus {
  const allValues = [...requiredValues, ...optionalValues].map((value) => value.trim());
  const filledCount = allValues.filter(Boolean).length;

  if (filledCount === 0) return "empty";
  if (requiredValues.every((value) => value.trim())) return "ready";
  return "in progress";
}

function getCollectionStatus(count: number): SectionStatus {
  return count > 0 ? "ready" : "empty";
}

function getDayStoriesStatus(days: StudioDayDraft[]): SectionStatus {
  if (days.length === 0) return "empty";

  const readyDays = days.filter(
    (day) => Boolean(day.cityLabel.trim() && day.title.trim() && day.summary.trim() && day.highlightMoment.trim() && day.journal.trim())
  );

  if (readyDays.length === days.length) return "ready";

  const touchedDays = days.filter(
    (day) =>
      Boolean(
        day.cityLabel.trim() ||
        day.title.trim() ||
        day.summary.trim() ||
        day.highlightMoment.trim() ||
        day.journal.trim() ||
        day.heroPhotoValue.trim() ||
        day.stops.length > 0
      )
  );

  return touchedDays.length > 0 ? "in progress" : "empty";
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
