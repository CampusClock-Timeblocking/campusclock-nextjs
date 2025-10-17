"use client"

/** Programmatic navigation mit native View Transitions */
export function navigateWithViewTransition(href: string, push: (href: string) => void) {
  // Server-side guard
  if (typeof window === "undefined") {
    push(href)
    return
  }

  const doc = document as unknown as { startViewTransition?: (cb: () => unknown) => ViewTransitionResult }
  if (typeof doc.startViewTransition === "function" && isStartViewTransitionSupported(document)) {
    try {
      // startViewTransition executes the provided callback during the transition.
      // Call push inside the callback so it only runs once and during the transition.
      doc.startViewTransition(() => push(href))
      return
    } catch (e) {
      // Fall through to normal navigation on error
      console.warn("startViewTransition failed, falling back to push:", e)
    }
  }

  // Fallback: normal navigation
  push(href)
}

/** Beliebigen Async-Block (z.B. fetch + push) als Transition laufen lassen */
export async function runWithViewTransition<T>(fn: () => Promise<T> | T): Promise<T> {
  // Server-side guard
  if (typeof window === "undefined") {
    return await fn()
  }

  const doc = document as unknown as { startViewTransition?: (cb: () => unknown) => ViewTransitionResult }
  // If startViewTransition is not available, just run the function normally
  if (typeof doc.startViewTransition !== "function") {
    return await fn()
  }

  // Capture result produced by the callback; startViewTransition may accept
  // a synchronous or async callback and returns an object with a `finished` Promise.
  let result: T | undefined
  try {
    const vt = doc.startViewTransition(() => {
      try {
        const maybe = fn()
        // If it's a promise, propagate its resolution to `result`
        if (maybe && typeof (maybe as unknown as Promise<T>).then === "function") {
          ;(maybe as Promise<T>).then((r) => {
            result = r
          }).catch(() => {
            // swallow - we'll re-run fn below on errors
          })
          return maybe
        }
        result = maybe as T
        return maybe
      } catch (err) {
        // If the callback throws synchronously, rethrow to be handled below
        throw err
      }
    })

    if (vt?.finished && typeof vt.finished.then === "function") {
      await vt.finished
    }

    // If result is still undefined but fn returned a promise that resolved
    // after the transition, it will have been set above. If not, call fn()
    // as fallback to obtain a result (this covers odd implementations).
    if (typeof result === "undefined") {
      return await fn()
    }

    return result as T
  } catch (e) {
    // On any error, fallback to running the function normally so caller still gets result or exception
    console.warn("runWithViewTransition failed, running fallback:", e)
    return await fn()
  }
}

/**
 * Feature-detection helper for startViewTransition.
 * Keep the check conservative to avoid triggering behavior in unsupported environments.
 */
function isStartViewTransitionSupported(doc: Document | { startViewTransition?: unknown }): boolean {
  try {
    if (!doc) return false
    const fn = (doc as unknown as { startViewTransition?: unknown }).startViewTransition
    if (typeof fn !== "function") return false

    // Conservative detection: check the function exists and (optionally) that calling it
    // returns an object with a `finished` Promise-like property would be ideal but
    // calling it could have side-effects. Many environments (current browsers)
    // expose the function; accept that as sufficient.
    return true
  } catch {
    return false
  }
}

interface ViewTransitionResult {
  finished?: { then: (onfulfilled?: () => void) => void }
}
