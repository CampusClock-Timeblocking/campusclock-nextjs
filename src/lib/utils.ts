import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const parseDuration = (value: string): number | null => {
  const trimmed = value.trim().toLowerCase();

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
