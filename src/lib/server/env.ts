import { z } from "zod";

const authEnvSchema = z.object({
  AUTH_SECRET: z.string().min(1),
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  APP_URL: z.string().url()
});

const sheetsEnvSchema = z.object({
  GOOGLE_SHEETS_SPREADSHEET_ID: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().min(1),
  GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: z.string().min(1)
});

const r2EnvSchema = z.object({
  R2_ACCOUNT_ID: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_ENDPOINT: z.string().url().optional()
});

function normalizePrivateKey(value: string) {
  return value.replace(/\\n/g, "\n");
}

export function hasAuthEnv() {
  return authEnvSchema.safeParse(process.env).success;
}

export function hasSheetsEnv() {
  return sheetsEnvSchema.safeParse(process.env).success;
}

export function hasR2Env() {
  return r2EnvSchema.safeParse(process.env).success;
}

export function getAuthEnv() {
  return authEnvSchema.parse(process.env);
}

export function getSheetsEnv() {
  const parsed = sheetsEnvSchema.parse(process.env);

  return {
    ...parsed,
    GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY: normalizePrivateKey(parsed.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY)
  };
}

export function getR2Env() {
  const parsed = r2EnvSchema.parse(process.env);

  return {
    ...parsed,
    R2_ENDPOINT: parsed.R2_ENDPOINT ?? `https://${parsed.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
  };
}
