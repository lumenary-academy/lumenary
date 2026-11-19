# Courses: Lumenary CS and Lumenary Lingua

Lumenary Math has its own knowledge graph, Lean library and experiments (see the [authoring guide](authoring-guide.md)). The other subjects are **courses**: a syllabus and a directory per lesson, rendered by the same lesson components. This guide is the contract for writing one.

| Course | Directory | Taught in | Pages |
| --- | --- | --- | --- |
| Lumenary CS | `content/cs/` | English | `/en/cs/`, `/en/cs/<slug>/` |
| Spanish, taught in English | `content/lingua/spanish/` | English | `/en/lingua/spanish/`, `/en/lingua/spanish/<slug>/` |
| Inglés, enseñado en español | `content/lingua/ingles/` | Spanish | `/es/lingua/ingles/`, `/es/lingua/ingles/<slug>/` |

A course's pages are generated only in the locale it is taught in; links from other locales point there (`src/lib/href.ts`, from `src/lib/generated/content-locales.json`). `/[locale]/lingua/` lists the Lingua courses in every locale.

## Files

```
content/<course>/course.json              the syllabus (CourseFile in src/lib/schema.ts)
content/<course>/lessons/<slug>/lesson.mdx
content/<course>/lessons/<slug>/exercises.json
```

`course.json` lists the levels in order, each with its lessons in order; a lesson's level and position come from there. Every lesson directory must be in the syllabus and every syllabus slug must have a directory.

### lesson.mdx frontmatter

```yaml
---
title: Hash tables
subtitle: Constant-time lookup on average, and what it costs to get it.
minutes: 50
objectives:
  - Explain how a hash function maps keys to buckets
  - Implement a hash table with separate chaining
prerequisites: [lists-stacks-queues]      # earlier lessons of the same course (optional)
related: [math.prob.expectation]          # Lumenary Math topic ids (optional; must exist in content/math/graph/graph.json)
references:                               # further reading, by link (optional)
  - title: "Python's dict implementation notes"
    url: https://github.com/python/cpython/blob/main/Objects/dictnotes.txt
    note: How CPython's dictionaries actually work.
---
```

Fields: `title`, `subtitle`, `minutes` (positive integer), `objectives` (at least one), and optionally `prerequisites`, `related`, `references` (each `title`, optional `author`, `year`, `url` (https), `note`). Quote YAML strings that contain `:` or start with a special character.

### lesson.mdx body

The body is a sequence of sections:

```mdx
<Section id="motivation" kind="motivation" title="Why hashing?">

Prose in Markdown. Inline maths with $O(n \log n)$; display maths with $$ … $$.

</Section>
```

Leave a blank line after every opening tag and before every closing tag. Section `id`s are unique within the lesson; `kind` is one of:

- CS: `motivation`, `intuition`, `definitions`, `examples`, `human` (shown as "Explanation"), `computation`, `visualization`, `misconceptions`, `history`, `reading`, `exercises`
- Lingua adds: `vocabulary`, `grammar`, `dialogue`, `pronunciation`, `culture`

Every lesson has at least three sections and exactly one `<Exercises/>`, inside a section of kind `exercises`, normally the last.

Components (anything else fails the tests):

| Component | Use |
| --- | --- |
| `<Definition term="…">` | a definition |
| `<Theorem name="…">`, `<Proof>` | a precise claim and its argument (CS: correctness, complexity bounds) |
| `<Example title="…">` | a worked example |
| `<Misconception>` | a common mistake and its correction |
| `<Note>` | an aside |
| `<Analogy>` | an everyday analogy, clearly marked as one |
| `<Figure caption="…">` | an inline SVG figure (`<svg viewBox=… role="img" aria-label=…>`; use `currentColor`, never fixed black or white, so dark mode works) |
| `<Reflection title="…">` | an optional, collapsed Christian reflection; at most one per lesson, never preachy, never required to follow the lesson |
| `<LessonLink slug="…">text</LessonLink>` | a link to another lesson of the same course |
| `<TopicLink id="math.…">text</TopicLink>` | a link to a Lumenary Math topic |
| `<Say lang="es">texto</Say>` | Lingua: a word or phrase the browser can read aloud; plain text only inside, `lang` a BCP 47 tag (`es`, `en`, `es-MX`, `en-GB`) |
| `<Exercises/>` | where the lesson's exercises appear |

Plain Markdown is encouraged: headings (`###`, `####`; `##` is the section title), lists, tables (GFM), **bold**, *italics*, `inline code`, blockquotes, links.

### Code

