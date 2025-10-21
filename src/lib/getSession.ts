import { auth } from "@/server/lib/auth"
import { headers } from "next/headers"

/**
 * Server Helper — holt aktuelle Session aus Better Auth.
 * Funktioniert in API Routes, Server Components und Actions.
 */
export async function getSession() {
  try {
    const session = await auth.api.getSession({
      headers: await headers(), // ⬅️ await added to resolve the promise
    })
    return session
  } catch (error) {
    console.error("❌ getSession error:", error)
    return null
  }
}
