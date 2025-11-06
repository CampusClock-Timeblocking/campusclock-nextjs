// app/auth/[path]/page.tsx
import type { Metadata } from "next"
import { authViewPaths } from "@daveyplate/better-auth-ui/server"
import AuthShell from "@/components/AuthShell" // Client-Komponente

export const dynamicParams = false

export function generateStaticParams() {
  return Object.values(authViewPaths).map((path) => ({ path }))
}

export const metadata: Metadata = {
  title: "Log in • CampusClock",
  description: "Sign in to your CampusClock account",
}

export default async function Page({ params }: { params: Promise<{ path: string }> }) {
  const { path } = await params;
  return <AuthShell path={path} />
}
