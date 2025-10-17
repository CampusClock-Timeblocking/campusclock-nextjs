"use client"

import { forwardRef } from "react"
import Image from "next/image"
import type { ImageProps } from "next/image"
import { motion } from "framer-motion"

export const MotionImage = motion(
  forwardRef<HTMLImageElement, ImageProps>(function MImg(props, ref) {
    // next/image rendert ein <img> innerhalb – ref passt
    // @ts-expect-error: Framer übernimmt das DOM-Element
    return <Image ref={ref} alt={props.alt || ""} {...props} />
  })
)
