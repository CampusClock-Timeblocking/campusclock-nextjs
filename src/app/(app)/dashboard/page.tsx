import type { Metadata } from "next";
import BigCalendar from "@/components/big-calendar";

export const metadata: Metadata = {
  title: "CampusClock - Der KI-Assistent für deinen Alltag ",
};

export default function Dashboard() {
  return (
    <div className="flex h-full flex-col p-2 pt-0">
      <BigCalendar />
    </div>
  );
}
