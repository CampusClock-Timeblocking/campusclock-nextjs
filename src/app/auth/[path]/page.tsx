// app/auth/[path]/page.tsx
import type { Metadata } from "next";
import { authViewPaths } from "@daveyplate/better-auth-ui/server";
import AuthShell from "@/components/AuthShell"; // Client-Komponente
import { auth } from "@/server/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export const dynamicParams = false;

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }));
}

export const metadata: Metadata = {
  title: "Log in • CampusClock",
  description: "Sign in to your CampusClock account",
};

export default async function Page({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const [{ path }, session] = await Promise.all([
    params,
    auth.api.getSession({ headers: await headers() }),
  ]);
  if (session && path !== "sign-out") redirect("/dashboard");
  return <AuthShell path={path} />;
}
