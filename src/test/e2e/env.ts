const DEFAULT_TEST_DATABASE_URL =
  "postgresql://postgres:postgres@127.0.0.1:5432/campusclock_test";

export function installE2ETestEnv(): void {
  const fallbackDatabaseUrl =
    process.env.TEST_DATABASE_URL ?? DEFAULT_TEST_DATABASE_URL;

  const env = process.env as Record<string, string | undefined>;

  env.NODE_ENV ??= "test";
  env.DATABASE_URL ??= fallbackDatabaseUrl;
  env.BETTER_AUTH_SECRET ??= "test-secret-0123456789abcdef0123456789";
  env.BETTER_AUTH_URL ??= "http://localhost:3000";
  env.GOOGLE_CLIENT_ID ??= "test-google-client-id";
  env.GOOGLE_CLIENT_SECRET ??= "test-google-client-secret";
  env.GOOGLE_CALENDAR_CLIENT_ID ??= "test-google-calendar-client-id";
  env.GOOGLE_CALENDAR_CLIENT_SECRET ??=
    "test-google-calendar-client-secret";
  env.KV_URL ??= "redis://localhost:6379";
  env.KV_REST_API_URL ??= "https://example.com";
  env.KV_REST_API_TOKEN ??= "test-kv-rest-token";
  env.KV_REST_API_READ_ONLY_TOKEN ??= "test-kv-read-only-token";
  env.REDIS_URL ??= "redis://localhost:6379";
}

export function getTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is required for scheduler e2e tests. Point it at a dedicated Postgres database before running the suite.",
    );
  }
  return url;
}

export function shouldRunE2EMigrations(): boolean {
  return process.env.E2E_RUN_MIGRATIONS === "1";
}
