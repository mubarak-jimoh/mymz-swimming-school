import type { LessonType, PriceUnit } from "@/lib/supabase/database.types";

export const PRICE_UNITS: ReadonlyArray<{ value: PriceUnit; adminLabel: string; publicLabel: string }> = [
  { value: "lesson", adminLabel: "Per lesson", publicLabel: "lesson" },
  { value: "swimmer", adminLabel: "Per swimmer", publicLabel: "swimmer" },
  { value: "block", adminLabel: "Per block", publicLabel: "block" },
  { value: "term", adminLabel: "Per term", publicLabel: "term" },
  { value: "per_month", adminLabel: "Per month", publicLabel: "month" },
];

export function isPriceUnit(value: string): value is PriceUnit {
  return PRICE_UNITS.some(unit => unit.value === value);
}

export function formatMoney(pence: number, currency = "GBP"): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency,
    minimumFractionDigits: pence % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(pence / 100);
}

export function formatLessonPrice(
  lesson: Pick<LessonType, "price_pence" | "price_unit" | "price_from" | "currency">,
): string {
  if (!lesson.price_pence) return "Contact us";
  const unit = PRICE_UNITS.find(option => option.value === lesson.price_unit)?.publicLabel ?? lesson.price_unit;
  return `${lesson.price_from ? "From " : ""}${formatMoney(lesson.price_pence, lesson.currency)} / ${unit}`;
}
