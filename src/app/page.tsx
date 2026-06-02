"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSchedule } from "@/contexts/ScheduleContext";
import { validatePhone } from "@/lib/mock-data";
import { saveBooking, loadBookings} from "@/lib/booking-store";
import { getWeeklyDescription } from "@/lib/schedule-store";
import type { DayOption, TimeSlot } from "@/lib/schedule-types";

const MAX_TEXT_LENGTH = 100;
const MAX_IMAGES = 5;

interface ContentImage {
  id: string;
  url: string;
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0L14.59 9.41L24 12L14.59 14.59L12 24L9.41 14.59L0 12L9.41 9.41L12 0Z" />
    </svg>
  );
}

function DateScroller({
  days,
  selected,
  onSelect,
}: {
  days: DayOption[];
  selected: string;
  onSelect: (date: string) => void;
}) {
  return (
    <div className="flex gap-2.5 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
      {days.map((day) => {
        const isSelected = day.date === selected;
        const isClosed = day.isClosed;
        return (
          <button
            key={day.date}
            type="button"
            onClick={() => onSelect(day.date)}
            className={`
              flex-shrink-0 flex flex-col items-center justify-center
              w-[60px] h-[76px] rounded-card transition-all duration-200
              ${
                isSelected
                  ? isClosed
                    ? "bg-warm-light/80 text-white shadow-card scale-105"
                    : "bg-gradient-to-br from-pink to-pink-accent text-white shadow-soft scale-105"
                  : isClosed
                    ? "bg-cream-dark/80 text-warm-light shadow-card"
                    : "bg-white/80 text-warm-text shadow-card hover:shadow-soft"
              }
            `}
          >
            <span className="text-[11px] opacity-80">
              {day.isToday ? "今天" : isClosed ? "休息" : `周${day.weekday}`}
            </span>
            <span className="text-lg font-semibold mt-0.5">{day.label}</span>
          </button>
        );
      })}
    </div>
  );
}

