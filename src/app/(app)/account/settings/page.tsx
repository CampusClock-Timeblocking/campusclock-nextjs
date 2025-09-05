"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { TitlePage } from "@/components/basic-components/page-layout";
import { WorkingHoursCard } from "@/components/settings/profile/working-hours";
import { EnergyProfileCard } from "@/components/settings/profile/energy-profile";
import { api } from "@/trpc/react";
import {
  useUpdateWorkingHoursMutation,
  useUpdateEnergyProfileMutation,
} from "@/hooks/mutations/preferences";

// --------- Small UI helpers ---------
function FieldRow({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}

// --------- Types ---------
interface ProfileFormValues {
  name: string;
  email: string;
  image?: string;
}

// --------- Main Component ---------
export default function AccountSettings() {
  const { data: sessionData, refetch: refetchSession } =
    authClient.useSession();
  const me = sessionData?.user;

  // ---- Preferences (working hours + energy) ----
  const preferencesQuery = api.preferences.get.useQuery();
  const updateWorkingHours = useUpdateWorkingHoursMutation();
  const updateEnergyProfile = useUpdateEnergyProfileMutation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { isSubmitting, isDirty },
  } = useForm<ProfileFormValues>({
    defaultValues: {
      name: me?.name ?? "",
      email: me?.email ?? "",
      image: me?.image ?? "",
    },
  });

  useEffect(() => {
    if (me) {
      reset({
        name: me.name ?? "",
        email: me.email ?? "",
        image: me.image ?? "",
      });
    }
  }, [me, reset]);

  const onSaveProfile = handleSubmit(async (values) => {
    const updates: Partial<Pick<ProfileFormValues, "name" | "image">> = {};
    if (values.name !== me?.name) updates.name = values.name;
    if (values.image !== me?.image) updates.image = values.image;

    if (Object.keys(updates).length) {
      await authClient.updateUser(updates);
    }

    if (values.email && values.email !== me?.email) {
      await authClient.changeEmail({
        newEmail: values.email,
        callbackURL: "/settings?email-updated=1",
      });
    }

    refetchSession();
  });

  return (
    <TitlePage
      title="Account settings"
      description="Manage your account"
      className="max-w-6xl gap-6"
    >
      {/* Profile card */}
      <div className="border-border space-y-3 rounded-lg border p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className="border-border shrink-0 rounded-sm border"
              style={{ padding: 6 }}
            >
              <User size={30} />
            </div>
            <div className="flex flex-col justify-center">
              <h3 className="text-lg font-semibold">Profile</h3>
              <p className="text-muted-foreground text-sm">
                Update your basic information
              </p>
            </div>
          </div>
          {isDirty && (
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => reset()}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button size="sm" disabled={isSubmitting} onClick={onSaveProfile}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Save
              </Button>
            </div>
          )}
        </div>
        <Separator />
        <div className="grid gap-4 md:grid-cols-2">
          <FieldRow label="Name" htmlFor="name">
            <div className="relative">
              <User className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                id="name"
                className="pl-8"
                placeholder="Your name"
                {...register("name")}
              />
            </div>
          </FieldRow>
          <FieldRow label="Email" htmlFor="email">
            <div className="relative">
              <Mail className="text-muted-foreground absolute top-2.5 left-2 size-4" />
              <Input
                id="email"
                className="pl-8"
                type="email"
                disabled
                placeholder="you@example.com"
                {...register("email")}
              />
            </div>
          </FieldRow>
        </div>
      </div>

      <WorkingHoursCard
        preferences={preferencesQuery.data}
        isLoading={preferencesQuery.isLoading}
        onSave={(v) => updateWorkingHours.mutateAsync(v)}
        isSaving={updateWorkingHours.isPending}
      />

      <EnergyProfileCard
        preferences={preferencesQuery.data}
        isLoading={preferencesQuery.isLoading}
        onSave={(v) => updateEnergyProfile.mutateAsync(v)}
        isSaving={updateEnergyProfile.isPending}
      />
    </TitlePage>
  );
}
