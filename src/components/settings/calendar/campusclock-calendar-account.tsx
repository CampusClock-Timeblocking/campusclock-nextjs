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
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  RiAddLine,
  RiDeleteBin2Line,
  RiDeleteBinLine,
  RiEditLine,
} from "@remixicon/react";
import type { Calendar } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  CreateCalendarDialog,
  EditCalendarDialog,
} from "@/components/calendar-form-dialog";
import { useDialog } from "@/providers/dialog-provider";

export function CampusClockCalendarAccount({ account }: CalendarAccountProps) {
  const utils = api.useUtils();
  const { confirm } = useConfirmationDialog();
  const { showDialog } = useDialog();

  const { mutateAsync: deleteCalendar } = api.calendar.delete.useMutation({
    onSuccess: async () => {
      await utils.calendar.invalidate();
      await utils.calendarAccount.invalidate();
    },
  });

  const handleCreateCalendar = () => {
    showDialog(<CreateCalendarDialog />);
  };

  const handleDeleteCalendar = async (calendarId: string) => {
    const confirmed = await confirm({
      title: "Are you sure you want to delete this calendar?",
      description:
        "This action cannot be undone. All events associated with this calendar will also be deleted.",
      confirmText: "Delete",
      cancelText: "Cancel",
      variant: "destructive",
    });
    if (confirmed) {
      toast.promise(deleteCalendar({ id: calendarId }), {
        loading: "Deleting calendar...",
        success: "Calendar deleted.",
        error: (err: Error) => {
          return err?.message ?? "Something went wrong";
        },
      });
    }
  };

  const handleDeleteAllEvents = async (calendarId: string) => {
    const confirmed = await confirm({
      title: "Are you sure you want to delete all events in this calendar?",
      description:
        "This action cannot be undone. All events in this calendar will be permanently deleted.",
      confirmText: "Delete All Events",
      cancelText: "Cancel",
      variant: "destructive",
    });
    if (confirmed) {
      // TODO: Implement delete all events functionality
      console.log("Delete all events in calendar:", calendarId);
      toast.info("This feature is not yet implemented.");
    }
  };

  const handleEditCalendar = (calendar: Calendar) => {
    showDialog(<EditCalendarDialog calendar={calendar} />);
  };

  const campusClockCalendarMenueContent = (calendar: Calendar) => {
    return (
      <DropdownMenuContent align="end" className="w-[180px]">
        <DropdownMenuItem
          onClick={() => handleEditCalendar(calendar)}
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
          onClick={() => handleDeleteCalendar(calendar.id)}
          className="text-destructive gap-2"
          disabled={account.calendars.length === 1}
        >
          <RiDeleteBinLine className="h-4 w-4" />
          Delete Calendar
        </DropdownMenuItem>
      </DropdownMenuContent>
    );
  };

  return (
    <CalendarAccountLayout
      title="CampusClock"
      description={
        account.email ?? account.name ?? "CampusClock Calendar Account"
      }
      action={
        <Button variant="outline" onClick={handleCreateCalendar}>
          <RiAddLine className="h-4 w-4" />
          Create Calendar
        </Button>
      }
      calendars={account.calendars}
      provider={account.provider}
      menuContent={(calendarId) => {
        const calendar = account.calendars.find((c) => c.id === calendarId);
        return calendar ? campusClockCalendarMenueContent(calendar) : null;
      }}
    />
  );
}