function TimeSlotGrid({
  slots,
  selected,
  scheduleDescription,
  isClosed,
  onSelect,
  bookedTimes,
}: {
  slots: TimeSlot[];
  selected: string | null;
  scheduleDescription: string;
  isClosed: boolean;
  onSelect: (id: string) => void;
  bookedTimes: string[];
}) {
  const available = slots.filter((s) => s.available);

  if (available.length === 0) {
    return (
      <div className="text-center py-8 text-warm-muted text-sm leading-relaxed">
        {isClosed ? (
          <>{scheduleDescription}，请选择其他日期 💤</>
        ) : (
          <>
            暂无可预约时段
            <br />
            <span className="text-warm-light text-xs mt-1 inline-block">
              {scheduleDescription}
            </span>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2.5">
      {slots.map((slot) => {
        const isSelected = slot.id === selected;
        
        
        const isBooked = bookedTimes.includes(slot.id);
        const disabled = !slot.available || isBooked;
        return (
          <button
            key={slot.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(slot.id)}
            className={`
              py-3 rounded-card text-sm font-medium transition-all duration-200
              ${
                isBooked
                ? "bg-red-100 text-red-400 line-through cursor-not-allowed"
                : disabled
                ? "bg-cream-dark/50 text-warm-light line-through cursor-not-allowed"
                : isSelected
                ? "bg-gradient-to-br from-pink to-pink-accent text-white shadow-soft"
                : "bg-white/80 text-warm-text shadow-card hover:shadow-soft active:scale-95"
              }
            `}
          >
            {slot.label}
          </button>
        );
      })}
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: string; title: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-base">{icon}</span>
      <h2 className="text-[15px] font-semibold text-warm-text">{title}</h2>
    </div>
  );
}

function ScheduleCard() {
  const { settings } = useSchedule();
  const orderedWeekly = [...settings.weekly].sort((a, b) => {
    const orderA = a.weekday === 0 ? 7 : a.weekday;
    const orderB = b.weekday === 0 ? 7 : b.weekday;
    return orderA - orderB;
  });

  return (
    <section className="bg-white/60 backdrop-blur-sm rounded-card shadow-card p-4">
      <SectionTitle icon="🗓️" title="营业时间" />
      <div className="grid grid-cols-2 gap-2">
        {orderedWeekly.map((rule) => (
          <div
            key={rule.weekday}
            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs ${
              !rule.isOpen
                ? "bg-cream-dark/60 text-warm-light"
                : "bg-cream/80 text-warm-text"
            }`}
          >
            <span className="font-medium">{rule.label}</span>
            <span className={!rule.isOpen ? "text-warm-light" : "text-warm-muted"}>
              {getWeeklyDescription(rule)}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ImageUploadGrid({
  images,
  onAdd,
  onRemove,
}: {
  images: ContentImage[];
  onAdd: (files: FileList) => void;
  onRemove: (id: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const canAddMore = images.length < MAX_IMAGES;

  return (
    <div>
      <div className="flex items-center justify-between mb-2 ml-1 mr-1">
        <span className="text-xs text-warm-muted">参考图片</span>
        <span className="text-[11px] text-warm-light">
          {images.length}/{MAX_IMAGES} · 选填
        </span>
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        {images.map((image) => (
          <div
            key={image.id}
            className="relative aspect-square rounded-card overflow-hidden shadow-card bg-cream-dark"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={image.url}
              alt="美甲参考图"
              className="w-full h-full object-cover"
            />
            <button
              type="button"
              onClick={() => onRemove(image.id)}
              className="absolute top-1.5 right-1.5 w-6 h-6 rounded-full bg-black/40 text-white text-xs flex items-center justify-center backdrop-blur-sm active:scale-95 transition-transform"
              aria-label="删除图片"
            >
              ✕
            </button>
          </div>
        ))}
        {canAddMore && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="aspect-square rounded-card border-2 border-dashed border-pink-light/80 bg-cream/60 flex flex-col items-center justify-center gap-1 text-warm-muted active:scale-95 transition-transform hover:border-pink/60 hover:bg-pink-soft/30"
          >
            <span className="text-2xl leading-none">+</span>
            <span className="text-[10px]">添加图片</span>
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files.length > 0) {
            onAdd(e.target.files);
          }
          e.target.value = "";
        }}
      />
      <p className="text-[11px] text-warm-light mt-2 ml-1">
        最多上传 {MAX_IMAGES} 张参考图，支持 JPG、PNG 等格式
      </p>
    </div>
  );
}

function BookingFormFields({
  name,
  phone,
  contentText,
  contentImages,
  errors,
  onNameChange,
  onPhoneChange,
  onContentTextChange,
  onAddImages,
  onRemoveImage,
}: {
  name: string;
  phone: string;
  contentText: string;
  contentImages: ContentImage[];
  errors: { name?: string; phone?: string; contentText?: string };
  onNameChange: (value: string) => void;
  onPhoneChange: (value: string) => void;
  onContentTextChange: (value: string) => void;
  onAddImages: (files: FileList) => void;
  onRemoveImage: (id: string) => void;
}) {
  return (
    <div className="mt-5 pt-5 border-t border-pink-light/50 space-y-4">
      <SectionTitle icon="📝" title="填写信息" />
      <div>
        <label htmlFor="name" className="block text-xs text-warm-muted mb-1.5 ml-1">
          姓名
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
            👤
          </span>
          <input
            id="name"
            type="text"
            placeholder="请输入您的姓名"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            className="w-full pl-11 pr-4 py-3.5 rounded-card bg-cream/80 border border-pink-light/60 text-warm-text placeholder:text-warm-light focus:outline-none focus:ring-2 focus:ring-pink/40 focus:border-pink focus:bg-white transition-all"
          />
        </div>
        {errors.name && (
          <p className="text-pink-dark text-xs mt-1.5 ml-1">{errors.name}</p>
        )}
      </div>
      <div>
        <label htmlFor="phone" className="block text-xs text-warm-muted mb-1.5 ml-1">
          手机号
        </label>
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm pointer-events-none">
            📱
          </span>
          <input
            id="phone"
            type="tel"
            inputMode="numeric"
            maxLength={11}
            placeholder="请输入11位手机号"
            value={phone}
            onChange={(e) => onPhoneChange(e.target.value.replace(/\D/g, ""))}
            className="w-full pl-11 pr-4 py-3.5 rounded-card bg-cream/80 border border-pink-light/60 text-warm-text placeholder:text-warm-light focus:outline-none focus:ring-2 focus:ring-pink/40 focus:border-pink focus:bg-white transition-all"
          />
        </div>
        {errors.phone && (
          <p className="text-pink-dark text-xs mt-1.5 ml-1">{errors.phone}</p>
        )}
      </div>

      {/* 美甲内容 */}
      <div className="pt-2">
        <SectionTitle icon="💅" title="美甲内容" />

        {/* 文字板块 */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5 ml-1 mr-1">
            <label htmlFor="contentText" className="text-xs text-warm-muted">
              文字描述 <span className="text-pink-dark">*</span>
            </label>
            <span
              className={`text-[11px] ${
                contentText.length >= MAX_TEXT_LENGTH
                  ? "text-pink-dark"
                  : "text-warm-light"
              }`}
            >
              {contentText.length}/{MAX_TEXT_LENGTH}
            </span>
          </div>
          <textarea
            id="contentText"
            rows={3}
            maxLength={MAX_TEXT_LENGTH}
            placeholder="描述您想要的美甲款式、颜色等..."
            value={contentText}
            onChange={(e) => onContentTextChange(e.target.value)}
            className="w-full px-4 py-3.5 rounded-card bg-cream/80 border border-pink-light/60 text-warm-text placeholder:text-warm-light focus:outline-none focus:ring-2 focus:ring-pink/40 focus:border-pink focus:bg-white transition-all resize-none leading-relaxed"
          />
          {errors.contentText && (
            <p className="text-pink-dark text-xs mt-1.5 ml-1">{errors.contentText}</p>
          )}
        </div>

        {/* 图片板块 */}
        <ImageUploadGrid
          images={contentImages}
          onAdd={onAddImages}
          onRemove={onRemoveImage}
        />
      </div>
    </div>
  );
}

function SuccessModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-warm-text/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-sm bg-white rounded-card shadow-float p-6 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-light to-pink flex items-center justify-center shadow-soft">
          <span className="text-3xl">✨</span>
        </div>
        <h2 className="text-lg font-bold text-warm-text mb-2">预约成功</h2>
        <p className="text-sm text-warm-muted leading-relaxed mb-6">
          预约成功，我们将尽快联系您确认时间。
        </p>
        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 rounded-pill bg-gradient-to-r from-pink to-pink-accent text-white font-semibold shadow-soft active:scale-[0.98] transition-transform"
        >
          好的
        </button>
      </div>
    </div>
  );
}
export default function HomePage() {
  const { getDays, getSlotsForDate, getDaySchedule } = useSchedule();
  const days = useMemo(() => getDays(), [getDays]);
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const bookings = loadBookings();
  const bookedTimes = bookings
  .filter(item => item.selectedDate === selectedDate)
  .map(item => item.selectedTime);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [contentText, setContentText] = useState("");
  const [contentImages, setContentImages] = useState<ContentImage[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [errors, setErrors] = useState<{
    name?: string;
    phone?: string;
    time?: string;
    contentText?: string;
  }>({});

  useEffect(() => {
    if (!selectedDate && days.length > 0) {
      setSelectedDate(days[0].date);
    }
  }, [days, selectedDate]);

  const revokeImages = (images: ContentImage[]) => {
    images.forEach((img) => URL.revokeObjectURL(img.url));
  };

  useEffect(() => {
    return () => revokeImages(contentImages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddImages = (files: FileList) => {
    const remaining = MAX_IMAGES - contentImages.length;
    const toAdd = Array.from(files)
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, remaining)
      .map((file) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        url: URL.createObjectURL(file),
      }));

    if (toAdd.length > 0) {
      setContentImages((prev) => [...prev, ...toAdd]);
    }
  };

  const handleRemoveImage = (id: string) => {
    setContentImages((prev) => {
      const target = prev.find((img) => img.id === id);
      if (target) URL.revokeObjectURL(target.url);
      return prev.filter((img) => img.id !== id);
    });
  };

  const resetForm = () => {
    revokeImages(contentImages);
    setName("");
    setPhone("");
    setContentText("");
    setContentImages([]);
    setSelectedTime(null);
    setErrors({});
  };

  const timeSlots = useMemo(
    () => (selectedDate ? getSlotsForDate(selectedDate) : []),
    [selectedDate, getSlotsForDate]
  );

  const daySchedule = useMemo(
    () => (selectedDate ? getDaySchedule(selectedDate) : null),
    [selectedDate, getDaySchedule]
  );

  const handleDateChange = (date: string) => {
    setSelectedDate(date);
    setSelectedTime(null);
    setErrors((e) => ({ ...e, time: undefined }));
  };

  const handleSubmit = () => {
    const newErrors: typeof errors = {};

    if (!selectedTime) newErrors.time = "请选择预约时段";
    if (!name.trim()) newErrors.name = "请填写姓名";
    if (!phone.trim()) newErrors.phone = "请填写手机号";
    else if (!validatePhone(phone)) newErrors.phone = "请输入正确的11位手机号";
    if (!contentText.trim()) newErrors.contentText = "请填写美甲文字描述";

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }
    try {
      saveBooking({
        id: Date.now().toString(),
        name,
        phone,
        contentText,
        selectedDate,
        selectedTime: selectedTime!,
        createdAt: new Date().toISOString(),
        status: "待确认",
      });
    
      resetForm();
      setShowSuccessModal(true);
    
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "预约失败"
      );
    }
  };
  return (
    <div className="min-h-dvh pb-32">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-md bg-cream/80 border-b border-pink-light/40">
        <div className="max-w-md mx-auto px-5 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-pink to-pink-accent flex items-center justify-center text-white shadow-soft">
              <SparkleIcon />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-wide text-warm-text">
                莉莉青舍
              </h1>
              <p className="text-[11px] text-warm-muted">美甲预约系统</p>
            </div>
          </div>
          <a
            href="/admin"
            className="text-[11px] px-2.5 py-1 rounded-pill bg-pink-light/80 text-pink-dark"
          >
            后台
          </a>
        </div>
      </header>

      <main className="max-w-md mx-auto px-5 pt-5 space-y-6">
        {/* Hero card */}
        <div className="relative overflow-hidden rounded-card bg-gradient-to-br from-pink-light via-white to-cream-dark p-5 shadow-card">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-pink/20 blur-2xl" />
          <div className="absolute -left-2 -bottom-2 w-16 h-16 rounded-full bg-pink-accent/10 blur-xl" />
          <p className="relative text-sm text-warm-muted leading-relaxed">
            欢迎来到莉莉青舍 ✨
            <br />
            请选择方便的时间进行预约
          </p>
        </div>

        <ScheduleCard />

        {/* Date */}
        <section className="bg-white/60 backdrop-blur-sm rounded-card shadow-card p-4">
          <SectionTitle icon="📅" title="选择日期" />
          <DateScroller
            days={days}
            selected={selectedDate}
            onSelect={handleDateChange}
          />
        </section>

        {/* Time + Form */}
        <section className="bg-white/60 backdrop-blur-sm rounded-card shadow-card p-4">
          <SectionTitle icon="⏰" title="选择时段" />
          {!daySchedule?.isClosed ? (
            <p className="text-[11px] text-warm-light mb-3 ml-1">
              当日规则：{daySchedule?.description}
            </p>
          ) : null}
          <TimeSlotGrid
            slots={timeSlots}
            selected={selectedTime}
            scheduleDescription={daySchedule?.description ?? ""}
            isClosed={daySchedule?.isClosed ?? false}
            bookedTimes={bookedTimes}
            onSelect={(id) => {
              setSelectedTime(id);
              setErrors((e) => ({ ...e, time: undefined }));
            }}
          />
          {errors.time && (
            <p className="text-pink-dark text-xs mt-2 ml-1">{errors.time}</p>
          )}

          <BookingFormFields
            name={name}
            phone={phone}
            contentText={contentText}
            contentImages={contentImages}
            errors={errors}
            onNameChange={(value) => {
              setName(value);
              setErrors((err) => ({ ...err, name: undefined }));
            }}
            onPhoneChange={(value) => {
              setPhone(value);
              setErrors((err) => ({ ...err, phone: undefined }));
            }}
            onContentTextChange={(value) => {
              setContentText(value);
              setErrors((err) => ({ ...err, contentText: undefined }));
            }}
            onAddImages={handleAddImages}
            onRemoveImage={handleRemoveImage}
          />
        </section>
      </main>

      {/* Fixed CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-20">
        <div className="max-w-md mx-auto px-5 pb-6 pt-3 bg-gradient-to-t from-cream via-cream/95 to-transparent">
          <button
            type="button"
            onClick={handleSubmit}
            className="w-full py-4 rounded-pill bg-gradient-to-r from-pink to-pink-accent text-white text-base font-semibold shadow-float active:scale-[0.98] transition-transform flex items-center justify-center gap-2"
          >
            <span>确认预约</span>
            <span>✨</span>
          </button>
        </div>
      </div>

      <SuccessModal
        open={showSuccessModal}
        onClose={() => setShowSuccessModal(false)}
      />
    </div>
  );
}
