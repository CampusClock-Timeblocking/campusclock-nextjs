import { ItemGroup } from "@/components/ui/item";
import type { ReactNode } from "react";
import { RiAddLine, RiAppleFill, RiGoogleFill } from "@remixicon/react";
import { Separator } from "@/components/ui/separator";
import type { Calendar, CalendarAccount } from "@prisma/client";
import { Clock, Trash2 } from "lucide-react";
import { CalendarItem, CalendarItemSkeleton } from "./calendar-item";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { Skeleton } from "@/components/ui/skeleton";
import { GoogleCalendarAccount } from "./google-calendar-account";
import { ICloudCalendarAccount } from "./icloud-calendar-account";
import { CampusClockCalendarAccount } from "./campusclock-calendar-account";

export interface CalendarAccountProps {
  account: CalendarAccount & { calendars: Calendar[] };
}
export function CalendarAccount({ account }: CalendarAccountProps) {
  switch (account.provider) {
    case "google":
      return <GoogleCalendarAccount account={account} />;
    case "iCloud":
      return <ICloudCalendarAccount account={account} />;
    case "campusClock":
      return <CampusClockCalendarAccount account={account} />;
    default:
      return null;
  }
}

interface CalendarLayouProps {
  title: string;
  description: string;
  action: ReactNode | null;
  calendars?: Calendar[];
  menuContent?: (id: string) => ReactNode;
  provider: string;
}

export function CalendarAccountLayout({
  title,
  description,
  action,
  calendars,
  menuContent,
  provider,
}: CalendarLayouProps) {
  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <div
          className="border-border shrink-0 rounded-sm border"
          style={{ padding: 6 }}
        >
          {getPoviderIcon(provider, 30)}
        </div>
        <div className="flex flex-col justify-center">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-muted-foreground text-sm">{description}</p>
        </div>
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <Separator />

      <ItemGroup className="gap-1">
        {calendars?.map((calendar) => (
          <CalendarItem
            key={calendar.id}
            id={calendar.id}
            name={calendar.name}
            backgroundColor={calendar.backgroundColor}
            menuContent={menuContent?.(calendar.id)}
          />
        ))}
      </ItemGroup>
    </div>
  );
}

export function getPoviderIcon(provider: string, size: number) {
  switch (provider) {
    case "google":
      return <RiGoogleFill size={size} />;
    case "iCloud":
      return <RiAppleFill size={size} />;
    default:
      return <Clock size={size} />;
  }
}

interface AddProps {
  onClick: () => void;
  disabled?: boolean;
  className?: string;
}

export function AddCalendarAccount({
  onClick,
  disabled = false,
  className,
}: AddProps) {
  return (
    <Button
      variant="outline"
      className={cn("dark:bg-background h-auto w-full gap-2 p-6", className)}
      onClick={onClick}
      disabled={disabled}
    >
      <RiAddLine size={20} />
      <span>Add Calendar Account</span>
    </Button>
  );
}

interface CalendarAccountSkeletonProps {
  calendarSkeletonCount?: number;
}

export function CalendarAccountSkeleton({
  calendarSkeletonCount = 3,
}: CalendarAccountSkeletonProps) {
  return (
    <div className="border-border space-y-3 rounded-lg border p-4">
      <div className="flex items-center gap-3">
        <Skeleton
          className="shrink-0 rounded-sm"
          style={{ height: 42, width: 42 }}
        />
        <div className="flex h-12 flex-1 flex-col justify-center gap-2">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-48" />
        </div>
        <Skeleton className="ml-auto h-8 w-24" />
      </div>
      <Separator />

      <ItemGroup className="gap-1">
        {Array.from({ length: calendarSkeletonCount }).map((_, index) => (
          <CalendarItemSkeleton key={index} />
        ))}
      </ItemGroup>
    </div>
  );
}

export function AddCalendarAccountSkeleton() {
  return (
    <div className="border-border dark:bg-background flex h-auto w-full items-center justify-center gap-2 rounded-lg border p-6">
      <Skeleton className="h-5 w-5 rounded-md" />
      <Skeleton className="h-5 w-40" />
    </div>
  );
}
