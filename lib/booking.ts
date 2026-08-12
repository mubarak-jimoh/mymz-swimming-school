import type { AvailableLessonSlot, LessonType } from "./supabase/database.types";
import { EMAIL_PATTERN, NAME_PATTERN, PHONE_PATTERN, isMinorDateOfBirth, isPastDate } from "./validation/common.ts";

export type BookingDetails = {
  swimmerName: string;
  dateOfBirth: string;
  parentGuardianName: string;
  email: string;
  phone: string;
  swimmingAbility: string;
  relevantNotes: string;
};

export type BookingDraft = { lesson: LessonType | null; slot: AvailableLessonSlot | null; details: BookingDetails };

export const emptyBookingDetails: BookingDetails = {
  swimmerName: "", dateOfBirth: "", parentGuardianName: "", email: "", phone: "", swimmingAbility: "", relevantNotes: "",
};

export function validateBookingDetails(details: BookingDetails) {
  const errors: Partial<Record<keyof BookingDetails, string>> = {};
  const swimmerName = details.swimmerName.trim();
  const guardian = details.parentGuardianName.trim();
  if (swimmerName.length < 2 || swimmerName.length > 160 || !NAME_PATTERN.test(swimmerName)) errors.swimmerName = "Enter the swimmer's full name.";
  if (!isPastDate(details.dateOfBirth)) errors.dateOfBirth = "Enter a valid date of birth in the past.";
  if (isMinorDateOfBirth(details.dateOfBirth) && (guardian.length < 2 || guardian.length > 160 || !NAME_PATTERN.test(guardian))) errors.parentGuardianName = "Enter the parent or guardian's name.";
  if (!EMAIL_PATTERN.test(details.email.trim()) || details.email.trim().length > 254) errors.email = "Enter a valid email address.";
  if (!PHONE_PATTERN.test(details.phone.trim())) errors.phone = "Enter a valid phone number.";
  if (!details.swimmingAbility || details.swimmingAbility.length > 120) errors.swimmingAbility = "Select the swimmer's current ability.";
  if (details.relevantNotes.length > 1000) errors.relevantNotes = "Notes must be 1,000 characters or fewer.";
  return errors;
}
