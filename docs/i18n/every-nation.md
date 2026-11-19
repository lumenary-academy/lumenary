# Lumenary Every Nation

**Lumenary Every Nation** ([github.com/lumenary-academy/lumenary-every-nation](https://github.com/lumenary-academy/lumenary-every-nation)) translates Lumenary Scientia into the world's languages with capacity that volunteers donate, and with corrections and reviews from people who speak those languages. This page is the main repository's side of it: what is translated, how jobs are generated, how translations are stored and shown, and how corrections reach language experts. The [translation workflow](translation-workflow.md) still governs statuses and review.

## English is the source

English is canonical. Every translation is made from the English text and records the English it was made from (`sourceHash`). When the English changes, the translation becomes **stale**: the page says so, and a new job appears to bring it up to date. A translation never changes the English, and a correction to the English is made in English first.

## Volunteers donate AI capacity, never API keys

Volunteers run the `every-nation` tool on their own computer. It uses the official Claude Code CLI, logged in with their own Claude Pro or Max subscription, translates one job at a time, checks the result against the English, and opens a pull request from their own GitHub account. Nothing is pooled or relayed: no shared accounts, no central server, no collected credentials. The tool refuses to run with an Anthropic API key (API usage is billed per token and a whole curriculum is expensive) and stops cleanly when the volunteer's usage limit is reached. Its README has the details and the terms volunteers must follow.

## Jobs are generated from English automatically

`node scripts/translation-jobs.mjs` lists every unit whose translation is missing or stale, for every non-English site locale:

| Kind | English source | Translation |
| --- | --- | --- |
| `math-lesson` | `content/math/lessons/<slug>/en.mdx`, `exercises.json` | `<locale>.mdx`, `exercises.<locale>.json` |
| `course` | `content/<course>/course.json` | `course.<locale>.json` (title, subtitle, description, `ui`, level titles and summaries) |
| `course-lesson` | `content/<course>/lessons/<slug>/lesson.mdx`, `exercises.json` | `lesson.<locale>.mdx`, `exercises.<locale>.json` |
| `ui` | `src/i18n/messages/en.json` | missing keys in `<locale>.json` |
| `glossary` | `content/registry/glossaries/en.json` | missing terms in `<locale>.json` |

`<course>` is any Scientia course: `cs`, `ee`, `robotics`, `statistics`, `chemistry`, `me`, `materials`, and the courses nested in Lumenary CS (`cs/languages/<id>`, `cs/electives/<id>`). Lumenary Lingua's courses are not translated: they are built in their own repository, each for one pair of languages.

A lesson's `sourceHash` is the first 12 hex characters of the SHA-256 of the English body without its frontmatter (as the site computes staleness); a course page's is that of the whole `course.json`. Jobs come in order of priority: interface strings and glossaries, then course pages, then the first levels of every subject before later ones.

On every push to `main` that touches content or interface strings, `.github/workflows/translation-jobs.yml` regenerates the board and publishes it as `jobs.json` on the `translation-jobs` branch. Volunteers' tools read it, so new English content becomes translation jobs without anyone having to ask.

## How a translation is stored and shown

- A translated lesson keeps the original's frontmatter with its human-readable fields translated (title, subtitle, objectives) and adds a `translation` block: `status` (`machine-draft` for AI drafts), `source: en`, `sourceHash`, `translatedAt`, `reviewers`. Slugs, prerequisites, related topics, references' URLs, code, maths, component names and exercise data are unchanged; `tests/translations.test.ts` checks that code blocks, components and exercises' ids, types and answers match the English exactly.
- Code is run once, in English: a translated lesson's code is identical, so the English lesson's code report applies to it.
- The site generates a translated course page or lesson only where the translation exists (`src/lib/courses.ts`: `courseLocalesOf`, `lessonLocalesOf`); links from a translated page to an untranslated lesson go to the English one (`src/lib/href.ts`, from `courseTranslations` in the generated index).
- Every translated page shows its status (a machine draft, or out of date) and a **Suggest a correction** link (`src/components/lesson/TranslationNotice.tsx`).

## Corrections go to language experts

"Suggest a correction" opens an issue form in lumenary-every-nation, pre-filled with the language and the page. The issue is labelled with its language and the language's experts are mentioned. An expert accepts it (`/accept`) or explains why not (`/reject`); accepted corrections become jobs for volunteers' tools, and experts may also fix things themselves in a pull request.

Pull requests to this repository that change translations are routed the same way: `.github/workflows/translation-review.yml` comments with the experts for each language changed, read from lumenary-every-nation's `experts.json`. Only a named expert's review can raise a translation's status (to `human-reviewed`, and with subject review to `math-reviewed`), as the [translation workflow](translation-workflow.md) describes.

## Becoming a language expert

Anyone who speaks a language well can apply through lumenary-every-nation's expert application form: which languages and regions, whether they review language, subject matter or both (mathematics, computing, engineering, the sciences), and their experience. Maintainers add accepted experts to `experts.json`. The project does not verify credentials and will not claim to; reviews are public and attributable, and an expert may withdraw.

## Adding a language

The site's languages are set in `src/i18n/config.ts`. A new language starts with an issue in lumenary-every-nation; volunteers then translate its interface strings and glossary, and maintainers add the locale once those are complete and an expert has reviewed them. From then on, jobs for it appear on the board like any other language's.
