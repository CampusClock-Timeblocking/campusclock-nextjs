import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import type { LucideIcon } from "lucide-react";
import { Badge } from "../ui/badge";
import type { TabAction } from "./page-layout";

export interface TabOption {
  label: string;
  icon?: LucideIcon;
  /**Null indicates loading */
  badge?: string | number | null;
  action?: TabAction;
}

interface Props {
  tabs: TabOption[];
  active: string;
  setActive: (active: TabOption) => void;
  className?: string;
}

export function TabsRow({ tabs, active, setActive, className }: Props) {
  return (
    <div className={cn("flex gap-0.5", className)}>
      {tabs.map((tab, index) => (
        <div
          key={`tab-${index}`}
          className={tab.label === active ? "" : "text-muted-foreground"}
        >
          <Button
            variant="ghost"
            size="sm"
            className="group mb-1"
            onClick={() => setActive(tab)}
          >
            {tab.icon && <tab.icon />}
            {tab.label}
            {tab.badge !== undefined &&
              (tab.badge === null ? (
                <Badge
                  variant="secondary"
                  className="group-hover:bg-accent-nested h-5 min-w-5 animate-pulse rounded-full px-1 transition-all"
                ></Badge>
              ) : (
                <Badge
                  className="group-hover:bg-accent-nested h-5 min-w-5 rounded-full px-1 font-mono tabular-nums transition-all"
                  variant="secondary"
                >
                  {tab.badge}
                </Badge>
              ))}
          </Button>
          <div
            className={
              tab.label === active ? "mx-1 border-b-[3px] border-blue-500" : ""
            }
          ></div>
        </div>
      ))}
    </div>
  );
}

interface SkeletonProps {
  tabs: TabOption[];
}

export function TabsRowSkeleton({ tabs }: SkeletonProps) {
  return (
    <div className={"flex gap-0.5"}>
      {tabs.map((tab, index) => (
        <div key={`tab-${index}`} className="text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            className="mb-1 animate-pulse"
            disabled
          >
            {tab.icon && <tab.icon />}
            {tab.label}
          </Button>
          <div
            className={index === 0 ? "border-accent mx-1 border-b-[3px]" : ""}
          ></div>
        </div>
      ))}
    </div>
  );
}
