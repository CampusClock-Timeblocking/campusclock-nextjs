"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item";
import { CalendarType } from "@prisma/client";
import {
  RiCalendar2Line,
  RiMore2Line,
  RiEditLine,
  RiDeleteBinLine,
  RiDeleteBin2Line,
  RiGoogleLine,
  RiAddLine,
} from "@remixicon/react";
import { useConfirmationDialog } from "@/hooks/use-confirmation-dialog";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { CalendarFormDialog } from "@/components/calendar-form-dialog";

export default function CalendarsPage() {
  const utils = api.useUtils();
  const { confirm } = useConfirmationDialog();
  
  // Dialog state
  const [calendarDialogOpen, setCalendarDialogOpen] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<{
    id: string;
    name: string;
    backgroundColor: string;
    foregroundColor: string;
  } | null>(null);

  const calendarQuery = api.calendar.getAll.useQuery();
  const { mutateAsync: deleteCalendar } = api.calendar.delete.useMutation({
    onSuccess: async () => {
      await utils.calendar.invalidate();
    },
  });
  const { mutateAsync: syncCalendars } =
    api.calendar.importGoogleCalendars.useMutation({
      onSuccess: async () => {
        await utils.calendar.invalidate();
      },
    });

  const countOfLocalCalendars = useMemo(
    () =>
      calendarQuery.data?.filter(
        (calendar) => calendar.type === CalendarType.LOCAL,
      ).length,
    [calendarQuery.data],
  );

  const handleCreateCalendar = () => {
    setEditingCalendar(null);
    setCalendarDialogOpen(true);
  };

  const handleEditCalendar = (calendarId: string) => {
    const calendar = localCalendars?.find((cal) => cal.id === calendarId);
    if (calendar) {
      setEditingCalendar({
        id: calendar.id,
        name: calendar.name,
        backgroundColor: calendar.backgroundColor,
        foregroundColor: calendar.foregroundColor,
      });
      setCalendarDialogOpen(true);
    }
  };

  const handleDeleteCalendar = async (
    calendarId: string,
    isGoogleCalendar: boolean,
  ) => {
    const description = isGoogleCalendar
      ? "This action cannot be undone. The calendar will be removed from CampusClock, but will remain in your Google account. To re-add it, simply sync your Google calendars again."
      : "This action cannot be undone. All events associated with this calendar will also be deleted.";
    const confirmText = isGoogleCalendar ? "Remove from CampusClock" : "Delete";

    const confirmed = await confirm({
      title: "Are you sure you want to delete this calendar?",
      description,
      confirmText,
      cancelText: "Cancel",
      variant: "destructive",
    });
    if (confirmed) {
      toast.promise(deleteCalendar({ id: calendarId }), {
        loading: isGoogleCalendar
          ? "Removing calendar from CampusClock..."
          : "Deleting calendar...",
        success: isGoogleCalendar
          ? "Calendar removed from CampusClock."
          : "Calendar deleted.",
        error: (err: Error) => {
          return err?.message ?? "Something went wrong";
        },
      });
    }
  };

  const handleSyncGoogleCalendars = () => {
    toast.promise(syncCalendars(), {
      loading: "Syncing Google calendars...",
      success: "Google calendars synced.",
      error: (err: Error) => {
        return err?.message ?? "Something went wrong";
      },
    });
  };

  const handleDeleteAllEvents = async (calendarId: string) => {
    await confirm({
      title: "Are you sure you want to delete all events in this calendar?",
      description:
        "This action cannot be undone. All events in this calendar will be permanently deleted.",
      confirmText: "Delete All Events",
      cancelText: "Cancel",
      variant: "destructive",
    });
    // TODO: Implement delete all events functionality
    console.log("Delete all events in calendar:", calendarId);
  };

  const localCalendars = calendarQuery.data?.filter(
    (calendar) => calendar.type === CalendarType.LOCAL,
  );
  const googleCalendars = calendarQuery.data?.filter(
    (calendar) => calendar.provider === "GOOGLE",
  );

  if (calendarQuery.isLoading) {
    return (
      <div>need to add skeleton</div>
    );
  }

  return (
    <div className="container max-w-4xl px-6 py-8">
      {/* Header Section */}
      <div className="mb-12 flex items-center gap-6">
        <div className="bg-primary/10 flex h-16 w-16 items-center justify-center rounded-2xl">
          <RiCalendar2Line className="text-primary h-8 w-8" />
        </div>
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold tracking-tight">Calendars</h1>
          <p className="text-muted-foreground text-lg">
            Manage and organize your calendars and events.
          </p>
        </div>
      </div>

      <div className="space-y-12">
        {/* Local Calendars Section */}
        {localCalendars && localCalendars.length > 0 && (
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-semibold tracking-tight">
                  CampusClock Calendars
                </h2>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="gap-2"
                  onClick={handleCreateCalendar}
                >
                  <RiAddLine className="h-4 w-4" />
                  New Calendar
                </Button>
              </div>
              <p className="text-muted-foreground">
                Personal calendars stored locally in CampusClock.
              </p>
            </div>

            <ItemGroup className="gap-3">
              {localCalendars.map((calendar) => (
                <Item key={calendar.id} variant="outline">
                  <ItemMedia>
                    <div
                      className="h-4 w-4 rounded-full border-2"
                      style={{
                        backgroundColor: calendar.backgroundColor ?? "#3b82f6",
                        borderColor: calendar.backgroundColor ?? "#3b82f6",
                      }}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>{calendar.name}</ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <RiMore2Line className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuItem
                          onClick={() => handleEditCalendar(calendar.id)}
                          className="gap-2"
                        >
                          <RiEditLine className="h-4 w-4" />
                          Edit Calendar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteAllEvents(calendar.id)}
                          className="gap-2 text-orange-600"
                        >
                          <RiDeleteBin2Line className="h-4 w-4" />
                          Delete All Events
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteCalendar(calendar.id, false)}
                          className="text-destructive gap-2"
                          disabled={countOfLocalCalendars === 1}
                        >
                          <RiDeleteBinLine className="h-4 w-4" />
                          Delete Calendar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          </div>
        )}

        {/* Google Calendars Section */}
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-semibold tracking-tight">
                Google Calendars
              </h2>
              <Button
                onClick={handleSyncGoogleCalendars}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <RiGoogleLine className="h-4 w-4" />
                Sync Calendars
              </Button>
            </div>
            <p className="text-muted-foreground">
              Calendars synced from your Google account.
            </p>
          </div>
          {googleCalendars && googleCalendars.length > 0 ? (
            <ItemGroup className="gap-3">
              {googleCalendars.map((calendar) => (
                <Item key={calendar.id} variant="outline">
                  <ItemMedia>
                    <div
                      className="h-4 w-4 rounded-full border-2"
                      style={{
                        backgroundColor: calendar.backgroundColor ?? "#34a853",
                        borderColor: calendar.backgroundColor ?? "#34a853",
                      }}
                    />
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle>
                      {calendar.name}
                      <RiGoogleLine className="text-muted-foreground h-3 w-3" />
                    </ItemTitle>
                  </ItemContent>
                  <ItemActions>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <RiMore2Line className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-[180px]">
                        <DropdownMenuItem
                          onClick={() => handleDeleteCalendar(calendar.id, true)}
                          className="text-destructive gap-2"
                        >
                          <RiDeleteBinLine className="h-4 w-4" />
                          Remove Calendar
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </ItemActions>
                </Item>
              ))}
            </ItemGroup>
          ) : (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiCalendar2Line />
                </EmptyMedia>
                <EmptyTitle>No Google Calendars Found</EmptyTitle>
                <EmptyDescription>
                  Connect your Google account to sync your calendars with CampusClock.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <Button variant="outline" className="gap-2" onClick={handleSyncGoogleCalendars}>
                  <RiGoogleLine className="h-4 w-4" />
                  Sync from Google Calendar
                </Button>
              </EmptyContent>
            </Empty>
          )}
        </div>

        {/* Empty State */}
        {(!localCalendars || localCalendars.length === 0) &&
          (!googleCalendars || googleCalendars.length === 0) && (
            <Empty>
              <EmptyHeader>
                <EmptyMedia variant="icon">
                  <RiCalendar2Line />
                </EmptyMedia>
                <EmptyTitle>No Calendars Found</EmptyTitle>
                <EmptyDescription>
                  Get started by creating a local calendar or syncing your Google calendars.
                </EmptyDescription>
              </EmptyHeader>
              <EmptyContent>
                <div className="flex gap-3">
                  <Button 
                    variant="outline" 
                    className="gap-2"
                    onClick={handleCreateCalendar}
                  >
                    <RiAddLine className="h-4 w-4" />
                    Create Calendar
                  </Button>
                  <Button onClick={handleSyncGoogleCalendars} className="gap-2">
                    <RiGoogleLine className="h-4 w-4" />
                    Sync Google Calendars
                  </Button>
                </div>
              </EmptyContent>
            </Empty>
          )}
      </div>

      {/* Calendar Form Dialog */}
      <CalendarFormDialog
        open={calendarDialogOpen}
        onOpenChange={setCalendarDialogOpen}
        calendar={editingCalendar}
        onSuccess={() => {
          setCalendarDialogOpen(false);
          setEditingCalendar(null);
        }}
      />
    </div>
  );
}
