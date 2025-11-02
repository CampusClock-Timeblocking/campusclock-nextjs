import { Badge } from "@/components/ui/badge";

export function PriorityBadge({ priority }: { priority: number | null }) {
  return priority ? (
    <Badge variant="secondary" className="rounded-full px-1.5">
      {priority}
    </Badge>
  ) : (
    <div className="text-sm">-</div>
  );
}
