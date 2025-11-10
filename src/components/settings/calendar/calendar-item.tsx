import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { RiMore2Line } from "@remixicon/react";
import { useState, type ReactNode } from "react";

interface Props {
  id: string;
  name: string;
  backgroundColor?: string;
  providerIcon?: ReactNode;
  menuContent?: ReactNode;
}

export function CalendarItem({
  id,
  name,
  backgroundColor,
  providerIcon,
  menuContent,
}: Props) {
  const [open, setOpen] = useState(false);
  return (
    <Item
      variant="default"
      className={cn(
        "hover:bg-accent cursor-default px-1.5 py-0",
        open && "bg-accent",
      )}
    >
      <ItemMedia>
        <div
          className="h-4 w-4 rounded-full border-2"
          style={{
            backgroundColor: backgroundColor ?? "#3b82f6",
            borderColor: backgroundColor ?? "#3b82f6",
          }}
        />
      </ItemMedia>
      <ItemContent>
        <ItemTitle>
          {name}
          {providerIcon}
        </ItemTitle>
      </ItemContent>
      {menuContent && (
        <ItemActions>
          <DropdownMenu open={open} onOpenChange={setOpen}>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "hover:bg-accent-nested dark:hover:bg-accent-nested/50 h-8 w-8 p-0 hover:cursor-pointer",
                  open && "bg-accent-nested/50",
                )}
              >
                <RiMore2Line className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            {menuContent}
          </DropdownMenu>
        </ItemActions>
      )}
    </Item>
  );
}

export function CalendarItemSkeleton() {
  return (
    <Item variant="default" className="cursor-default px-1.5 py-0">
      <ItemMedia>
        <Skeleton className="h-4 w-4 rounded-full" />
      </ItemMedia>
      <ItemContent>
        <Skeleton className="h-4 w-full max-w-[200px]" />
      </ItemContent>
      <ItemActions>
        <Skeleton className="h-8 w-8 rounded-md" />
      </ItemActions>
    </Item>
  );
}
