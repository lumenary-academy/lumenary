"use client";

import { CalendarClock, ChevronDown, ExternalLink, Mail } from "lucide-react";
import { useId, useState } from "react";
import { dollars, mailtoAddress, NOTE_MAX, sessionHref, SESSION_LENGTHS, type Minutes, type TutoringDestination } from "@/lib/tutoring";

interface Props {
  destination: TutoringDestination;
  subject: string;
  topic: string;
  featured: Minutes;
  summary: string;
  lead: string;
  notePrompt?: string;
}

/**
 * A quiet offer of a session with Ian, closed until the learner opens it. Both lengths and their
 * prices show before anything is sent; the chosen length, the subject and the learner's optional
 * note travel in the link, and nothing else does. The exercise around it stays free.
 */
export function TutoringOffer({ destination, subject, topic, featured, summary, lead, notePrompt }: Props) {
  const [minutes, setMinutes] = useState<Minutes>(featured);
  const [note, setNote] = useState("");
  const id = useId();
  const book = destination.kind === "book";
  const target = sessionHref(destination, { subject, topic, minutes, note });
  const address = mailtoAddress(destination);
  const Icon = book ? CalendarClock : Mail;

  return (
    <details className="group border-t border-line" data-tutoring={topic}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-2.5 text-sm text-muted hover:text-ink [&::-webkit-details-marker]:hidden">
        <Icon size={15} aria-hidden="true" className="shrink-0" />
        <span>{summary}</span>
        <ChevronDown size={15} aria-hidden="true" className="ms-auto shrink-0 transition-transform group-open:rotate-180" />
      </summary>
      <div className="space-y-4 px-4 pb-4 text-sm text-ink-2">
        <p>{lead}</p>
        <fieldset>
          <legend className="mb-2 text-xs font-semibold text-muted">Session length</legend>
          <div className="flex flex-wrap gap-2">
            {SESSION_LENGTHS.map((l) => (
              <label
                key={l.minutes}
                className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-3 py-1.5 has-[:checked]:border-formal has-[:checked]:bg-formal-soft has-[:checked]:text-ink has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-formal"
              >
                <input type="radio" name={`${id}-minutes`} value={l.minutes} checked={minutes === l.minutes} onChange={() => setMinutes(l.minutes)} className="accent-[var(--formal)]" />
                {l.minutes === 60 ? "1 hour" : `${l.minutes} minutes`} · ${l.dollars}
              </label>
            ))}
          </div>
        </fieldset>
        {notePrompt && (
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-muted">
              {notePrompt} <span className="font-normal">(optional)</span>
            </span>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX} rows={3} className="w-full rounded-lg border border-line bg-card px-3 py-2 text-ink" />
          </label>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <a href={target} target={address ? undefined : "_blank"} rel="noopener noreferrer" className="btn btn-sm btn-ghost">
            {book ? "Book a session with Ian" : "Request a session with Ian"} · ${dollars(minutes)}
            {!address && <ExternalLink size={12} aria-hidden="true" />}
          </a>
          <span className="text-xs text-muted">
            {book ? "You choose a time and pay on Ian's booking page." : "Ian will reply by email to arrange a time and payment."}
          </span>
        </div>
        {address && (
          <p className="text-xs text-muted">
            If no email app opens, write to <span className="font-mono">{address}</span> with the subject “{subject}, {minutes} minutes”.
          </p>
        )}
      </div>
    </details>
  );
}
