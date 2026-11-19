# Tutoring pilot: a session with Ian

One exercise offers a paid session with Ian Joiner: the Lean exercise `sum_odd` ("the
first n odd numbers add up to n²", by induction) on the Proof techniques formal page,
`/en/formal/ProofTechniques/`. The same theorem is proved by hand in the lesson "Proof
techniques". The offer is a closed line under the exercise's "Show the compiled solution"
control, so the exercise, its hints and its solution stay free and visible. It is there before
the learner tries anything.

Opened, it shows both lengths and prices: 30 minutes for $40 (selected) and 1 hour for $80. It
asks the optional question "Which problem are you working on, and where did you get stuck?" and
gives one button that goes to Ian's destination.

The code is in `src/lib/tutoring.ts` and `src/components/tutoring/TutoringOffer.tsx`, and the
tests are in `tests/tutoring.test.ts`. Lumenary Prep has the same mechanism, for its EA
practice-exam results.

## Configuration (build time)

The site is static, so it never receives an inquiry. Set one of these on the Vercel project and
rebuild:

| Variable | Button | Beside it |
| --- | --- | --- |
| `NEXT_PUBLIC_TUTORING_BOOKING_URL` | Book a session with Ian · $40 | You choose a time and pay on Ian's booking page. |
| `NEXT_PUBLIC_TUTORING_REQUEST_URL` | Request a session with Ian · $40 | Ian will reply by email to arrange a time and payment. |

If both are set, the booking URL wins. If neither is set, or the value is not usable, the offer
is not rendered at all. A usable value is an `https:` or `mailto:` URL containing `{minutes}` and
either `{subject}` or `{topic}`. An unusable value is logged at build time with a `[tutoring]`
line.

Each is a template. These placeholders are filled in, URL-encoded, when the learner clicks:

- `{subject}`: `Math — proof writing`
- `{topic}`: `math-proof-writing`
- `{minutes}`: `30` or `60`
- `{note}`: the learner's answer to the optional question, at most 500 characters, possibly empty

For example, with four Cal.com event types (`math-proof-writing-30` at $40,
`math-proof-writing-60` at $80, and the EA pair from Lumenary Prep), each with a "Notes" booking
question and Stripe payment:

    https://cal.com/<ian>/{topic}-{minutes}?notes={note}&utm_source=lumenary-academy

Or a prefilled email that Ian answers:

    mailto:<ian's address>?subject=Tutoring%20request%3A%20{subject}%2C%20{minutes}%20minutes&body={note}

## Counting

The site has no analytics and records nothing, so clicks are not counted. Inquiries arrive in
Ian's inbox, and bookings and payments in the booking tool. With one event type per subject and
length, the tool's bookings list (or its paid-bookings filter) counts each subject separately.
The `utm_source` in the template tells the two sites apart where the tool keeps it.
