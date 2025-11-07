"use client";

import { AuthUIProvider } from "@daveyplate/better-auth-ui";
import { CalendarProvider } from "@/components/event-calendar/calendar-context";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/providers/theme-provider";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { authClient } from "@/lib/auth-client";
import { ConfirmationDialogProvider } from "@/providers/confirmation-dialog-provider";
import { DialogProvider } from "@/providers/dialog-provider";

export function Providers({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <AuthUIProvider
        authClient={authClient}
        navigate={(url) => router.push(url)}
        replace={(url) => router.replace(url)}
        onSessionChange={() => {
          // Clear router cache (protected routes)
          router.refresh();
        }}
        Link={Link}
        credentials={false}
        social={{
          providers: ["google"],
          signIn: async (params) => {
            return authClient.signIn.social({
              ...params,
              callbackURL: "/dashboard",
              newUserCallbackURL: "/onboarding",
            });
          },
        }}
      >
        <ConfirmationDialogProvider>
          <CalendarProvider>
            <DialogProvider>{children}</DialogProvider>
          </CalendarProvider>
          <Toaster />
        </ConfirmationDialogProvider>
      </AuthUIProvider>
    </ThemeProvider>
  );
}
