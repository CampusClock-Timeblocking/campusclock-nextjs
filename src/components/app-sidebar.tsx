"use client";

import * as React from "react";
import Link from "next/link";
import { RiCalendarView, RiCheckLine, RiTodoLine } from "@remixicon/react";
import { useCalendarContext } from "@/components/event-calendar/calendar-context";
import type { CalendarWithEventsAndAccount } from "@/server/api/services/calendar-service";
import { getPoviderIcon } from "@/components/settings/calendar/calendar-account";
import { ChevronRight } from "lucide-react";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import {
  Collapsible,
  CollapsibleTrigger,
  CollapsibleContent,
} from "@/components/ui/collapsible";
import SidebarCalendar from "@/components/sidebar-calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { usePathname } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { calendars, isCalendarVisible, toggleCalendarVisibility } =
    useCalendarContext();
  const pathName = usePathname();

  // Group calendars by account
  const calendarsByAccount = React.useMemo(() => {
    if (!calendars) return new Map<string, CalendarWithEventsAndAccount[]>();

    const grouped = new Map<string, CalendarWithEventsAndAccount[]>();
    calendars.forEach((calendar) => {
      const accountId = calendar.calendarAccount.id;
      if (!grouped.has(accountId)) {
        grouped.set(accountId, []);
      }
      grouped.get(accountId)!.push(calendar);
    });

    return grouped;
  }, [calendars]);

  const isInCalendar = pathName.includes("/dashboard");
  return (
    <Sidebar
      variant="inset"
      {...props}
      className="dark scheme-only-dark max-lg:p-3 lg:pe-1"
    >
      <SidebarHeader>
        <div className="flex items-center justify-center gap-2">
          <Link className="inline-flex" href="/dashboard">
            <span className="text-xl font-extrabold">CampusClock</span>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="scrollbar-hide gap-0 border-t">
        <SidebarGroup className="border-b px-1 pt-4">
          <SidebarGroupLabel className="text-muted-foreground/65 uppercase">
            Navigation
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative rounded-md has-focus-visible:ring-[3px]"
                >
                  <Link href="/dashboard">
                    <RiCalendarView className="size-4" />
                    Calendar
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  className="has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative rounded-md has-focus-visible:ring-[3px]"
                >
                  <Link href="/activities">
                    <RiTodoLine className="size-4" />
                    Activities
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <SidebarCalendar />
        {isInCalendar && (
          <>
            <SidebarGroup className="mt-3 border-t px-1 pt-4">
              <SidebarGroupLabel className="text-muted-foreground/65 uppercase">
                Calendars
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {Array.from(calendarsByAccount.entries())
                    .sort(([, calendarsA], [, calendarsB]) => {
                      const accountA = calendarsA[0]?.calendarAccount;
                      const accountB = calendarsB[0]?.calendarAccount;

                      // CampusClock account always on top
                      if (accountA?.provider === "campusClock") return -1;
                      if (accountB?.provider === "campusClock") return 1;

                      return 0;
                    })
                    .map(([accountId, accountCalendars]) => {
                      const account = accountCalendars[0]?.calendarAccount;
                      if (!account) return null;

                      return (
                        <Collapsible
                          key={accountId}
                          defaultOpen={true}
                          className="group/collapsible"
                        >
                          <SidebarMenuItem>
                            <CollapsibleTrigger asChild>
                              <SidebarMenuButton className="text-muted-foreground text-xs">
                                <span className="flex items-center gap-2">
                                  {getPoviderIcon(account.provider, 16)}
                                  <span className="truncate">
                                    {account.email ??
                                      account.name ??
                                      account.provider}
                                  </span>
                                </span>
                                <ChevronRight className="ml-auto size-3 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                              </SidebarMenuButton>
                            </CollapsibleTrigger>
                            <CollapsibleContent>
                              <SidebarMenuSub>
                                {accountCalendars.map((item) => (
                                  <SidebarMenuSubItem key={item.id}>
                                    <SidebarMenuSubButton
                                      asChild
                                      className="has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative w-full has-focus-visible:ring-[3px]"
                                    >
                                      <span className="flex items-center gap-2 font-medium">
                                        <Checkbox
                                          id={item.id}
                                          className="peer sr-only"
                                          checked={isCalendarVisible(item.id)}
                                          onCheckedChange={() =>
                                            toggleCalendarVisibility(item.id)
                                          }
                                        />
                                        {/* <RiCheckLine
                                            className="peer-not-data-[state=checked]:invisible"
                                            size={16}
                                            aria-hidden="true"
                                          /> */}
                                        <span
                                          className="size-1.5 rounded-full bg-(--event-color)"
                                          style={
                                            {
                                              "--event-color": `${item.backgroundColor}`,
                                            } as React.CSSProperties
                                          }
                                        ></span>
                                        <label
                                          htmlFor={item.id}
                                          className="peer-not-data-[state=checked]:text-muted-foreground/65 truncate text-sm peer-not-data-[state=checked]:line-through after:absolute after:inset-0"
                                        >
                                          {item.name}
                                        </label>
                                      </span>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                ))}
                              </SidebarMenuSub>
                            </CollapsibleContent>
                          </SidebarMenuItem>
                        </Collapsible>
                      );
                    })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        )}
      </SidebarContent>
      <SidebarFooter>
        <NavUser />
      </SidebarFooter>
    </Sidebar>
  );
}
