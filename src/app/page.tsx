"use client";
import Link from "next/link";

//import { HydrateClient } from "@/trpc/server";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";

export default function Home() {
  const requestGoogleCalendarAccess = async () => {
    await authClient.linkSocial({
      provider: "google",
      scopes: ["https://www.googleapis.com/auth/calendar.events"],
    });
  };
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          Create <span className="text-[hsl(280,100%,70%)]">T3</span> App
        </h1>
        <Link href={"/auth/sign-up"}>
          <Button>Signup</Button>
        </Link>
        <Button onClick={requestGoogleCalendarAccess}>Link calendar</Button>
        <Link href="/calendar">
          <Button>Calendar test page</Button>
        </Link>

        <div className="flex flex-col items-center gap-2">
          <p className="text-2xl text-white"></p>
        </div>
      </div>
    </main>
  );
}
