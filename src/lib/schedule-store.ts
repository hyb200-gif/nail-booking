import type {
  DayOption,
  DayScheduleInfo,
  ScheduleSettings,
  SpecialDate,
  TemporaryClosure,
  TimeSlot,
  WeeklyScheduleItem,
} from "./schedule-types";

export const STORAGE_KEY = "nail-booking-schedule";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

export const DEFAULT_SCHEDULE: ScheduleSettings = {
  weekly: [
    { weekday: 1, label: "周一", isOpen: true, startTime: "09:00", endTime: "20:00" },
    { weekday: 2, label: "周二", isOpen: true, startTime: "17:30", endTime: "20:00" },
    { weekday: 3, label: "周三", isOpen: true, startTime: "12:00", endTime: "20:00" },
    { weekday: 4, label: "周四", isOpen: true, startTime: "17:30", endTime: "20:00" },
    { weekday: 5, label: "周五", isOpen: true, startTime: "12:00", endTime: "20:00" },
    { weekday: 6, label: "周六", isOpen: false, startTime: "09:00", endTime: "20:00" },
    { weekday: 0, label: "周日", isOpen: true, startTime: "09:00", endTime: "20:00" },
  ],
  specialDates: [
    { id: "sp-1", date: "2026-06-01", mode: "closed" },
    {
      id: "sp-2",
      date: "2026-06-08",
      mode: "custom",
      startTime: "14:00",
      endTime: "20:00",
    },
  ],
  temporaryClosures: [
    {
      id: "tc-1",
      date: "2026-06-03",
      startTime: "14:00",
      endTime: "16:00",
    },
  ],
};

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function loadScheduleSettings(): ScheduleSettings {
  if (typeof window === "undefined") return DEFAULT_SCHEDULE;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SCHEDULE;
    const parsed = JSON.parse(raw) as Partial<ScheduleSettings>;
    return normalizeScheduleSettings(parsed);
  } catch {
    return DEFAULT_SCHEDULE;
  }
}

function normalizeWeeklyItem(item: Partial<WeeklyScheduleItem>, fallback: WeeklyScheduleItem): WeeklyScheduleItem {
  return {
    weekday: item.weekday ?? fallback.weekday,
    label: item.label ?? fallback.label,
    isOpen: typeof item.isOpen === "boolean" ? item.isOpen : fallback.isOpen,
    startTime: item.startTime ?? fallback.startTime,
    endTime: item.endTime ?? fallback.endTime,
  };
}

function normalizeScheduleSettings(parsed: Partial<ScheduleSettings>): ScheduleSettings {
  const weekly = DEFAULT_SCHEDULE.weekly.map((fallback) => {
    const found = parsed.weekly?.find((item) => item.weekday === fallback.weekday);
    return found ? normalizeWeeklyItem(found, fallback) : fallback;
  });

  const specialDates = (parsed.specialDates ?? DEFAULT_SCHEDULE.specialDates).filter(
    (item) => item?.date && item?.mode
  );

  const temporaryClosures = (parsed.temporaryClosures ?? DEFAULT_SCHEDULE.temporaryClosures).filter(
    (item) => item?.date && item?.startTime && item?.endTime
  );

  return { weekly, specialDates, temporaryClosures };
}

export function saveScheduleSettings(settings: ScheduleSettings): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function parseDateString(date: string): Date {
  const [y, mo, d] = date.split("-").map(Number);
  return new Date(y, mo - 1, d);
}

