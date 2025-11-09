import { useConfirmationDialog } from "@/hooks/use-confirmation-dialog";
import {
  CalendarAccountLayout,
  type CalendarAccountProps,
} from "./calendar-account";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import {
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { RiDeleteBinLine, RiGoogleLine } from "@remixicon/react";
import { AsyncButton } from "@/components/basic-components/async-action-button";

export function GoogleCalendarAccount({ account }: CalendarAccountProps) {
  const utils = api.useUtils();
  const { confirm } = useConfirmationDialog();
  const syncCalendarsMutation = api.calendarAccount.syncCalendars.useMutation({
    onSuccess: async () => {
      await utils.calendar.invalidate();
      await utils.calendarAccount.invalidate();
    },
  });

  const { mutateAsync: deleteCalendar } = api.calendar.delete.useMutation({
    onSuccess: async () => {
      await utils.calendar.invalidate();
      await utils.calendarAccount.invalidate();
    },
  });

  const onSyncCalendars = () => {
    toast.promise(syncCalendarsMutation.mutateAsync({ id: account.id }), {
      loading: "Syncing Google calendars...",
      success: "Google calendars synced.",
      error: (err: Error) => {
        return err?.message ?? "Something went wrong";
      },
    });
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    const confirmed = await confirm({
      title: "Are you sure you want to remove this calendar?",
      description:
        "The calendar will be removed from CampusClock, but will remain in your Google account. To re-add it, simply sync your Google calendars again.",
      confirmText: "Remove from CampusClock",
      cancelText: "Cancel",
      variant: "destructive",
    });
    if (confirmed) {
      toast.promise(deleteCalendar({ id: calendarId }), {
        loading: "Removing calendar from CampusClock...",
        success: "Calendar removed from CampusClock.",
        error: (err: Error) => {
          return err?.message ?? "Something went wrong";
        },
      });
    }
  };

  const googleCalendarMenueContent = (id: string) => {
    return (
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem
          onClick={() => handleDeleteCalendar(id)}
          className="text-destructive gap-2"
        >
          <RiDeleteBinLine className="h-4 w-4" />
          Remove Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  };

  return (
    <CalendarAccountLayout
      title="Google Calendar"
      description={
        account.email ?? account.name ?? "CampusClock Calendar Account"
      }
      action={
        <AsyncButton
          variant="outline"
          onClick={onSyncCalendars}
          isLoading={syncCalendarsMutation.isPending}
        >
          <RiGoogleLine />
          Sync Calendars
        </AsyncButton>
      }
      calendars={account.calendars}
      provider={account.provider}
      menuContent={googleCalendarMenueContent}
    />
  );
}
