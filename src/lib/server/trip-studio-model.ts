import type { TripDaySheetRow } from "@/lib/server/travel-sheet-schema";

interface BuildTripIdOptions {
  title: string;
  startDate: string;
  existingTripIds: string[];
}

interface BuildDateDrivenDayRowsOptions {
  tripId: string;
  startDate: string;
  endDate: string;
}

interface PlanTripDayRangeOptions extends BuildDateDrivenDayRowsOptions {
  existingDays: TripDaySheetRow[];
}

export function buildTripId({ title, startDate, existingTripIds }: BuildTripIdOptions) {
  const baseId = `${slugifyTitle(title)}-${startDate}`;

  if (!existingTripIds.includes(baseId)) {
    return baseId;
  }

  let suffix = 2;
  let candidate = `${baseId}-${suffix}`;

  while (existingTripIds.includes(candidate)) {
    suffix += 1;
    candidate = `${baseId}-${suffix}`;
  }

  return candidate;
}

export function buildDateDrivenDayRows({ tripId, startDate, endDate }: BuildDateDrivenDayRowsOptions) {
  return enumerateTripDates(startDate, endDate).map((date, index) => buildBlankTripDayRow({
    date,
    dayIndex: index + 1,
    tripId
  }));
}

export function planTripDayRange({ tripId, startDate, endDate, existingDays }: PlanTripDayRangeOptions) {
  const targetDates = enumerateTripDates(startDate, endDate);
  const existingDaysByDate = new Map(existingDays.map((day) => [day.date, day]));
  const targetDateSet = new Set(targetDates);

  return {
    days: targetDates.map((date, index) => {
      const preservedDay = existingDaysByDate.get(date);

      if (preservedDay) {
        return {
          ...preservedDay,
          day_index: String(index + 1),
          trip_id: tripId
        };
      }

      return buildBlankTripDayRow({
        date,
        dayIndex: index + 1,
        tripId
      });
    }),
    removedDayIds: existingDays.filter((day) => !targetDateSet.has(day.date)).map((day) => day.day_id)
  };
}

export function buildTripDayId(tripId: string, date: string) {
  return `${tripId}-day-${date}`;
}

function buildBlankTripDayRow(options: { tripId: string; date: string; dayIndex: number }): TripDaySheetRow {
  return {
    city_label: "",
    date: options.date,
    day_id: buildTripDayId(options.tripId, options.date),
    day_index: String(options.dayIndex),
    hero_photo_url: "",
    highlight_moment: "",
    journal: "",
    summary: "",
    title: "",
    trip_id: options.tripId
  };
}

function enumerateTripDates(startDate: string, endDate: string) {
  const dates: string[] = [];
  const cursor = new Date(`${startDate}T00:00:00.000Z`);
  const finalDate = new Date(`${endDate}T00:00:00.000Z`);

  while (cursor <= finalDate) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

function slugifyTitle(title: string) {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "trip";
}
