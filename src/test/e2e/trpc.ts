import type { PrismaClient } from "@prisma/client";

type RootModule = typeof import("@/server/api/root");

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
