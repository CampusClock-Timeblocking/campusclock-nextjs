import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SectionHeaderProps {
  title: string;
  description?: string;
  action?: ReactNode;
  variant?: "section" | "subsection";
  className?: string;
}

export function SectionHeader({
  title,
  description,
  action,
  variant = "section",
  className,
}: SectionHeaderProps) {
  const isSection = variant === "section";

  return (
    <div className={cn("mb-6 flex items-center justify-between", className)}>
      <div className="space-y-2">
        {isSection ? (
          <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        ) : (
          <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        )}
        {description && (
          <p className="text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </div>
  );
}
