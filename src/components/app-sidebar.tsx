"use client";

import * as React from "react";
import Link from "next/link";
import { RiCalendarView, RiCheckLine, RiTodoLine } from "@remixicon/react";
import { useCalendarContext } from "@/components/event-calendar/calendar-context";

import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import SidebarCalendar from "@/components/sidebar-calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { usePathname } from "next/navigation";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { calendars, isCalendarVisible, toggleCalendarVisibility } =
    useCalendarContext();
  const pathName = usePathname();

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
      <SidebarContent className="mt-3 gap-0 border-t pt-3">
        <SidebarGroup className="px-1">
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
        <SidebarGroup className="px-1">
          <SidebarCalendar />
        </SidebarGroup>
        {isInCalendar && (
          <>
            <SidebarGroup className="mt-3 border-t px-1 pt-4">
              <SidebarGroupLabel className="text-muted-foreground/65 uppercase">
                Calendars
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {calendars?.map((item) => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        className="has-focus-visible:border-ring has-focus-visible:ring-ring/50 relative justify-between rounded-md has-focus-visible:ring-[3px] [&>svg]:size-auto"
                      >
                        <span>
                          <span className="flex items-center justify-between gap-3 font-medium">
                            <Checkbox
                              id={item.id}
                              className="peer sr-only"
                              checked={isCalendarVisible(item.id)}
                              onCheckedChange={() =>
                                toggleCalendarVisibility(item.id)
                              }
                            />
                            <RiCheckLine
                              className="peer-not-data-[state=checked]:invisible"
                              size={16}
                              aria-hidden="true"
                            />
                            <label
                              htmlFor={item.id}
                              className="peer-not-data-[state=checked]:text-muted-foreground/65 peer-not-data-[state=checked]:line-through after:absolute after:inset-0"
                            >
                              {item.name}
                            </label>
                          </span>
                          <span
                            className="size-1.5 rounded-full bg-(--event-color)"
                            style={
                              {
                                "--event-color": `${item.backgroundColor}`,
                              } as React.CSSProperties
                            }
                          ></span>
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
