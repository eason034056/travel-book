import { google } from "googleapis";

import type {
  InviteTokenSheetRow,
  TravelSheetWorkbook,
  TripMembershipSheetRow,
  TripPhotoSheetRow,
  TripSheetRow,
  TripStopSheetRow
} from "@/lib/server/travel-sheet-schema";
import { travelSheetHeaders, travelSheetTabs } from "@/lib/server/travel-sheet-schema";
import { getSheetsEnv } from "@/lib/server/env";

type WorkbookKey = keyof TravelSheetWorkbook;

type RowWithNumber<T> = {
  rowNumber: number;
  row: T;
};

function getSheetsClient() {
  const env = getSheetsEnv();
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"]
  });

  return {
    client: google.sheets({
      version: "v4",
      auth
    }),
    spreadsheetId: env.GOOGLE_SHEETS_SPREADSHEET_ID
  };
}

function getRange(table: WorkbookKey) {
  return `${travelSheetTabs[table]}!A:Z`;
}

function getRowRange(table: WorkbookKey, rowNumber: number) {
  const width = travelSheetHeaders[table].length;
  const endColumn = String.fromCharCode("A".charCodeAt(0) + width - 1);
  return `${travelSheetTabs[table]}!A${rowNumber}:${endColumn}${rowNumber}`;
}

function mapRows<T extends object>(
  headers: readonly string[],
  values: string[][]
): Array<RowWithNumber<T>> {
  return values
    .slice(1)
    .map((row, index) => {
      const record = headers.reduce<Record<string, string>>((accumulator, header, headerIndex) => {
        accumulator[header] = row[headerIndex] ?? "";
        return accumulator;
      }, {});

      return {
        rowNumber: index + 2,
        row: record as T
      };
    })
    .filter(({ row }) => Object.values(row as Record<string, string>).some(Boolean));
}

function toValues<T extends object>(headers: readonly string[], rows: T[]) {
  return rows.map((row) => {
    const record = row as Record<string, string>;

    return headers.map((header) => record[header] ?? "");
  });
}

async function readTable<T extends object>(table: WorkbookKey): Promise<Array<RowWithNumber<T>>> {
  const { client, spreadsheetId } = getSheetsClient();
  const response = await client.spreadsheets.values.get({
    spreadsheetId,
    range: getRange(table)
  });

  const values = (response.data.values as string[][] | undefined) ?? [];

  if (values.length === 0) {
    return [];
  }

  return mapRows<T>(travelSheetHeaders[table], values);
}

async function appendTableRows<T extends object>(table: WorkbookKey, rows: T[]) {
  if (rows.length === 0) {
    return;
  }

  const { client, spreadsheetId } = getSheetsClient();
  await client.spreadsheets.values.append({
    spreadsheetId,
    range: `${travelSheetTabs[table]}!A:Z`,
    valueInputOption: "RAW",
    requestBody: {
      values: toValues(travelSheetHeaders[table], rows)
    }
  });
}

async function updateTableRow<T extends object>(table: WorkbookKey, rowNumber: number, row: T) {
  const { client, spreadsheetId } = getSheetsClient();
  const record = row as Record<string, string>;
  await client.spreadsheets.values.update({
    spreadsheetId,
    range: getRowRange(table, rowNumber),
    valueInputOption: "RAW",
    requestBody: {
      values: [travelSheetHeaders[table].map((header) => record[header] ?? "")]
    }
  });
}

export async function ensureTravelSheetStructure() {
  const { client, spreadsheetId } = getSheetsClient();
  const metadata = await client.spreadsheets.get({
    spreadsheetId
  });
  const existingTitles = new Set(metadata.data.sheets?.map((sheet) => sheet.properties?.title).filter(Boolean));
  const requests = Object.values(travelSheetTabs)
    .filter((title) => !existingTitles.has(title))
    .map((title) => ({
      addSheet: {
        properties: {
          title
        }
      }
    }));

  if (requests.length > 0) {
    await client.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: {
        requests
      }
    });
  }

  await Promise.all(
    (Object.keys(travelSheetTabs) as WorkbookKey[]).map(async (table) => {
      const rows = await readTable<Record<string, string>>(table);

      if (rows.length > 0) {
        return;
      }

      await client.spreadsheets.values.update({
        spreadsheetId,
        range: `${travelSheetTabs[table]}!A1:Z1`,
        valueInputOption: "RAW",
        requestBody: {
          values: [Array.from(travelSheetHeaders[table])]
        }
      });
    })
  );
}

