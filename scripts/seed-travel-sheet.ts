import { ZodError } from "zod";

import { loadAppEnv } from "../src/lib/server/load-app-env";
import { seedTravelSheetFromMockData } from "../src/lib/server/travel-service";

async function main() {
  loadAppEnv();

  const ownerEmail = process.env.SEED_OWNER_EMAIL;

  if (!ownerEmail) {
    throw new Error("SEED_OWNER_EMAIL is required to seed the travel spreadsheet.");
  }

  const result = await seedTravelSheetFromMockData(ownerEmail);

  if (!result.seeded) {
    console.log("Spreadsheet already contains trip rows. Skipping seed.");
    return;
  }

  console.log(`Seeded spreadsheet with mock trips for ${ownerEmail}.`);
}

main().catch((error) => {
  if (error instanceof ZodError) {
    console.error(`Missing or invalid environment variables: ${error.issues.map((issue) => issue.path.join(".")).join(", ")}`);
    process.exit(1);
  }

  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
