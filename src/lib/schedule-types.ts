export interface WeeklyScheduleItem {
  weekday: number;
  label: string;
  isOpen: boolean;
  startTime: string;
  endTime: string;
}

export type SpecialDateMode = "closed" | "custom";

export interface SpecialDate {
  id: string;
  date: string;
  mode: SpecialDateMode;
  startTime?: string;
  endTime?: string;
}

export interface TemporaryClosure {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
}

export interface ScheduleSettings {
  weekly: WeeklyScheduleItem[];
  specialDates: SpecialDate[];
  temporaryClosures: TemporaryClosure[];
}

export interface DayScheduleInfo {
  isClosed: boolean;
  startTime: string;
  endTime: string;
  description: string;
}

export interface TimeSlot {
  id: string;
  label: string;
  available: boolean;
}

export interface DayOption {
  date: string;
  label: string;
  weekday: string;
  isToday: boolean;
  isClosed: boolean;
}
