"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  DEFAULT_SCHEDULE,
  createId,
  getEffectiveDaySchedule,
  getNext30Days,
  getTimeSlotsForDate,
  loadScheduleSettings,
  saveScheduleSettings,
  STORAGE_KEY,
} from "@/lib/schedule-store";
import type {
  ScheduleSettings,
  SpecialDate,
  TemporaryClosure,
  WeeklyScheduleItem,
} from "@/lib/schedule-types";

interface ScheduleContextValue {
  settings: ScheduleSettings;
  hydrated: boolean;
  updateWeeklyItem: (weekday: number, patch: Partial<WeeklyScheduleItem>) => void;
  addSpecialDate: (item: Omit<SpecialDate, "id">) => void;
  updateSpecialDate: (id: string, patch: Partial<SpecialDate>) => void;
  removeSpecialDate: (id: string) => void;
  addTemporaryClosure: (item: Omit<TemporaryClosure, "id">) => void;
  removeTemporaryClosure: (id: string) => void;
  resetToDefault: () => void;
  getDaySchedule: (date: string) => ReturnType<typeof getEffectiveDaySchedule>;
  getSlotsForDate: (date: string) => ReturnType<typeof getTimeSlotsForDate>;
  getDays: () => ReturnType<typeof getNext30Days>;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ScheduleSettings>(DEFAULT_SCHEDULE);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setSettings(loadScheduleSettings());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    saveScheduleSettings(settings);
    window.dispatchEvent(new CustomEvent("schedule-updated"));
  }, [settings, hydrated]);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === STORAGE_KEY) {
        setSettings(loadScheduleSettings());
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const updateSettings = useCallback((updater: (prev: ScheduleSettings) => ScheduleSettings) => {
    setSettings((prev) => updater(prev));
  }, []);

  const updateWeeklyItem = useCallback(
    (weekday: number, patch: Partial<WeeklyScheduleItem>) => {
      updateSettings((prev) => ({
        ...prev,
        weekly: prev.weekly.map((item) =>
          item.weekday === weekday ? { ...item, ...patch } : item
        ),
      }));
    },
    [updateSettings]
  );

  const addSpecialDate = useCallback(
    (item: Omit<SpecialDate, "id">) => {
      updateSettings((prev) => ({
        ...prev,
        specialDates: [...prev.specialDates, { ...item, id: createId("sp") }],
      }));
    },
    [updateSettings]
  );

  const updateSpecialDate = useCallback(
    (id: string, patch: Partial<SpecialDate>) => {
      updateSettings((prev) => ({
        ...prev,
        specialDates: prev.specialDates.map((item) =>
          item.id === id ? { ...item, ...patch } : item
        ),
      }));
    },
    [updateSettings]
  );

  const removeSpecialDate = useCallback(
    (id: string) => {
      updateSettings((prev) => ({
        ...prev,
        specialDates: prev.specialDates.filter((item) => item.id !== id),
      }));
    },
    [updateSettings]
  );

  const addTemporaryClosure = useCallback(
    (item: Omit<TemporaryClosure, "id">) => {
      updateSettings((prev) => ({
        ...prev,
        temporaryClosures: [...prev.temporaryClosures, { ...item, id: createId("tc") }],
      }));
    },
    [updateSettings]
  );

  const removeTemporaryClosure = useCallback(
    (id: string) => {
      updateSettings((prev) => ({
        ...prev,
        temporaryClosures: prev.temporaryClosures.filter((item) => item.id !== id),
      }));
    },
    [updateSettings]
  );

  const resetToDefault = useCallback(() => {
    setSettings(DEFAULT_SCHEDULE);
  }, []);

  const value = useMemo<ScheduleContextValue>(
    () => ({
      settings,
      hydrated,
      updateWeeklyItem,
      addSpecialDate,
      updateSpecialDate,
      removeSpecialDate,
      addTemporaryClosure,
      removeTemporaryClosure,
      resetToDefault,
      getDaySchedule: (date) => getEffectiveDaySchedule(date, settings),
      getSlotsForDate: (date) => getTimeSlotsForDate(date, settings),
      getDays: () => getNext30Days(settings),
    }),
    [
      settings,
      hydrated,
      updateWeeklyItem,
      addSpecialDate,
      updateSpecialDate,
      removeSpecialDate,
      addTemporaryClosure,
      removeTemporaryClosure,
      resetToDefault,
    ]
  );

  return (
    <ScheduleContext.Provider value={value}>{children}</ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error("useSchedule must be used within ScheduleProvider");
  }
  return context;
}
