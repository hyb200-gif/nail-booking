"use client";

import { ScheduleProvider } from "@/contexts/ScheduleContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return <ScheduleProvider>{children}</ScheduleProvider>;
}
