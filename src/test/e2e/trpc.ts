import type { PrismaClient } from "@prisma/client";

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type RootModule = Awaited<typeof import("@/server/api/root")>;

export async function createAuthenticatedCaller(
  db: PrismaClient,
  userId: string,
) {
  const rootModule: RootModule = await import("@/server/api/root");
  const context = {
    db,
    session: {
      user: {
        id: userId,
      },
    },
    headers: new Headers(),
  } as Parameters<RootModule["createCaller"]>[0];

  return rootModule.createCaller(context);
}
