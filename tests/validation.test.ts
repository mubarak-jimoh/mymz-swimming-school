import test from "node:test";
import assert from "node:assert/strict";
import { validateBookingDetails } from "../lib/booking.ts";
import { cleanEnquiry, validateEnquiry, type EnquiryInput } from "../lib/enquiries/validation.ts";
import { isMinorDateOfBirth, isPastDate, isStrictIsoDate, isUuid } from "../lib/validation/common.ts";

const adultBooking = { swimmerName: "Amina Example", dateOfBirth: "1990-05-12", parentGuardianName: "", email: "amina@example.org", phone: "+44 7383 488189", swimmingAbility: "Complete beginner", relevantNotes: "" };

test("strict identifiers and calendar dates reject malformed values", () => {
  assert.equal(isUuid("550e8400-e29b-41d4-a716-446655440000"), true);
  assert.equal(isUuid("550e8400-e29b-41d4-a716-44665544000z"), false);
  assert.equal(isStrictIsoDate("2024-02-29"), true);
  assert.equal(isStrictIsoDate("2023-02-29"), false);
  assert.equal(isPastDate("2100-01-01"), false);
});

test("guardian requirement derives from date of birth, not lesson copy", () => {
  assert.equal(isMinorDateOfBirth("2015-01-01"), true);
  assert.equal(validateBookingDetails({ ...adultBooking, dateOfBirth: "2015-01-01" }).parentGuardianName, "Enter the parent or guardian's name.");
  assert.equal(validateBookingDetails(adultBooking).parentGuardianName, undefined);
});

test("booking validation applies runtime limits and contact formats", () => {
  assert.deepEqual(validateBookingDetails(adultBooking), {});
  const errors = validateBookingDetails({ ...adultBooking, swimmerName: "<script>", email: "bad", phone: "12", relevantNotes: "x".repeat(1001) });
  assert.ok(errors.swimmerName);
  assert.ok(errors.email);
  assert.ok(errors.phone);
  assert.ok(errors.relevantNotes);
});

function validEnquiry(): EnquiryInput { return { swimmerName: "Maya Jones", ageGroup: "6_8", swimmingLevel: "building_water_confidence", preferredDays: ["saturday"], preferredPeriod: "morning", contactName: "Alex Jones", email: "ALEX@example.org", phone: "+44 7383 488189", message: "", privacyAcknowledged: true, idempotencyKey: "550e8400-e29b-41d4-a716-446655440000", website: "" }; }

test("enquiry validation accepts a minimal valid, privacy-acknowledged submission", () => {
  assert.deepEqual(validateEnquiry(cleanEnquiry(validEnquiry())), {});
  assert.equal(cleanEnquiry(validEnquiry()).email, "alex@example.org");
});

test("enquiry validation rejects absent consent, unknown options and excessive text", () => {
  const input = validEnquiry();
  input.privacyAcknowledged = false;
  input.preferredDays = ["funday"];
  input.swimmingLevel = "stage_99";
  input.message = "x".repeat(1001);
  const errors = validateEnquiry(input);
  assert.ok(errors.privacyAcknowledged);
  assert.ok(errors.preferredDays);
  assert.ok(errors.swimmingLevel);
  assert.ok(errors.message);
});

test("simplified enquiry accepts each approved age group and defaults optional time to flexible", () => {
  for (const ageGroup of ["under_3", "3_5", "6_8", "9_12", "13_17", "adult"]) {
    assert.deepEqual(validateEnquiry(cleanEnquiry({ ...validEnquiry(), ageGroup, preferredPeriod: "" })), {});
  }
  assert.equal(cleanEnquiry({ ...validEnquiry(), preferredPeriod: "" }).preferredPeriod, "flexible");
});

test("short enquiry accepts only the approved public swimming levels", () => {
  for (const swimmingLevel of ["complete_beginner", "building_water_confidence", "can_swim_independently", "confident_swimmer", "not_sure"]) {
    assert.deepEqual(validateEnquiry({ ...validEnquiry(), swimmingLevel }), {});
  }
  assert.ok(validateEnquiry({ ...validEnquiry(), swimmingLevel: "intermediate" }).swimmingLevel);
});
