import { EMAIL_PATTERN, NAME_PATTERN, PHONE_PATTERN, isUuid } from "../validation/common.ts";

export const ageGroups = ["under_3", "3_5", "6_8", "9_12", "13_17", "adult"] as const;
export const swimmingLevels = ["complete_beginner", "building_water_confidence", "can_swim_independently", "confident_swimmer", "not_sure"] as const;
export const periods = ["morning", "afternoon", "evening", "flexible"] as const;
export const weekdays = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const;

export type EnquiryInput = {
  swimmerName: string; ageGroup: string; swimmingLevel: string;
  preferredDays: string[]; preferredPeriod: string;
  contactName: string; email: string; phone: string; message: string;
  privacyAcknowledged: boolean; idempotencyKey: string; website: string;
};
export type EnquiryErrors = Partial<Record<keyof EnquiryInput, string>>;

export function validateEnquiry(input: EnquiryInput) {
  const errors: EnquiryErrors = {};
  if (input.swimmerName.length < 1 || input.swimmerName.length > 160 || !NAME_PATTERN.test(input.swimmerName)) errors.swimmerName = "Enter the swimmer's name.";
  if (!ageGroups.includes(input.ageGroup as typeof ageGroups[number])) errors.ageGroup = "Select the swimmer's age group.";
  if (!swimmingLevels.includes(input.swimmingLevel as typeof swimmingLevels[number])) errors.swimmingLevel = "Select the swimmer's current level.";
  if (!input.preferredDays.length || input.preferredDays.length > 7 || input.preferredDays.some(day => !weekdays.includes(day as typeof weekdays[number]))) errors.preferredDays = "Select at least one preferred day.";
  if (input.preferredPeriod && !periods.includes(input.preferredPeriod as typeof periods[number])) errors.preferredPeriod = "Select a preferred time.";
  if (input.contactName.length < 2 || input.contactName.length > 160 || !NAME_PATTERN.test(input.contactName)) errors.contactName = "Enter your name.";
  if (!EMAIL_PATTERN.test(input.email) || input.email.length > 254) errors.email = "Enter a valid email address.";
  if (!PHONE_PATTERN.test(input.phone)) errors.phone = "Enter a valid UK or international phone number.";
  if (input.message.length > 1000) errors.message = "Keep this to 1,000 characters or fewer.";
  if (!input.privacyAcknowledged) errors.privacyAcknowledged = "You must acknowledge the Privacy Policy to continue.";
  if (!isUuid(input.idempotencyKey)) errors.idempotencyKey = "Invalid submission identifier.";
  return errors;
}

export function cleanEnquiry(input: EnquiryInput): EnquiryInput {
  return { ...input, swimmerName: input.swimmerName.trim(), preferredPeriod: input.preferredPeriod || "flexible", contactName: input.contactName.trim(), email: input.email.trim().toLowerCase(), phone: input.phone.trim(), message: input.message.trim(), preferredDays: [...new Set(input.preferredDays)] };
}
