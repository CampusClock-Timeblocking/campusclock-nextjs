import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";
import { getTestDatabaseUrl, shouldRunE2EMigrations } from "./env";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../../..");

let prisma: PrismaClient | null = null;
let migrationsApplied = false;

function getNpxCommand(): string {
  return process.platform === "win32" ? "npx.cmd" : "npx";
}

async function truncatePublicTables(client: PrismaClient): Promise<void> {
  const tables = await client.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename <> '_prisma_migrations'
  `;

  if (tables.length === 0) {
    return;
  }

  const qualifiedNames = tables
    .map(({ tablename }) => `"public"."${tablename}"`)
    .join(", ");

  await client.$executeRawUnsafe(
    `TRUNCATE TABLE ${qualifiedNames} RESTART IDENTITY CASCADE`,
  );
}

export async function getE2EPrisma(): Promise<PrismaClient> {
  if (prisma) {
    return prisma;
  }

  prisma = new PrismaClient({
    datasources: {
      db: {
        url: getTestDatabaseUrl(),
      },
    },
  });

  return prisma;
}

export async function runE2EMigrations(): Promise<void> {
  if (migrationsApplied) {
    return;
  }

  if (!shouldRunE2EMigrations()) {
    migrationsApplied = true;
    return;
  }

  const databaseUrl = getTestDatabaseUrl();

  try {
    execFileSync(
      getNpxCommand(),
      ["prisma", "migrate", "deploy"],
      {
        cwd: repoRoot,
        env: {
          ...process.env,
          DATABASE_URL: databaseUrl,
        },
        stdio: "inherit",
      },
    );
  } catch (error) {
    throw new Error(
      `Failed to apply Prisma migrations to TEST_DATABASE_URL (${databaseUrl}). Ensure the dedicated Postgres test database exists and is reachable.`,
      {
        cause: error,
      },
    );
  }

  migrationsApplied = true;
}

export async function resetE2EDatabase(): Promise<void> {
  const client = await getE2EPrisma();
  await truncatePublicTables(client);
}

export async function disconnectE2EPrisma(): Promise<void> {
  if (!prisma) {
    return;
  }

  await prisma.$disconnect();
  prisma = null;
}
