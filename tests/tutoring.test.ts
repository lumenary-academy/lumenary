/** The tutoring pilot's destination: hidden until configured, and the subject and length carried to Ian. */
import { describe, expect, it, vi } from "vitest";
import { dollars, mailtoAddress, NOTE_MAX, PROOF_WRITING, sessionHref, SESSION_LENGTHS, TUTORING_EXERCISES, tutoringDestination, validTemplate } from "@/lib/tutoring";
import { json } from "./helpers";

const BOOK = "https://cal.example.test/ian/{topic}-{minutes}?notes={note}&subject={subject}";
const MAIL = "mailto:ian@example.test?subject=Tutoring%3A%20{subject}%2C%20{minutes}%20minutes&body={note}";
const choice = (minutes: 30 | 60, note = "") => ({ subject: PROOF_WRITING.subject, topic: PROOF_WRITING.topic, minutes, note });

describe("destination", () => {
  it("is missing, and the offer hidden, when nothing is configured", () => {
    expect(tutoringDestination({})).toBeNull();
    expect(tutoringDestination({ book: "  ", request: "" })).toBeNull();
  });
  it("ignores a template that cannot carry the length and subject, or is not https: or mailto:", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    expect(tutoringDestination({ book: "https://cal.example.test/ian" })).toBeNull();
    expect(tutoringDestination({ book: "http://cal.example.test/{topic}-{minutes}" })).toBeNull();
    expect(tutoringDestination({ request: "javascript:alert({minutes}{subject})" })).toBeNull();
    expect(tutoringDestination({ book: "not a url {minutes} {subject}" })).toBeNull();
    expect(warn).toHaveBeenCalledTimes(4);
    warn.mockRestore();
  });
  it("books when a booking page is configured, and requests otherwise", () => {
    expect(tutoringDestination({ book: BOOK, request: MAIL })).toEqual({ kind: "book", template: BOOK });
    expect(tutoringDestination({ request: MAIL })).toEqual({ kind: "request", template: MAIL });
    expect(validTemplate(BOOK) && validTemplate(MAIL)).toBe(true);
  });
});

describe("what Ian receives", () => {
  const book = tutoringDestination({ book: BOOK })!;
  it("the subject and the chosen length, for both lengths", () => {
    expect(sessionHref(book, choice(30))).toBe("https://cal.example.test/ian/math-proof-writing-30?notes=&subject=Math%20%E2%80%94%20proof%20writing");
    expect(sessionHref(book, choice(60))).toBe("https://cal.example.test/ian/math-proof-writing-60?notes=&subject=Math%20%E2%80%94%20proof%20writing");
    const url = new URL(sessionHref(book, choice(60, "Exercise sum_odd: the succ case & ring")));
    expect(url.searchParams.get("subject")).toBe("Math — proof writing");
    expect(url.searchParams.get("notes")).toBe("Exercise sum_odd: the succ case & ring");
  });
  it("keeps the note to its limit, trimmed", () => {
    const long = sessionHref(book, choice(30, ` ${"x".repeat(NOTE_MAX + 50)} `));
    expect(new URL(long).searchParams.get("notes")).toHaveLength(NOTE_MAX);
  });
  it("a prefilled email for a request, and the address to fall back on", () => {
    const mail = tutoringDestination({ request: MAIL })!;
    expect(sessionHref(mail, choice(30, "Where do I start?"))).toBe(
      "mailto:ian@example.test?subject=Tutoring%3A%20Math%20%E2%80%94%20proof%20writing%2C%2030%20minutes&body=Where%20do%20I%20start%3F",
    );
    expect(mailtoAddress(mail)).toBe("ian@example.test");
    expect(mailtoAddress(book)).toBeNull();
  });
});

describe("the math offer", () => {
  it("features the half-hour and shows both prices", () => {
    expect(PROOF_WRITING.featured).toBe(30);
    expect(SESSION_LENGTHS.map((l) => [l.minutes, l.dollars])).toEqual([[30, 40], [60, 80]]);
    expect(dollars(30)).toBe(40);
    expect(PROOF_WRITING.lead).toContain("$40 for 30 minutes or $80 for an hour");
    expect(PROOF_WRITING.summary).toContain("$40");
  });
  it("sits on a Lean exercise that exists", () => {
    const report = json<{ exercises: { name: string }[] }>("content/verification/lean-report.json");
    const names = new Set(report.exercises.map((e) => e.name));
    for (const name of TUTORING_EXERCISES) expect(names.has(name), name).toBe(true);
    expect(TUTORING_EXERCISES.size).toBe(1);
  });
});
