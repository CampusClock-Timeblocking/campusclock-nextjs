"use client"

import { AnimatePresence, motion } from "framer-motion"
import React from "react"
import { usePathname } from "next/navigation"

export function RouteWipe() {
  const pathname = usePathname()

  return (
    <AnimatePresence mode="popLayout">
      <motion.div
        key={pathname + "-wipe"}
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 0 }}
        exit={{ scaleX: 1 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none fixed inset-0 z-[999] origin-left bg-black"
      />
      <motion.div
        key={pathname + "-wipe-back"}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: 0.25, delay: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="pointer-events-none fixed inset-0 z-[998] origin-right bg-black"
      />
    </AnimatePresence>
  )
}
