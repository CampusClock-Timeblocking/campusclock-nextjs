import { Badge } from "@/components/ui/badge";
import { getPriorityConfig } from "@/lib/priority";
import { cn } from "@/lib/utils";

export function PriorityBadge({ priority }: { priority: number | null }) {
  const config = getPriorityConfig(priority);
  
  if (!config) {
    return <div className="text-sm">-</div>;
  }

  return (
    <Badge
      variant="outline"
      className={cn(
        "rounded-full px-2 py-0.5 border",
        config.bgColor,
        config.color,
        config.borderColor
      )}
    >
      {config.label}
    </Badge>
  );
}
