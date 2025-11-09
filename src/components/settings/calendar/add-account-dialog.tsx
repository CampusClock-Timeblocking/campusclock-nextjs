"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialog } from "@/providers/dialog-provider";
import { useState } from "react";
import { RiGoogleLine } from "@remixicon/react";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import Link from "next/link";

export function AddCalendarAccountDialog() {
  const { hideDialog } = useDialog();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGoogleConnect = () => {
    setIsConnecting(true);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Calendar Account</DialogTitle>
        <DialogDescription>
          Connect your calendar to sync events and manage your schedule.
        </DialogDescription>
      </DialogHeader>

      <div className="py-4">
        <Link href="/api/calendar/google">
          <AsyncButton
            variant="outline"
            onClick={handleGoogleConnect}
            isLoading={isConnecting}
            className="flex w-full items-center justify-center"
          >
            <RiGoogleLine className="h-5 w-5" />
            Connect Google Calendar
          </AsyncButton>
        </Link>
      </div>
    </DialogContent>
  );
}
