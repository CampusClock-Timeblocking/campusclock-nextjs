/**
 * Centralized priority mapping and utilities
 * 
 * The UI uses 1-5 (Critical, High, Medium, Low, Lowest).
 */

export type PriorityValue = 1 | 2 | 3 | 4 | 5;

export interface PriorityConfig {
    value: PriorityValue;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    selectBgColor: string; // Background color for select items
}

/**
 * Priority configuration mapping (1-5)
 * Colors: red/orange for high priority, blue/gray for low priority
 */
export const PRIORITY_CONFIG: Record<PriorityValue, PriorityConfig> = {
    5: {
        value: 5,
        label: "Critical",
        color: "text-red-700 dark:text-red-400",
        bgColor: "bg-red-100 dark:bg-red-950",
        borderColor: "border-red-300 dark:border-red-800",
        selectBgColor: "bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-950/50",
    },
    4: {
        value: 4,
        label: "High",
        color: "text-orange-600 dark:text-orange-500",
        bgColor: "bg-orange-50 dark:bg-orange-950/50",
        borderColor: "border-orange-200 dark:border-orange-800",
        selectBgColor: "bg-orange-50 dark:bg-orange-950/20 hover:bg-orange-100 dark:hover:bg-orange-950/50",
    },
    3: {
        value: 3,
        label: "Medium",
        color: "text-yellow-600 dark:text-yellow-400",
        bgColor: "bg-yellow-50 dark:bg-yellow-950/50",
        borderColor: "border-yellow-200 dark:border-yellow-800",
        selectBgColor: "bg-yellow-50 dark:bg-yellow-950/20 hover:bg-yellow-100 dark:hover:bg-yellow-950/50",
    },
    2: {
        value: 2,
        label: "Low",
        color: "text-blue-600 dark:text-blue-400",
        bgColor: "bg-blue-50 dark:bg-blue-950/50",
        borderColor: "border-blue-200 dark:border-blue-800",
        selectBgColor: "bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/50",
    },
    1: {
        value: 1,
        label: "Lowest",
        color: "text-gray-600 dark:text-gray-400",
        bgColor: "bg-gray-50 dark:bg-gray-950/50",
        borderColor: "border-gray-200 dark:border-gray-800",
        selectBgColor: "bg-gray-50 dark:bg-gray-950/30 hover:bg-gray-100 dark:hover:bg-gray-950/50",
    },
};

/**
 * Get priority configuration for a given priority value
 * Maps values 6-10 to the 1-5 range
 */
export function getPriorityConfig(
    priority: number | null | undefined,
): PriorityConfig | null {
    if (priority === null || priority === undefined) {
        return null;
    }

    // Clamp to valid range and map 6-10 to 1-5
    const clampedPriority = Math.max(1, Math.min(10, Math.round(priority)));
    const mappedPriority = clampedPriority > 5 ? 5 : clampedPriority as PriorityValue;
    return PRIORITY_CONFIG[mappedPriority];
}

/**
 * Priority options for select dropdowns, ordered from high to low
 * Uses the 1-5 range
 */
export const PRIORITY_OPTIONS: PriorityConfig[] = [
    PRIORITY_CONFIG[5], // Critical
    PRIORITY_CONFIG[4], // High
    PRIORITY_CONFIG[3], // Medium
    PRIORITY_CONFIG[2], // Low
    PRIORITY_CONFIG[1], // Lowest
];

/**
 * Get priority label for display
 */
export function getPriorityLabel(priority: number | null | undefined): string {
    const config = getPriorityConfig(priority);
    return config?.label ?? "-";
}

