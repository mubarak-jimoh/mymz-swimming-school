"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CalendarDays, Check, Clock, Info, LockKeyhole, Mail, MapPin, Phone, UserRound } from "lucide-react";
import { emptyBookingDetails, validateBookingDetails, type BookingDetails } from "@/lib/booking";
import type { AvailableLessonSlot, BookingCatalog, LessonType } from "@/lib/supabase/database.types";
import { TurnstileWidget } from "@/components/security/turnstile-widget";
import { isMinorDateOfBirth } from "@/lib/validation/common";
import { formatLessonPrice, formatMoney } from "@/lib/pricing";

const labels = ["Lesson", "Date & time", "Swimmer details", "Review"];

export function BookingFlow({ catalog,initialLessonSlug }: { catalog: BookingCatalog;initialLessonSlug?:string }) {
  const [step, setStep] = useState(1);
  const [fallbackLesson, setFallbackLesson] = useState("");
  const [lessonId, setLessonId] = useState(()=>catalog.lessonTypes.find(x=>x.slug===initialLessonSlug)?.id??"");
  const [slotId, setSlotId] = useState("");
  const [details, setDetails] = useState<BookingDetails>(emptyBookingDetails);
  const [errors, setErrors] = useState<Partial<Record<keyof BookingDetails, string>>>({});
  const [submitting,setSubmitting]=useState(false);
  const [bookingError,setBookingError]=useState("");
  const [reservation,setReservation]=useState<{reference:string;amountPence:number;reservationExpiresAt:string;paymentConfigured:boolean}|null>(null);
  const [idempotencyKey,setIdempotencyKey]=useState("");
  const [turnstileToken,setTurnstileToken]=useState("");
  const receiveTurnstile=useCallback((token:string)=>setTurnstileToken(token),[]);

  const lesson = catalog.lessonTypes.find((item) => item.id === lessonId) ?? null;
  const chosenLessonName = lesson?.name ?? fallbackLesson;
  const requiresGuardian = isMinorDateOfBirth(details.dateOfBirth);
  const matchingSlots = useMemo(() => catalog.slots.filter((slot) => slot.lesson_type_id === lessonId), [catalog.slots, lessonId]);
  const slot = matchingSlots.find((item) => item.id === slotId) ?? null;

  function chooseLesson(item: LessonType | string) {
    if (typeof item === "string") { setFallbackLesson(item); setLessonId(""); }
    else { setLessonId(item.id); setFallbackLesson(""); }
    setSlotId("");setIdempotencyKey("");
  }

  function continueFlow() {
    if (step === 1 && chosenLessonName) return setStep(2);
    if (step === 2 && slot) return setStep(3);
    if (step === 3) {
      const nextErrors = validateBookingDetails(details);
      setErrors(nextErrors);
      if (Object.keys(nextErrors).length === 0) setStep(4);
    }
  }
  async function reserve(){if(!slot||!lesson)return;const key=idempotencyKey||crypto.randomUUID();if(!idempotencyKey)setIdempotencyKey(key);setSubmitting(true);setBookingError("");try{const response=await fetch("/api/bookings",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({slotId:slot.id,idempotencyKey:key,website:"",turnstileToken,details})});const data=await response.json() as {error?:string;reference?:string;amountPence?:number;reservationExpiresAt?:string;paymentConfigured?:boolean};if(!response.ok||!data.reference||data.amountPence==null||!data.reservationExpiresAt)throw new Error(data.error??"Reservation failed.");setReservation({reference:data.reference,amountPence:data.amountPence,reservationExpiresAt:data.reservationExpiresAt,paymentConfigured:Boolean(data.paymentConfigured)})}catch(error){setBookingError(error instanceof Error?error.message:"Reservation failed.")}finally{setSubmitting(false)}}

  return <div className="mx-auto mt-12 max-w-5xl overflow-hidden rounded-[2rem] border border-navy/8 bg-white shadow-[0_25px_80px_rgba(6,27,44,.1)]">
    <Progress step={step} />
    <div className="min-h-[34rem] p-6 sm:p-10">
      {step === 1 && <div>
        <StepTitle n="01" title="Choose your lesson" copy="Select the lesson that best fits the swimmer." />
        {catalog.error && <Notice tone="error">{catalog.error}</Notice>}
        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {catalog.lessonTypes.map((item) => {
            const name = typeof item === "string" ? item : item.name;
            const selected = name === chosenLessonName;
            return <button type="button" key={name} onClick={() => chooseLesson(item)} className={`flex min-h-20 items-center justify-between rounded-2xl border p-5 text-left font-bold transition ${selected ? "border-ocean bg-tint text-navy ring-2 ring-ocean/10" : "border-navy/10 text-navy hover:border-ocean/50"}`}>
              <span><span className="block">{name}</span>{typeof item !== "string" && <span className="mt-1 block text-xs font-normal text-slate-500">{item.duration_minutes} minutes · {formatLessonPrice(item)}</span>}</span>
              <SelectionMark selected={selected} />
            </button>;
          })}
        </div>
        {catalog.lessonTypes.length === 0 && !catalog.error && <BookingGuidance />}
      </div>}

      {step === 2 && <div>
        <StepTitle n="02" title="Choose date & time" copy={`Browse genuine availability for ${chosenLessonName}.`} />
        {!catalog.configured ? <SetupState /> : catalog.error ? <EmptyState icon={<Info />} title="Availability could not be loaded" copy="Please try again later or call MYMZ on 07383 488189." /> : matchingSlots.length === 0 ? <EmptyState icon={<CalendarDays />} title="No suitable times showing" copy="There are no online spaces showing for this lesson right now. Send an enquiry and MYMZ can help you explore the next suitable option." /> : <div className="mt-8 grid gap-3 sm:grid-cols-2">
          {matchingSlots.map((item) => <SlotButton key={item.id} slot={item} selected={item.id === slotId} onClick={() => setSlotId(item.id)} />)}
        </div>}
      </div>}

      {step === 3 && <div>
        <StepTitle n="03" title="Swimmer details" copy="We only ask for information needed to arrange and deliver the lesson." />
        <form onSubmit={(event) => { event.preventDefault(); continueFlow(); }} noValidate className="mt-8 grid gap-5 sm:grid-cols-2">
          <Field id="swimmerName" label="Swimmer name" required value={details.swimmerName} error={errors.swimmerName} icon={<UserRound />} onChange={(value) => setDetails({ ...details, swimmerName: value })} />
          <Field id="dateOfBirth" label="Date of birth" required type="date" value={details.dateOfBirth} error={errors.dateOfBirth} onChange={(value) => setDetails({ ...details, dateOfBirth: value })} />
          <Field id="parentGuardianName" label={`Parent / guardian name${requiresGuardian ? "" : " (if applicable)"}`} required={requiresGuardian} value={details.parentGuardianName} error={errors.parentGuardianName} onChange={(value) => setDetails({ ...details, parentGuardianName: value })} />
          <Field id="email" label="Email" required type="email" value={details.email} error={errors.email} icon={<Mail />} onChange={(value) => setDetails({ ...details, email: value })} />
          <Field id="phone" label="Phone" required type="tel" value={details.phone} error={errors.phone} icon={<Phone />} onChange={(value) => setDetails({ ...details, phone: value })} />
          <label className="block" htmlFor="swimmingAbility"><span className="mb-2 block text-sm font-bold text-navy">Swimming ability <span aria-hidden="true" className="text-ocean">*</span></span><select id="swimmingAbility" required aria-invalid={Boolean(errors.swimmingAbility)} aria-describedby={errors.swimmingAbility ? "swimmingAbility-error" : undefined} value={details.swimmingAbility} onChange={(event) => setDetails({ ...details, swimmingAbility: event.target.value })} className={`h-13 w-full rounded-xl border bg-white px-4 text-slate-700 ${errors.swimmingAbility ? "border-red-500" : "border-navy/15"}`}><option value="">Select an option</option><option>Complete beginner</option><option>Some water experience</option><option>Developing swimmer</option><option>Confident swimmer</option></select>{errors.swimmingAbility && <ErrorText id="swimmingAbility-error">{errors.swimmingAbility}</ErrorText>}</label>
          <label className="block sm:col-span-2" htmlFor="relevantNotes"><span className="mb-2 block text-sm font-bold text-navy">Relevant notes <span className="font-normal text-slate-400">(optional)</span></span><textarea id="relevantNotes" rows={4} maxLength={1000} value={details.relevantNotes} onChange={(event) => setDetails({ ...details, relevantNotes: event.target.value })} placeholder="Anything useful for supporting the swimmer" className="w-full rounded-xl border border-navy/15 px-4 py-3 placeholder:text-slate-400" /><span className="mt-1 block text-right text-xs text-slate-400">{details.relevantNotes.length}/1000</span></label>
          <p className="flex items-center gap-2 text-xs text-slate-500 sm:col-span-2"><LockKeyhole className="size-4" />Nothing is stored until you explicitly create the booking.</p>
        </form>
      </div>}

      {step === 4 && (reservation?<Reservation reservation={reservation}/>:<><Review lesson={lesson} fallbackLesson={fallbackLesson} slot={slot} details={details} error={bookingError}/><div className="mt-6"><TurnstileWidget onToken={receiveTurnstile}/></div></>)}
    </div>
    <div className="flex items-center justify-between gap-3 border-t border-navy/8 bg-slate-50 px-6 py-5 sm:px-10">
      <button type="button" onClick={() => setStep((current) => Math.max(1, current - 1))} disabled={step === 1||Boolean(reservation)} className="inline-flex min-h-11 items-center gap-2 rounded-full px-2 text-sm font-bold text-navy disabled:invisible"><ArrowLeft className="size-4" />Back</button>
      {step < 4 ? <button type="button" onClick={continueFlow} disabled={(step === 1 && !chosenLessonName) || (step === 2 && !slot)} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ocean px-6 text-xs font-extrabold tracking-wider text-white transition hover:bg-navy disabled:cursor-not-allowed disabled:opacity-40">CONTINUE<ArrowRight className="size-4" /></button> : !reservation&&<button type="button" onClick={reserve} disabled={submitting||!catalog.bookingEnabled||!lesson?.price_pence} className="inline-flex min-h-12 items-center gap-2 rounded-full bg-ocean px-6 text-xs font-extrabold tracking-wider text-white hover:bg-navy disabled:cursor-not-allowed disabled:opacity-50">{submitting?"RESERVING…":catalog.bookingEnabled?!lesson?.price_pence?"PRICE REQUIRED":"RESERVE MY PLACE":"BOOKING DISABLED"}<LockKeyhole className="size-4" /></button>}
    </div>
  </div>;
}

