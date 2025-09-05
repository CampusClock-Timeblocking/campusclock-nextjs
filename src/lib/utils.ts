import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseDuration = (value: string): number | null => {
  const trimmed = value.trim().toLowerCase();

  // Handle formats like "1h35m" or "1h 35m"
  const combinedMatch = /^(\d+)h\s*(\d+)m$/.exec(trimmed);
  if (combinedMatch) {
    const hours = parseInt(combinedMatch[1] ?? "");
    const minutes = parseInt(combinedMatch[2] ?? "");
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  }

  if (trimmed.endsWith("m")) {
    const minutes = parseInt(trimmed.slice(0, -1));
    return isNaN(minutes) ? null : minutes;
  }

  if (trimmed.endsWith("h")) {
    const timeStr = trimmed.slice(0, -1);
    if (timeStr.includes(":")) {
      const [hours = "", minutes = ""] = timeStr.split(":");
      const h = parseInt(hours);
      const m = parseInt(minutes);
      if (isNaN(h) || isNaN(m)) return null;
      return h * 60 + m;
    } else {
      const hours = parseInt(timeStr);
      return isNaN(hours) ? null : hours * 60;
    }
  }

  const minutes = parseInt(trimmed);
  return isNaN(minutes) ? null : minutes;
};

export function formatDuration(duration: number) {
  if (!duration) return "-";

  const hours = Math.floor(duration / 60);
  const minutes = duration % 60;

  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

export function seededRandom(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
