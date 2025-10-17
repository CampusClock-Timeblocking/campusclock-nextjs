// src/lib/analytics.ts
export function event(name: string, props?: Record<string, unknown>) {
  // hier später PostHog/Umami einhängen
  if (process.env.NODE_ENV !== "production") console.log("[event]", name, props)
}
