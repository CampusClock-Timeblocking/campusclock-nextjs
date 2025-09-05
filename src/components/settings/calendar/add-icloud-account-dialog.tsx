"use client";

import {
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useDialog } from "@/providers/dialog-provider";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AsyncButton } from "@/components/basic-components/async-action-button";
import { api } from "@/trpc/react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info } from "lucide-react";

export function AddICloudAccountDialog() {
  const { hideDialog } = useDialog();
  const [email, setEmail] = useState("");
  const [appPassword, setAppPassword] = useState("");
  const utils = api.useUtils();

  const addICloudAccountMutation =
    api.calendarAccount.addICloudAccount.useMutation({
      onSuccess: async () => {
        await utils.calendarAccount.invalidate();
        await utils.calendar.invalidate();
        hideDialog();
      },
    });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    toast.promise(
      addICloudAccountMutation.mutateAsync({
        email,
        appPassword,
      }),
      {
        loading: "Connecting to iCloud...",
        success: "iCloud account connected successfully!",
        error: (err: Error) => {
          return err?.message ?? "Failed to connect iCloud account";
        },
      },
    );
  };

  return (
    <DialogContent className="w-2xl !max-w-[650px]">
      <DialogHeader>
        <DialogTitle>Add iCloud Calendar Account</DialogTitle>
        <DialogDescription>
          Connect your iCloud calendar using an app-specific password.
        </DialogDescription>
      </DialogHeader>

      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription className="text-sm">
          You need to generate an app-specific password from your Apple ID
          settings. Go to{" "}
          <a
            href="https://appleid.apple.com/account/manage"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary underline underline-offset-2"
          >
            appleid.apple.com
          </a>{" "}
          → Security → App-Specific Passwords
        </AlertDescription>
      </Alert>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">iCloud Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="your.email@icloud.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={addICloudAccountMutation.isPending}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="appPassword">App-Specific Password</Label>
          <Input
            id="appPassword"
            type="password"
            placeholder="xxxx-xxxx-xxxx-xxxx"
            value={appPassword}
            onChange={(e) => setAppPassword(e.target.value)}
            required
            disabled={addICloudAccountMutation.isPending}
          />
          <p className="text-muted-foreground text-xs">
            Format: xxxx-xxxx-xxxx-xxxx (with or without dashes)
          </p>
        </div>

        <div className="flex justify-end gap-2 pt-4">
          <AsyncButton
            type="button"
            variant="outline"
            onClick={hideDialog}
            disabled={addICloudAccountMutation.isPending}
          >
            Cancel
          </AsyncButton>
          <AsyncButton
            type="submit"
            isLoading={addICloudAccountMutation.isPending}
          >
            Connect iCloud
          </AsyncButton>
        </div>
      </form>
    </DialogContent>
  );
}
