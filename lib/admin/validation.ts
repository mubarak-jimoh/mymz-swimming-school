import type { BookingStatus, PaymentStatus } from "@/lib/supabase/database.types";

export const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export function parseLocalDateTime(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value)) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function parseCalendarDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const parsed = new Date(`${value}T12:00:00`);
  if (Number.isNaN(parsed.getTime())) return null;
  const [year, month, day] = value.split("-").map(Number);
  return parsed.getFullYear() === year && parsed.getMonth() + 1 === month && parsed.getDate() === day ? parsed : null;
}

const transitions: Record<BookingStatus, readonly BookingStatus[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["completed", "cancelled"],
  cancelled: [],
  completed: [],
};

export function canChangeBookingStatus(
  current: BookingStatus,
  next: BookingStatus,
  payment: PaymentStatus,
): boolean {
  if (current === next) return true;
  if (!transitions[current].includes(next)) return false;
  if (next === "confirmed" && !["paid", "unpaid"].includes(payment)) return false;
  return true;
}

export function allowedBookingStatuses(current: BookingStatus, payment: PaymentStatus): BookingStatus[] {
  return [current, ...transitions[current]].filter((status, index, all) =>
    all.indexOf(status) === index && canChangeBookingStatus(current, status, payment),
  );
}