function getTodayString(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function generateBaseSlots(): Omit<TimeSlot, "available">[] {
  const slots: Omit<TimeSlot, "available">[] = [];
  for (let minutes = 9 * 60; minutes < 20 * 60; minutes += 30) {
    const label = minutesToTime(minutes);
    slots.push({ id: label, label });
  }
  return slots;
}

const BASE_SLOTS = generateBaseSlots();

function getWeeklyRule(settings: ScheduleSettings, weekday: number): WeeklyScheduleItem {
  return (
    settings.weekly.find((item) => item.weekday === weekday) ??
    DEFAULT_SCHEDULE.weekly.find((item) => item.weekday === weekday)!
  );
}

function getSpecialDate(settings: ScheduleSettings, date: string): SpecialDate | undefined {
  return settings.specialDates.find((item) => item.date === date);
}

function getTemporaryClosures(settings: ScheduleSettings, date: string): TemporaryClosure[] {
  return settings.temporaryClosures.filter((item) => item.date === date);
}

function isSlotInTemporaryClosure(
  slotMinutes: number,
  closures: TemporaryClosure[]
): boolean {
  return closures.some((closure) => {
    const start = parseTimeToMinutes(closure.startTime);
    const end = parseTimeToMinutes(closure.endTime);
    return slotMinutes >= start && slotMinutes < end;
  });
}

export function getEffectiveDaySchedule(
  date: string,
  settings: ScheduleSettings
): DayScheduleInfo {
  const dayOfWeek = parseDateString(date).getDay();
  const special = getSpecialDate(settings, date);
  const weekly = getWeeklyRule(settings, dayOfWeek);

  if (special?.mode === "closed") {
    return {
      isClosed: true,
      startTime: "09:00",
      endTime: "20:00",
      description: "特殊日期：休息",
    };
  }

  if (special?.mode === "custom") {
    const startTime = special.startTime ?? "09:00";
    const endTime = special.endTime ?? "20:00";
    return {
      isClosed: false,
      startTime,
      endTime,
      description: `${startTime} 后营业`,
    };
  }

  if (!weekly.isOpen) {
    return {
      isClosed: true,
      startTime: weekly.startTime,
      endTime: weekly.endTime,
      description: "休息",
    };
  }

  return {
    isClosed: false,
    startTime: weekly.startTime,
    endTime: weekly.endTime,
    description: `${weekly.startTime}-${weekly.endTime}`,
  };
}

export function getWeeklyDescription(item: WeeklyScheduleItem): string {
  if (!item.isOpen) return "休息";
  return `${item.startTime}-${item.endTime}`;
}

export function getNext30Days(settings: ScheduleSettings): DayOption[] {
  const days: DayOption[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const month = d.getMonth() + 1;
    const day = d.getDate();
    const dayOfWeek = d.getDay();
    const weekday = WEEKDAYS[dayOfWeek];
    const dateStr = `${d.getFullYear()}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const schedule = getEffectiveDaySchedule(dateStr, settings);

    days.push({
      date: dateStr,
      label: `${month}/${day}`,
      weekday,
      isToday: i === 0,
      isClosed: schedule.isClosed,
    });
  }

  return days;
}

export function getTimeSlotsForDate(date: string, settings: ScheduleSettings): TimeSlot[] {
  const schedule = getEffectiveDaySchedule(date, settings);
  const isToday = date === getTodayString();
  const currentMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const closures = getTemporaryClosures(settings, date);

  if (schedule.isClosed) {
    return BASE_SLOTS.map((slot) => ({ ...slot, available: false }));
  }

  const startMinutes = parseTimeToMinutes(schedule.startTime);
  const endMinutes = parseTimeToMinutes(schedule.endTime);

  return BASE_SLOTS.map((slot) => {
    const slotMinutes = parseTimeToMinutes(slot.label);
    const inHours = slotMinutes >= startMinutes && slotMinutes < endMinutes;
    const isPast = isToday && slotMinutes <= currentMinutes;
    const isBlocked = isSlotInTemporaryClosure(slotMinutes, closures);

    return {
      ...slot,
      available: inHours && !isPast && !isBlocked,
    };
  });
}

export function formatSpecialDate(item: SpecialDate): string {
  if (item.mode === "closed") return "休息";
  return `${item.startTime ?? "09:00"} 后营业`;
}

export function formatTemporaryClosure(item: TemporaryClosure): string {
  return `${item.startTime}-${item.endTime}`;
}