function Progress({ step }: { step: number }) { return <div className="border-b border-navy/8 px-5 py-6 sm:px-10"><ol className="grid grid-cols-4 gap-2">{labels.map((label, index) => { const n = index + 1, done = n < step, active = n === step; return <li key={label} aria-current={active ? "step" : undefined}><div className={`h-1 rounded-full ${n <= step ? "bg-ocean" : "bg-slate-200"}`} /><div className="mt-3 flex items-center gap-2"><span className={`grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-ocean text-white" : active ? "bg-navy text-white" : "bg-slate-100 text-slate-400"}`}>{done ? <Check className="size-3" /> : n}</span><span className={`hidden text-xs font-bold sm:block ${active ? "text-navy" : "text-slate-400"}`}>{label}</span></div></li>; })}</ol></div>; }
function StepTitle({ n, title, copy }: { n: string; title: string; copy: string }) { return <div><p className="eyebrow">STEP {n}</p><h2 className="display mt-3 text-3xl font-bold text-navy sm:text-4xl">{title}</h2><p className="mt-3 text-slate-600">{copy}</p></div>; }
function SelectionMark({ selected }: { selected: boolean }) { return <span className={`grid size-6 shrink-0 place-items-center rounded-full border ${selected ? "border-ocean bg-ocean text-white" : "border-slate-300"}`}>{selected && <Check className="size-3" />}</span>; }
function SetupState() { return <div className="mt-8 rounded-3xl border border-ocean/20 bg-tint px-6 py-12 text-center"><div className="mx-auto grid size-16 place-items-center rounded-2xl bg-white text-ocean shadow-sm"><CalendarDays /></div><h3 className="display mt-5 text-2xl font-bold text-navy">Let us help you find a lesson</h3><p className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-600">Online times are not available to browse right now. Tell us about the swimmer and MYMZ will help you explore a suitable option.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/enquire" className="inline-flex min-h-11 items-center justify-center rounded-full bg-ocean px-5 text-sm font-bold text-white hover:bg-navy">Find the right lesson</Link><a href="tel:07383488189" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ocean/20 bg-white px-5 text-sm font-bold text-ocean hover:border-ocean"><Phone className="size-4" />Call 07383 488189</a></div></div>; }
function BookingGuidance(){return <div className="mt-8 rounded-3xl bg-navy px-6 py-10 text-center text-white"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white/10 text-aqua"><Info/></span><h3 className="display mt-5 text-2xl font-bold">Not sure where to start?</h3><p className="mx-auto mt-3 max-w-lg text-sm leading-6 text-white/65">Tell MYMZ about the swimmer&apos;s age, confidence, current ability and goals. We&apos;ll help you explore the most suitable route.</p><div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row"><Link href="/enquire" className="inline-flex min-h-12 items-center justify-center rounded-full bg-aqua px-6 text-sm font-bold text-navy hover:bg-white">Find the right lesson</Link><a href="tel:07383488189" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-white/20 px-6 text-sm font-bold text-white hover:border-aqua hover:text-aqua"><Phone className="size-4"/>Call 07383 488189</a></div></div>}
function EmptyState({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) { return <div className="mt-8 rounded-3xl border border-dashed border-navy/15 bg-slate-50 px-6 py-12 text-center"><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-white text-ocean [&>svg]:size-6">{icon}</span><h3 className="display mt-5 text-xl font-bold text-navy">{title}</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{copy}</p></div>; }
function Notice({ children }: { children: ReactNode; tone: "error" }) { return <div role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{children}</div>; }
function SlotButton({ slot, selected, onClick }: { slot: AvailableLessonSlot; selected: boolean; onClick: () => void }) { const start = new Date(slot.start_time); return <button type="button" onClick={onClick} className={`rounded-2xl border p-5 text-left transition ${selected ? "border-ocean bg-tint ring-2 ring-ocean/10" : "border-navy/10 hover:border-ocean/50"}`}><span className="flex justify-between gap-4"><span><strong className="display block text-lg text-navy">{start.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "long" })}</strong><span className="mt-2 flex items-center gap-2 text-sm text-slate-600"><Clock className="size-4 text-ocean" />{start.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span><span className="mt-1 flex items-center gap-2 text-sm text-slate-600"><MapPin className="size-4 text-ocean" />{slot.location_name}</span></span><SelectionMark selected={selected} /></span><span className="mt-4 block text-xs font-bold text-ocean">{slot.spaces_available} {slot.spaces_available === 1 ? "space" : "spaces"} available</span></button>; }
function Field({ id, label, type = "text", required, value, error, icon, onChange }: { id: keyof BookingDetails; label: string; type?: string; required?: boolean; value: string; error?: string; icon?: ReactNode; onChange: (value: string) => void }) { const errorId = `${id}-error`; return <label className="block" htmlFor={id}><span className="mb-2 block text-sm font-bold text-navy">{label} {required && <span aria-hidden="true" className="text-ocean">*</span>}</span><span className="relative block">{icon && <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 [&>svg]:size-4">{icon}</span>}<input id={id} name={id} type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} aria-invalid={Boolean(error)} aria-describedby={error ? errorId : undefined} className={`h-13 w-full rounded-xl border ${error ? "border-red-500" : "border-navy/15"} ${icon ? "pl-11" : "pl-4"} pr-4`} /></span>{error && <ErrorText id={errorId}>{error}</ErrorText>}</label>; }
function ErrorText({ id, children }: { id: string; children: ReactNode }) { return <span id={id} role="alert" className="mt-1 block text-sm text-red-700">{children}</span>; }
function Review({ lesson, fallbackLesson, slot, details,error }: { lesson: LessonType | null; fallbackLesson: string; slot: AvailableLessonSlot | null; details: BookingDetails;error:string }) { return <div><StepTitle n="04" title="Review your booking" copy="Check the details below. This is a review—not yet a confirmed booking." /><dl className="mt-8 divide-y divide-navy/8 overflow-hidden rounded-2xl border border-navy/10">{[["Lesson", lesson?.name ?? fallbackLesson],["Swimmer", details.swimmerName],["Date", slot ? new Date(slot.start_time).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }) : "Not selected"],["Time", slot ? new Date(slot.start_time).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) : "Not selected"],["Location", slot?.location_name ?? "Not selected"],["Duration", lesson ? `${lesson.duration_minutes} minutes` : "To be confirmed"],["Price", lesson ? formatLessonPrice(lesson) : "Contact us"]].map(([term, value]) => <div key={term} className="grid gap-1 px-5 py-4 sm:grid-cols-[10rem_1fr]"><dt className="text-sm font-bold text-slate-500">{term}</dt><dd className="font-semibold text-navy">{value}</dd></div>)}</dl>{error&&<p role="alert" className="mt-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</p>}<div className="mt-6 flex gap-3 rounded-2xl bg-cream p-5 text-sm leading-6 text-slate-600"><Info className="mt-0.5 size-5 shrink-0 text-ocean" /><p>Before reserving a place, we recheck the lesson&apos;s availability and current price. A reservation remains pending until the booking process is completed.</p></div></div>; }
function Reservation({reservation}:{reservation:{reference:string;amountPence:number;reservationExpiresAt:string;paymentConfigured:boolean}}){return <div className="py-5 text-center"><span className="mx-auto grid size-16 place-items-center rounded-full bg-aqua/20 text-ocean"><Check className="size-7"/></span><p className="eyebrow mt-6">TEMPORARY RESERVATION</p><h2 className="display mt-3 text-4xl font-bold text-navy">Your place is temporarily reserved.</h2><p className="mt-3 text-slate-600">Reference <strong className="text-navy">{reservation.reference}</strong> · {formatMoney(reservation.amountPence)}</p><div className="mx-auto mt-6 max-w-md rounded-2xl bg-navy p-5 text-white"><p className="text-sm text-white/60">Time remaining</p><Countdown expires={reservation.reservationExpiresAt}/><p className="mt-1 text-xs text-white/45">Until {new Date(reservation.reservationExpiresAt).toLocaleTimeString("en-GB",{hour:"2-digit",minute:"2-digit"})}</p></div><p className="mx-auto mt-6 max-w-lg text-sm leading-6 text-slate-500">{reservation.paymentConfigured?"Continue to the payment step when it becomes available. Your booking is not confirmed or paid until payment succeeds.":"Your reservation is pending and is not yet a confirmed or paid booking. Please call MYMZ on 07383 488189 and quote your reference for help."}</p></div>}
function Countdown({expires}:{expires:string}){const [seconds,setSeconds]=useState(()=>Math.max(0,Math.floor((new Date(expires).getTime()-Date.now())/1000)));useEffect(()=>{const timer=setInterval(()=>setSeconds(Math.max(0,Math.floor((new Date(expires).getTime()-Date.now())/1000))),1000);return()=>clearInterval(timer)},[expires]);if(seconds<=0)return <p className="display mt-1 text-2xl font-bold text-aqua">Reservation expired</p>;return <p className="display mt-1 text-3xl font-bold">{String(Math.floor(seconds/60)).padStart(2,"0")}:{String(seconds%60).padStart(2,"0")}</p>}
