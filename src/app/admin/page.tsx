"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSchedule } from "@/contexts/ScheduleContext";
import {
  formatSpecialDate,
  formatTemporaryClosure,
  getWeeklyDescription,
} from "@/lib/schedule-store";
import type { SpecialDateMode } from "@/lib/schedule-types";
import {
  loadBookings,
  deleteBooking,
  type BookingRecord,
} from "@/lib/booking-store";
type AdminTab = "weekly" | "special" | "closure" | "bookings";
const ADMIN_PASSWORD = "123456";

const inputClass =
  "w-full px-3 py-2.5 rounded-xl bg-cream/80 border border-pink-light/60 text-warm-text text-sm focus:outline-none focus:ring-2 focus:ring-pink/40 focus:border-pink";

const cardClass = "bg-white/60 backdrop-blur-sm rounded-card shadow-card p-4";

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <h2 className="text-[15px] font-semibold text-warm-text">{title}</h2>
    </div>
  );
}

function WeeklySettings() {
  const { settings, updateWeeklyItem } = useSchedule();
  const orderedWeekly = useMemo(
    () => [...settings.weekly].sort((a, b) => {
      const orderA = a.weekday === 0 ? 7 : a.weekday;
      const orderB = b.weekday === 0 ? 7 : b.weekday;
      return orderA - orderB;
    }),
    [settings.weekly]
  );

  return (
    <div className="space-y-3">
      {orderedWeekly.map((item) => (
        <div key={item.weekday} className={`${cardClass} space-y-3`}>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-warm-text">{item.label}</span>
            <label className="flex items-center gap-2 text-sm text-warm-muted">
              <span>{item.isOpen ? "营业" : "休息"}</span>
              <input
                type="checkbox"
                checked={item.isOpen}
                onChange={(e) =>
                  updateWeeklyItem(item.weekday, { isOpen: e.target.checked })
                }
                className="w-4 h-4 accent-pink"
              />
            </label>
          </div>
          {item.isOpen && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-warm-muted mb-1.5">开始时间</label>
                <input
                  type="time"
                  value={item.startTime}
                  onChange={(e) =>
                    updateWeeklyItem(item.weekday, { startTime: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs text-warm-muted mb-1.5">结束时间</label>
                <input
                  type="time"
                  value={item.endTime}
                  onChange={(e) =>
                    updateWeeklyItem(item.weekday, { endTime: e.target.value })
                  }
                  className={inputClass}
                />
              </div>
            </div>
          )}
          <p className="text-xs text-warm-light">{getWeeklyDescription(item)}</p>
        </div>
      ))}
    </div>
  );
}

function SpecialDateSettings() {
  const { settings, addSpecialDate, removeSpecialDate } = useSchedule();
  const [date, setDate] = useState("");
  const [mode, setMode] = useState<SpecialDateMode>("closed");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("20:00");

  const handleAdd = () => {
    if (!date) return;
    addSpecialDate({
      date,
      mode,
      startTime: mode === "custom" ? startTime : undefined,
      endTime: mode === "custom" ? endTime : undefined,
    });
    setDate("");
  };

  return (
    <div className="space-y-4">
      <div className={`${cardClass} space-y-3`}>
        <SectionTitle icon="➕" title="添加特殊日期" />
        <div>
          <label className="block text-xs text-warm-muted mb-1.5">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-xs text-warm-muted mb-1.5">类型</label>
          <select
            value={mode}
            onChange={(e) => setMode(e.target.value as SpecialDateMode)}
            className={inputClass}
          >
            <option value="closed">全天休息</option>
            <option value="custom">指定时段营业</option>
          </select>
        </div>
        {mode === "custom" && (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-warm-muted mb-1.5">开始时间</label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs text-warm-muted mb-1.5">结束时间</label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        )}
        <button
          type="button"
          onClick={handleAdd}
          disabled={!date}
          className="w-full py-3 rounded-pill bg-gradient-to-r from-pink to-pink-accent text-white text-sm font-semibold shadow-soft disabled:opacity-50"
        >
          添加
        </button>
      </div>

      <div className={cardClass}>
        <SectionTitle icon="📌" title="已设置的特殊日期" />
        {settings.specialDates.length === 0 ? (
          <p className="text-sm text-warm-muted text-center py-4">暂无特殊日期</p>
        ) : (
          <div className="space-y-2">
            {settings.specialDates.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-cream/80"
              >
                <div className="text-sm">
                  <p className="font-medium text-warm-text">{item.date}</p>
                  <p className="text-xs text-warm-muted mt-0.5">{formatSpecialDate(item)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeSpecialDate(item.id)}
                  className="text-xs text-pink-dark px-2 py-1"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TemporaryClosureSettings() {
  const { settings, addTemporaryClosure, removeTemporaryClosure } = useSchedule();
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("14:00");
  const [endTime, setEndTime] = useState("16:00");

  const handleAdd = () => {
    if (!date || startTime >= endTime) return;
    addTemporaryClosure({ date, startTime, endTime });
    setDate("");
  };

  return (
    <div className="space-y-4">
      <div className={`${cardClass} space-y-3`}>
        <SectionTitle icon="➕" title="添加临时关闭" />
        <div>
          <label className="block text-xs text-warm-muted mb-1.5">日期</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-warm-muted mb-1.5">开始时间</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="block text-xs text-warm-muted mb-1.5">结束时间</label>
            <input
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!date || startTime >= endTime}
          className="w-full py-3 rounded-pill bg-gradient-to-r from-pink to-pink-accent text-white text-sm font-semibold shadow-soft disabled:opacity-50"
        >
          添加
        </button>
      </div>

      <div className={cardClass}>
        <SectionTitle icon="🚫" title="已设置的临时关闭" />
        {settings.temporaryClosures.length === 0 ? (
          <p className="text-sm text-warm-muted text-center py-4">暂无临时关闭</p>
        ) : (
          <div className="space-y-2">
            {settings.temporaryClosures.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-cream/80"
              >
                <div className="text-sm">
                  <p className="font-medium text-warm-text">{item.date}</p>
                  <p className="text-xs text-warm-muted mt-0.5">
                    {formatTemporaryClosure(item)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeTemporaryClosure(item.id)}
                  className="text-xs text-pink-dark px-2 py-1"
                >
                  删除
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
function BookingManagement() {
  console.log("BookingManagement执行了");
  const [bookings, setBookings] = useState<BookingRecord[]>([]);

  useEffect(() => {
    const data = loadBookings();
  
    console.log("预约数据", data);
  
    setBookings(data);
  }, []);

  const handleDelete = (id: string) => {
    deleteBooking(id);
    setBookings(loadBookings());
  };

  return (
    <div className="space-y-3">
      {bookings.length === 0 ? (
        <div className={cardClass}>
          <p className="text-center text-warm-muted py-6">
            暂无预约记录
          </p >
        </div>
      ) : (
        bookings.map((item) => (
          <div
            key={item.id}
            className={`${cardClass} space-y-2`}
          >
            <div className="flex justify-between">
              <span className="font-semibold">
                {item.name}
              </span>

              <button
                onClick={() => handleDelete(item.id)}
                className="text-red-500 text-xs"
              >
                删除
              </button>
            </div>

            <p className="text-sm">
              手机：{item.phone}
            </p >

            <p className="text-sm">
              日期：{item.selectedDate}
            </p >

            <p className="text-sm">
              时间：{item.selectedTime}
            </p >

            <p className="text-sm">
              内容：{item.contentText}
            </p >

            <p className="text-xs text-warm-light">
              状态：{item.status}
            </p >
          </div>
        ))
      )}
    </div>
  );
}
export default function AdminPage() {
  const { resetToDefault } = useSchedule();
  const [tab, setTab] = useState<AdminTab>("weekly");

  const tabs: { id: AdminTab; label: string; icon: string }[] = [
    { id: "weekly", label: "每周营业", icon: "🗓️" },
    { id: "special", label: "特殊日期", icon: "📅" },
    { id: "closure", label: "临时关闭", icon: "🚫" },
    { id: "bookings", label: "预约管理", icon: "📋" },
  ];

  return (
    <div className="min-h-dvh pb-10">
      <header className="sticky top-0 z-10 backdrop-blur-md bg-cream/80 border-b border-pink-light/40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-warm-text">莉莉青舍后台管理</h1>
            <p className="text-[11px] text-warm-muted">营业时间管理 · 修改后立即生效</p>
          </div>
          <Link
            href="/"
            className="text-xs px-3 py-1.5 rounded-pill bg-pink-light text-pink-dark font-medium"
          >
            预约页
          </Link>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-5 space-y-4">
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-pill text-sm font-medium transition-all ${
                tab === item.id
                  ? "bg-gradient-to-r from-pink to-pink-accent text-white shadow-soft"
                  : "bg-white/80 text-warm-text shadow-card"
              }`}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </div>

        {tab === "weekly" && <WeeklySettings />}
        {tab === "special" && <SpecialDateSettings />}
        {tab === "closure" && <TemporaryClosureSettings />}
        {tab === "bookings" && <BookingManagement />}

        <button
          type="button"
          onClick={resetToDefault}
          className="w-full py-3 rounded-pill border border-pink-light text-warm-muted text-sm"
        >
          恢复默认设置
        </button>
      </main>
    </div>
  );
}