Fenced code blocks are highlighted (python, bash, sql, javascript, typescript, c, cpp, go, rust, java, json, yaml, html, css, diff; anything else is shown plain, e.g. `text`). A Python block whose fence reads ```` ```python run ```` gets **Run** and **Edit** buttons and runs in the learner's browser (Pyodide: CPython 3.13 with numpy, in a sandboxed worker).

Every `python run` block is executed by `npm run verify:courses` in a fresh interpreter and must finish without an exception in under a minute. So a runnable block must be self-contained and must not use `input()`, threads, processes, sockets, the network, files outside a temporary directory, or randomness without a fixed seed when it prints results. Top-level `await` is allowed (the browser supports it). Write Python that also runs on CPython 3.10 (no `match` on 3.10-incompatible syntax, no PEP 695 generics). Use plain ```` ```python ```` (not runnable) for code that cannot meet these rules.

### MDX pitfalls

- Outside code, `{` `}` and `<` start JSX: write `\{`, `\}` and `&lt;`, or put the text in backticks.
- Outside code, `$` starts maths. Never write a bare dollar sign for money: write "USD 40" or `\$40`.
- Don't indent Markdown by four spaces inside components; it becomes a code block.

### exercises.json

```json
{
  "lesson": "<slug>",
  "exercises": [ … ]
}
```

At least 4 exercises per CS lesson and 6 per Lingua lesson, with unique kebab-case `id`s. Every exercise has `id`, `type`, `prompt` (Markdown), `difficulty` (`warm-up`, `core`, `stretch`), `mode` (`H` for ideas, `C` for code), `hints` (at least one, progressive) and `solution` (Markdown, a worked solution, not just the answer). By type:

- `choice`: `options` (`id`, `label`, `correct`, `feedback`: say *why* each option is right or wrong), optional `multiple: true`.
- `integer`: `answer` (an integer) and optional `feedback` (`match`: a wrong answer as a string, `message`).
- `set`: `answer` (strings; order and repeats ignored).
- `text`: `answers` (every accepted answer: list the reasonable variants, e.g. with and without contractions), `lang` (the answer's language, required in Lingua), optional `feedback`. Case, spacing, surrounding punctuation and ¿¡ are ignored; accents are not, and a learner whose answer differs only in accents is told so.
- `python`: `starter` (what the learner edits), `tests` (Python with `assert`s, run after their code in the same namespace), `reference` (a correct solution). `npm run verify:courses` checks that the reference passes the tests and that the starter does not. The reference is never sent to the browser; the `solution` should still explain the approach and may show code.

Feedback never shames: "Not yet — …" rather than "Wrong".

## Writing

- **Original text only.** Write every explanation, example, dialogue, story and exercise yourself. Never copy or closely paraphrase textbooks, courses, interview-question sites, documentation, song lyrics, film scripts, or modern literature. Classic problems and well-known algorithms may be taught, in your own words and your own examples. Literary passages may be quoted only from works in the public domain (authors who died more than about a century ago, e.g. Cervantes, Bécquer, Austen, Dickens, Shakespeare), short, and credited.
- **Link, don't retell.** Papers, lab and company engineering blogs, official documentation, standards and open courses are linked in `references` or in the prose. Linking is always fine; copying is not.
- **Honest and current.** Say what is known, what is contested and what changes fast. For fast-moving fields (the AI frontier), give the durable ideas and date anything time-sensitive ("as of 2026"). Do not invent papers, numbers, quotations or URLs; if unsure of a URL, link the organisation's main page or leave it out.
- **No hype, no fear.** No marketing language, no score or salary promises.
- **For learners everywhere.** Examples from many countries and cultures; names from many languages.

### Lumenary CS

Each lesson goes from the idea to working code to the professional view: motivation, intuition, precise definitions, worked examples with runnable code, complexity and correctness where they apply, misconceptions, how it is done in industry or research (with links), and exercises that include at least one or two Python exercises where code makes sense. Higher levels are written for strong university students and working engineers; the frontier level should read like a briefing from someone who works at an AI lab, linking the primary papers and the labs' own documentation.

### Lumenary Lingua

Each lesson has: vocabulary (a table: the word, its translation, a note on gender, register or usage; 20–30 items at A1–B1), grammar explained in the learner's language with clear tables and many examples, an original dialogue (A1–B1) or text (B2–C2) in the target language with a translation or glossary, pronunciation notes, a culture note, and at least 6 exercises mixing `choice` and `text` (translate, fill the gap, conjugate). Use `<Say>` for vocabulary and key phrases. Levels follow the CEFR's can-do descriptions ([Council of Europe](https://www.coe.int/en/web/common-european-framework-reference-languages)); write your own wording of them. At A1–A2 keep target-language passages short and fully glossed; at C1–C2 most of the lesson may be in the target language. Point out differences between regional varieties (Spain and Latin America; British and American English) without ranking them.

## Checking

```bash
node scripts/gen-content-locales.mjs                       # after adding a course
npx vitest run tests/courses.test.ts                        # syllabus, frontmatter, exercises, components, MDX
npm run verify:courses -- --only cs/hash-tables             # run the lesson's code; updates the report
npm run dev                                                 # then open /en/cs/hash-tables/
```
