import fs from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

let loadedProjectDir: string | null = null;
const previousValues = new Map<string, string | undefined>();
const loadedKeys = new Set<string>();

function applyEnvFile(projectDir: string, filename: string) {
  const filePath = path.join(projectDir, filename);

  if (!fs.existsSync(filePath)) {
    return;
  }

  const parsed = parseEnv(fs.readFileSync(filePath, "utf8"));

  for (const [key, value] of Object.entries(parsed)) {
    if (!previousValues.has(key)) {
      previousValues.set(key, process.env[key]);
    }

    if (process.env[key] === undefined || loadedKeys.has(key)) {
      process.env[key] = value;
      loadedKeys.add(key);
    }
  }
}

export function loadAppEnv(projectDir = process.cwd()) {
  if (loadedProjectDir === projectDir) {
    return;
  }

  if (loadedProjectDir && loadedProjectDir !== projectDir) {
    resetLoadedAppEnv();
  }

  applyEnvFile(projectDir, ".env");
  applyEnvFile(projectDir, ".env.local");
  loadedProjectDir = projectDir;
}

export function resetLoadedAppEnv() {
  for (const [key, value] of previousValues.entries()) {
    if (value === undefined) {
      delete process.env[key];
      continue;
    }

    process.env[key] = value;
  }

  previousValues.clear();
  loadedKeys.clear();
  loadedProjectDir = null;
}
