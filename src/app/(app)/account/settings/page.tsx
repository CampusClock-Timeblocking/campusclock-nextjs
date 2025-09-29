"use client";

import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Loader2, User, Mail } from "lucide-react";

/**
 * Assumptions / Integration Notes
 * - You have an auth client exported at `@/lib/auth-client` created with `createAuthClient` from `better-auth/react` or `better-auth/client`.
 * - changeEmail must be enabled on the server to use `authClient.changeEmail`.
 * - Sessions list API returns { id, userAgent, ipAddress, createdAt, expiresAt }. (Matches Better Auth docs.)
 * - The "Avatar Changer" here is only the rough corpus (UI skeleton). Plug your real uploader into <AvatarPicker /> later.
 */
import { authClient } from "@/lib/auth-client";

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

function Section({
  title,
  description,
  children,
  right,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl font-semibold">{title}</h2>
        {description ? (
          <p className="text-muted-foreground mt-1 text-sm">{description}</p>
        ) : null}
        {right ? (
          <div className="mt-4 flex flex-wrap gap-2">{right}</div>
        ) : null}
      </div>
      <Separator />
      <div className="grid gap-4">{children}</div>
    </section>
  );
}

// --------- Types ---------
interface ProfileFormValues {
  name: string;
  email: string; // shown & changed via changeEmail (server must enable)
  image?: string;
}

// --------- Main Component ---------
export default function AccountSettings() {
  const { data: sessionData, refetch: refetchSession } =
    authClient.useSession();
  const me = sessionData?.user;

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
    // keep form in sync with session changes
    if (me) {
      reset({
        name: me.name ?? "",
        email: me.email ?? "",
        image: me.image ?? "",
      });
    }
  }, [me, reset]);

  const onSaveProfile = handleSubmit(async (values) => {
    // Update name & avatar via updateUser
    const updates: Partial<Pick<ProfileFormValues, "name" | "image">> = {};
    if (values.name !== me?.name) updates.name = values.name;
    if (values.image !== me?.image) updates.image = values.image;

    // 1) update user profile minimal
    if (Object.keys(updates).length) {
      await authClient.updateUser(updates);
    }

    // 2) handle email change separately when the field is changed
    if (values.email && values.email !== me?.email) {
      await authClient.changeEmail({
        newEmail: values.email,
        // redirect where your app handles the confirmation result
        callbackURL: "/settings?email-updated=1",
      });
    }

    // Refresh local session cache (synchronous refetch)
    refetchSession();
  });

  // (OAuth accounts listing removed for now to simplify UI)

  return (
    <div className="mx-auto max-w-3xl space-y-10 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Account Settings</h1>

      {/* Profile */}
      <Section
        title="Profile"
        description="Update your basic information. Email changes may require verification depending on your server config."
        right={
          <Button onClick={onSaveProfile} disabled={isSubmitting || !isDirty}>
            {isSubmitting ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : null}
            Save
          </Button>
        }
      >
        <div className="grid gap-6">
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
                  placeholder="[email protected]"
                  {...register("email")}
                />
              </div>
            </FieldRow>
          </div>
        </div>
      </Section>
    </div>
  );
}
