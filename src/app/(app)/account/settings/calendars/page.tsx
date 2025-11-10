"use client";

import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { TitlePage } from "@/components/basic-components/page-layout";

import { Plus } from "lucide-react";
import {
  AddCalendarAccount,
  AddCalendarAccountSkeleton,
  CalendarAccount,
  CalendarAccountSkeleton,
} from "@/components/settings/calendar/calendar-account";
import { useDialog } from "@/providers/dialog-provider";
import { AddCalendarAccountDialog } from "@/components/settings/calendar/add-account-dialog";

export default function CalendarsPage() {
  const { showDialog } = useDialog();

  const calendarAccounts = api.calendarAccount.getAll.useQuery();

  const handleAddCalendarAccount = () => {
    showDialog(<AddCalendarAccountDialog />);
  };

  return (
    <TitlePage
      title="Calendars"
      description="Manage your calendars"
      actionButton={
        <Button
          disabled={calendarAccounts.isLoading}
          onClick={handleAddCalendarAccount}
        >
          <Plus /> Add calendar account
        </Button>
      }
    >
      <div className="space-y-6">
        {calendarAccounts.isLoading ? (
          <>
            <CalendarAccountSkeleton calendarSkeletonCount={1} />
            <CalendarAccountSkeleton calendarSkeletonCount={3} />
            <AddCalendarAccountSkeleton />
          </>
        ) : (
          <>
            {calendarAccounts.data?.map((account) => (
              <CalendarAccount key={account.id} account={account} />
            ))}

            <AddCalendarAccount onClick={handleAddCalendarAccount} />
          </>
        )}
      </div>
    </TitlePage>
  );
}
