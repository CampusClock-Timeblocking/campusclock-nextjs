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
import { CalendarType } from "@prisma/client";
import {
  RiCalendar2Line,
  RiEditLine,
  RiDeleteBinLine,
  RiDeleteBin2Line,
  RiGoogleLine,
  RiAddLine,
  RiAppleFill,
} from "@remixicon/react";
import { useConfirmationDialog } from "@/hooks/use-confirmation-dialog";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { CalendarFormDialog } from "@/components/calendar-form-dialog";
import { TitlePage } from "@/components/basic-components/page-layout";

import { Plus } from "lucide-react";
import {
  AddCalendarAccount,
  AddCalendarAccountSkeleton,
  CalendarAccount,
  CalendarAccountSkeleton,
} from "@/components/settings/calendar/calendar-account";
import { authClient } from "@/lib/auth-client";

export default function CalendarsPage() {
  const utils = api.useUtils();
  const { confirm } = useConfirmationDialog();

  const session = authClient.useSession();

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

  function campusClockCalendarMoreMenueContent(id: string) {
    return (
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem
          onClick={() => handleEditCalendar(id)}
          className="gap-2"
        >
          <RiEditLine className="h-4 w-4" />
          Edit Calendar
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => handleDeleteAllEvents(id)}
          className="gap-2 text-orange-600"
        >
          <RiDeleteBin2Line className="h-4 w-4" />
          Delete All Events
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleDeleteCalendar(id, false)}
          className="text-destructive gap-2"
          disabled={countOfLocalCalendars === 1}
        >
          <RiDeleteBinLine className="h-4 w-4" />
          Delete Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  }

  function googleCalendarMoreMenueContent(id: string) {
    return (
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem
          onClick={() => handleDeleteCalendar(id, true)}
          className="text-destructive gap-2"
        >
          <RiDeleteBinLine className="h-4 w-4" />
          Remove Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  }

  return (
    <TitlePage
      title="Calendars"
      description="Manage your calendars"
      actionButton={
        <Button
          disabled={calendarQuery.isLoading}
          onClick={() => toast.info("Coming soon!")}
        >
          <Plus /> Add calendar account
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Local Calendars Section */}
        {calendarQuery.isLoading ? (
          <>
            <CalendarAccountSkeleton calendarSkeletonCount={1} />
            <CalendarAccountSkeleton calendarSkeletonCount={3} />
            <AddCalendarAccountSkeleton />
          </>
        ) : (
          <>
            <CalendarAccount
              title="CampusClock"
              description={session.data?.user?.email ?? "example@email.com"}
              provider="campusClock"
              action={
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  onClick={handleCreateCalendar}
                >
                  <RiAddLine className="h-4 w-4" />
                  New Calendar
                </Button>
              }
              calendars={localCalendars}
              menuContent={campusClockCalendarMoreMenueContent}
            />

            <CalendarAccount
              title="Google"
              description={session.data?.user?.email ?? "example@email.com"}
              provider="google"
              action={
                <Button
                  onClick={handleSyncGoogleCalendars}
                  variant="outline"
                  size="sm"
                  className="gap-2"
                >
                  <RiGoogleLine className="h-4 w-4" />
                  Sync Calendars
                </Button>
              }
              calendars={googleCalendars}
              menuContent={googleCalendarMoreMenueContent}
            />

            <AddCalendarAccount onClick={() => toast.info("Coming soon!")} />
          </>
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
    </TitlePage>
  );
}
