import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, test } from "vitest";

import { loadAppEnv, resetLoadedAppEnv } from "@/lib/server/load-app-env";

let tempDir: string | null = null;

afterEach(() => {
  delete process.env.SEED_OWNER_EMAIL;
  resetLoadedAppEnv();

  if (tempDir) {
    fs.rmSync(tempDir, { recursive: true, force: true });
    tempDir = null;
  }
});

describe("loadAppEnv", () => {
  test("loads .env.local variables for standalone scripts", () => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "travel-env-"));
    fs.writeFileSync(path.join(tempDir, ".env.local"), "SEED_OWNER_EMAIL=owner@example.com\n", "utf8");

    loadAppEnv(tempDir);

    expect(process.env.SEED_OWNER_EMAIL).toBe("owner@example.com");
  });
});
