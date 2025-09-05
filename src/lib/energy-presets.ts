import type { energyProfiles } from "@/lib/zod";

type EnergyProfile = (typeof energyProfiles)[number];

export const energyPresets: Record<EnergyProfile, number[]> = {
  EARLY_BIRD: [
    0.2, 0.2, 0.25, 0.3, 0.45, 0.65, 0.85, 0.95, 0.9, 0.8, 0.7, 0.65, 0.6, 0.55,
    0.5, 0.5, 0.55, 0.6, 0.55, 0.45, 0.35, 0.3, 0.25, 0.22,
  ],
  BALANCED: new Array(24)
    .fill(0)
    .map((_, h) => (h >= 9 && h <= 17 ? 0.75 : 0.55)),
  NIGHT_OWL: [
    0.2, 0.2, 0.2, 0.22, 0.25, 0.3, 0.35, 0.45, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8,
    0.85, 0.9, 0.95, 0.95, 0.9, 0.8, 0.65, 0.5, 0.35, 0.25,
  ],
};
