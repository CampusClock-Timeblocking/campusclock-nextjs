import { api } from "@/trpc/server";

export default async function CalendarTestPage() {
  const data = await api.calendar.getEvents({
    start: new Date("06.06.2025"),
    end: new Date("12.12.2025"),
  });

  console.log(data);
  return <div>Calendar test page</div>;
}