export async function readTravelWorkbook(): Promise<TravelSheetWorkbook> {
  const [trips, tripDays, tripStops, tripPhotos, tripMemberships, inviteTokens] = await Promise.all([
    readTable<TripSheetRow>("trips"),
    readTable<TravelSheetWorkbook["tripDays"][number]>("tripDays"),
    readTable<TripStopSheetRow>("tripStops"),
    readTable<TripPhotoSheetRow>("tripPhotos"),
    readTable<TripMembershipSheetRow>("tripMemberships"),
    readTable<InviteTokenSheetRow>("inviteTokens")
  ]);

  return {
    trips: trips.map(({ row }) => row),
    tripDays: tripDays.map(({ row }) => row),
    tripStops: tripStops.map(({ row }) => row),
    tripPhotos: tripPhotos.map(({ row }) => row),
    tripMemberships: tripMemberships.map(({ row }) => row),
    inviteTokens: inviteTokens.map(({ row }) => row)
  };
}

export async function seedTravelWorkbook(workbook: TravelSheetWorkbook) {
  await ensureTravelSheetStructure();
  const existingTrips = await readTable<TripSheetRow>("trips");

  if (existingTrips.length > 0) {
    return {
      seeded: false
    };
  }

  await appendTableRows("trips", workbook.trips);
  await appendTableRows("tripDays", workbook.tripDays);
  await appendTableRows("tripStops", workbook.tripStops);
  await appendTableRows("tripPhotos", workbook.tripPhotos);
  await appendTableRows("tripMemberships", workbook.tripMemberships);

  return {
    seeded: true
  };
}

export async function appendTripStops(rows: TripStopSheetRow[]) {
  await appendTableRows("tripStops", rows);
}

export async function appendTripPhotos(rows: TripPhotoSheetRow[]) {
  await appendTableRows("tripPhotos", rows);
}

export async function appendTripMembership(row: TripMembershipSheetRow) {
  await appendTableRows("tripMemberships", [row]);
}

export async function appendInviteToken(row: InviteTokenSheetRow) {
  await appendTableRows("inviteTokens", [row]);
}

export async function findInviteTokenByHash(tokenHash: string): Promise<RowWithNumber<InviteTokenSheetRow> | undefined> {
  const inviteTokens = await readTable<InviteTokenSheetRow>("inviteTokens");

  return inviteTokens.find(({ row }) => row.token_hash === tokenHash);
}

export async function markInviteTokenUsed(
  inviteId: string,
  options: {
    usedAt: string;
  }
) {
  const inviteTokens = await readTable<InviteTokenSheetRow>("inviteTokens");
  const matchingInvite = inviteTokens.find(({ row }) => row.invite_id === inviteId);

  if (!matchingInvite) {
    return;
  }

  await updateTableRow("inviteTokens", matchingInvite.rowNumber, {
    ...matchingInvite.row,
    status: "used",
    used_at: options.usedAt
  });
}

export async function markInviteTokenExpired(inviteId: string) {
  const inviteTokens = await readTable<InviteTokenSheetRow>("inviteTokens");
  const matchingInvite = inviteTokens.find(({ row }) => row.invite_id === inviteId);

  if (!matchingInvite) {
    return;
  }

  await updateTableRow("inviteTokens", matchingInvite.rowNumber, {
    ...matchingInvite.row,
    status: "expired"
  });
}

export async function findActiveMembership(tripId: string, email: string) {
  const memberships = await readTable<TripMembershipSheetRow>("tripMemberships");

  return memberships.find(
    ({ row }) =>
      row.trip_id === tripId &&
      row.email.toLowerCase() === email.toLowerCase() &&
      row.status === "active"
  )?.row;
}
