import type { Metadata } from "next";
import BigCalendar from "@/components/big-calendar";

export const metadata: Metadata = {
  title: "Experiment 06 - Crafted.is",
};

export default function Dashboard() {
  return (
    <div className="flex h-full flex-col gap-4 p-2 pt-0">
      <BigCalendar />
    </div>
  );
}
