/**
 * The founder-led tutoring pilot: a session with Ian Joiner, offered beside one proof exercise.
 *
 * The site is static, so it never receives an inquiry itself. The offer links to Ian's own
 * destination, configured at build time:
 *
 * - NEXT_PUBLIC_TUTORING_BOOKING_URL: a booking page where the student picks a time ("Book a
 *   session with Ian"), for example a Cal.com or Calendly event.
 * - NEXT_PUBLIC_TUTORING_REQUEST_URL: an inquiry Ian answers himself ("Request a session with
 *   Ian"), for example a mailto: link or a form.
 *
 * Either is a URL template. {subject}, {topic}, {minutes} and {note} are replaced, URL-encoded,
 * with what the student chose, so the subject and length reach Ian without being typed twice.
 * A template must carry {minutes} and {subject} or {topic}, and be https: or mailto:; anything
 * else counts as not configured. With no destination the offer is not shown. The booking URL
 * wins when both are set. See docs/tutoring.md.
 *
 * The copy is English only. Sessions are in English, and the one placement (the Lean exercises
 * of a formal module) is a page generated in English only.
 */

export const SESSION_LENGTHS = [
  { minutes: 30, dollars: 40 },
  { minutes: 60, dollars: 80 },
] as const;
export type Minutes = (typeof SESSION_LENGTHS)[number]["minutes"];

export interface TutoringDestination {
  /** "book": the student confirms a time there. "request": Ian follows up. */
  kind: "book" | "request";
  template: string;
}

export interface SessionChoice {
  /** What Ian sees, e.g. "Math — proof writing". */
  subject: string;
  /** A slug for the same, for event names and URL paths, e.g. "math-proof-writing". */
  topic: string;
  minutes: Minutes;
  /** The student's own words, optional. */
  note: string;
}

const PLACEHOLDER = /\{(subject|topic|minutes|note)\}/g;
/** Long enough for "which problem, and where you got stuck"; short enough for any mailto: link. */
export const NOTE_MAX = 500;

export function validTemplate(template: string): boolean {
  if (!template.includes("{minutes}") || !(template.includes("{subject}") || template.includes("{topic}"))) return false;
  try {
    const url = new URL(template.replace(PLACEHOLDER, "x"));
    return url.protocol === "https:" || url.protocol === "mailto:";
  } catch {
    return false;
  }
}

/** The configured destination, or null: then the offer is hidden. */
export function tutoringDestination(env: { book?: string; request?: string } = {
  book: process.env.NEXT_PUBLIC_TUTORING_BOOKING_URL,
  request: process.env.NEXT_PUBLIC_TUTORING_REQUEST_URL,
}): TutoringDestination | null {
  for (const kind of ["book", "request"] as const) {
    const template = env[kind]?.trim();
    if (!template) continue;
    if (validTemplate(template)) return { kind, template };
    console.warn(`[tutoring] The ${kind === "book" ? "booking" : "request"} URL is not a usable template (https: or mailto:, with {minutes} and {subject} or {topic}); it is ignored.`);
  }
  return null;
}

/** Where the button goes: the template with the student's choice filled in. */
export function sessionHref(d: TutoringDestination, s: SessionChoice): string {
  const values: Record<string, string> = { subject: s.subject, topic: s.topic, minutes: String(s.minutes), note: s.note.trim().slice(0, NOTE_MAX) };
  return d.template.replace(PLACEHOLDER, (_, key: string) => encodeURIComponent(values[key]!));
}

/** For a mailto: request, the address to write to if no email app opens. */
export function mailtoAddress(d: TutoringDestination): string | null {
  if (!d.template.startsWith("mailto:")) return null;
  const address = decodeURIComponent(d.template.slice("mailto:".length).split("?")[0] ?? "");
  return address.includes("@") ? address : null;
}

export const dollars = (minutes: Minutes) => SESSION_LENGTHS.find((l) => l.minutes === minutes)!.dollars;

/** The math offer: proof writing, the half-hour featured. */
export const PROOF_WRITING = {
  subject: "Math — proof writing",
  topic: "math-proof-writing",
  featured: 30 as Minutes,
  summary: "Stuck on a proof? Work through it with Ian Joiner, $40 for 30 minutes",
  lead: "Stuck on a proof? Bring your argument or Lean exercise and work through it with Ian Joiner, PhD in mathematics. $40 for 30 minutes or $80 for an hour.",
  notePrompt: "Which problem are you working on, and where did you get stuck?",
} as const;

/**
 * The exercises that carry the offer: one, for the pilot. Proving that the first n odd numbers
 * add up to n² by induction can be written by hand (the lesson "Proof techniques" does it) and
 * in Lean (this exercise).
 */
export const TUTORING_EXERCISES: ReadonlySet<string> = new Set(["LumenaryExercises.ProofTechniques.sum_odd"]);
