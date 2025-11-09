"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialog } from "@/providers/dialog-provider";
import { useState } from "react";
import { RiGoogleLine, RiAppleFill } from "@remixicon/react";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AddICloudAccountDialog } from "./add-icloud-account-dialog";

export function AddCalendarAccountDialog() {
  const { hideDialog, showDialog } = useDialog();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleGoogleConnect = () => {
    setIsConnecting(true);
  };

  const handleICloudConnect = () => {
    showDialog(<AddICloudAccountDialog />);
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Add Calendar Account</DialogTitle>
        <DialogDescription>
          Connect your calendar to sync events and manage your schedule.
        </DialogDescription>
      </DialogHeader>

      <div className="flex flex-col gap-3 py-4">
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

        <Button
          variant="outline"
          onClick={handleICloudConnect}
          className="flex w-full items-center justify-center"
        >
          <RiAppleFill className="h-5 w-5" />
          Connect iCloud Calendar
        </Button>
      </div>
    </DialogContent>
  );
}
