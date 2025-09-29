"use client";
import {
  RiExpandUpDownLine,
  RiUserLine,
  RiGroupLine,
  RiLogoutCircleLine,
} from "@remixicon/react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export function NavUser() {
  const session = authClient.useSession();

  if (!session) return null;

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground [&>svg]:size-5"
            >
              <Avatar className="size-8">
                <AvatarImage
                  src={session.data?.user.image ?? ""}
                  alt={session.data?.user.name ?? ""}
                />
                <AvatarFallback className="rounded-lg">
                  {session.data?.user.name.split("")[0]}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {session.data?.user.name}
                </span>
              </div>
              <RiExpandUpDownLine className="text-muted-foreground/80 ml-auto size-5" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="dark bg-sidebar w-(--radix-dropdown-menu-trigger-width)"
            side="bottom"
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuItem
                className="focus:bg-sidebar-accent gap-3"
                asChild
              >
                <Link href="/account/settings">
                  <RiUserLine
                    size={20}
                    className="text-muted-foreground/80 size-5"
                  />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-sidebar-accent gap-3"
                asChild
              >
                <Link href="/account/settings/calendars">
                  <RiGroupLine
                    size={20}
                    className="text-muted-foreground/80 size-5"
                  />
                  Calenders
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                className="focus:bg-sidebar-accent gap-3"
                asChild
              >
                <Link href="/auth/sign-out">
                  <RiLogoutCircleLine
                    size={20}
                    className="text-muted-foreground/80 size-5"
                  />
                  Logout
                </Link>
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
