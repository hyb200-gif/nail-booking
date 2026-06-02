export const BOOKING_STORAGE_KEY = "nail-booking-records";

export interface BookingRecord {
  id: string;
  name: string;
  phone: string;
  contentText: string;
  selectedDate: string;
  selectedTime: string;
  createdAt: string;
  status: "待确认" | "已确认" | "已完成" | "已取消";
}

export function loadBookings(): BookingRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(BOOKING_STORAGE_KEY);

    if (!raw) return [];

    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveBooking(
    booking: BookingRecord
  ): void {
    console.log("saveBooking执行了");
  console.log("当前预约", loadBookings());
  console.log("本次预约", booking);

    const current = loadBookings();
  
    const conflict = current.find(
      item =>
        item.selectedDate === booking.selectedDate &&
        item.selectedTime === booking.selectedTime
    );
  
    if (conflict) {
      throw new Error("该时间段已被预约");
    }
  
    current.unshift(booking);
  
    localStorage.setItem(
      BOOKING_STORAGE_KEY,
      JSON.stringify(current)
    );
  } 

export function deleteBooking(id: string): void {
  const current = loadBookings();

  const filtered = current.filter(
    (item) => item.id !== id
  );

  localStorage.setItem(
    BOOKING_STORAGE_KEY,
    JSON.stringify(filtered)
  );
}