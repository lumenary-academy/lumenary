# Architecture

## Goals that shaped it

- **Cheap, durable hosting, no lock-in.** The site is a fully static export (`next build` → `out/`). Any static host or CDN works, and nothing needs a server at runtime.
- **No accounts for ordinary learning.** Optional progress tracking lives in the learner's `localStorage` and is off by default.
- **Learner code never runs on a server.** Python runs in a dedicated Web Worker using Pyodide (CPython compiled to WebAssembly). The main thread enforces time limits by terminating the worker. Lean is compiled at build time in CI, never on request.
- **Claims are derived, not asserted.** Verification labels come from generated reports. Tests fail if content cites a Lean declaration or experiment that is missing, failing, or uses `sorry`.
- **Content is data.** Curriculum metadata is JSON, validated by zod schemas (`src/lib/schema.ts`). Lessons and trails are MDX. Every object has a stable identifier.

## Stack

| Concern | Choice | Notes |
| --- | --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript | `output: "export"`, `trailingSlash: true` |
| Styling | Tailwind CSS v4 + CSS custom properties | Design tokens in `src/app/globals.css`; light and dark |
| Content | MDX via `@mdx-js/mdx` `evaluate` at build time | `remark-math` + `rehype-katex`; custom components for lesson blocks |
| Mathematics | KaTeX 0.16 (HTML + MathML; pinned to the version rehype-katex uses so CSS and markup match) | Rendered on the server, so no maths JavaScript ships to the browser |
| Code highlighting | Shiki (Lean 4, Python), server-side | Dual light/dark themes switched by CSS variables |
| Formal | Lean 4.35.0 + Mathlib (pinned tag `v4.35.0`) | `formal/`, compiled by `scripts/verify-lean.mjs`; K–8 modules use core Lean only |
| Computation | Python + SymPy + NumPy, pinned to Pyodide 0.29.3 versions | `compute/`, tested by `compute/verify.py` |
| Browser Python | Pyodide 0.29.3 from jsDelivr, in `public/workers/pyodide-worker.js` | Loaded lazily on first Run |
| Validation | zod 4 | Schemas shared by the site and the tests |
| Tests | Vitest 5, pytest, Lean build | See `docs/testing.md` |
| i18n | Locale segment `/[locale]/…`, JSON catalogues, per-file content translations | See `docs/i18n/` |

## Data flow

```
content/*.json, *.mdx ──► src/lib/content.ts (zod-validated loaders) ──► server components ──► static HTML
formal/*.lean ──► scripts/verify-lean.mjs ──► content/verification/lean-report.json ─┐
compute/experiments/*.py ──► compute/verify.py ──► content/verification/compute-report.json ─┤
                                                                                     └► verification labels, formal lab, lab pages
```

Lean source shown on the site is extracted from the `.lean` files by region markers (`-- @region id … -- @endregion`), so the code a learner reads is exactly the code that was compiled. The same is true of Python: the lab and lessons display and run the tested experiment files.

## Routing

| Route | Page |
| --- | --- |
| `/` | Language negotiation (remembered choice → browser preferences → English), with a no-JS fallback list |
| `/[locale]/` | Home: Lumenary Academy's three divisions (Lumenary Scientia, Lingua and Prep) |
| `/[locale]/math/` | Lumenary Math's front page (part of Lumenary Scientia) |
| `/[locale]/math/curriculum/` | Curriculum browser (filter by level, subject, pathway, status, objective text) |
| `/[locale]/math/graph/` | Interactive knowledge graph (map and accessible list views) |
| `/[locale]/math/lessons/[slug]/` | Lesson reader |
| `/[locale]/math/topics/[id]/` | Topic page for every graph node |
| `/[locale]/math/trails/`, `…/[slug]/` | Wonder Trails |
| `/[locale]/lab/`, `…/lab/[id]/` | Math laboratory (experiments by level, scratchpad) and one page per experiment |
| `/[locale]/formal/`, `…/formal/[module]/` | Formal laboratory (build report, modules by level) and one page per Lean module (declarations, axioms, exercises) |
| `/[locale]/practice/`, `…/practice/[slug]/` | Practice: lessons by level, and one practice page per lesson |
| `/[locale]/progress/` | Optional local progress tracking |
| `/[locale]/educators/`, `…/worksheets/[slug]/`, `…/overview/` | Educator resources and evaluation package |
| `/[locale]/languages/` | Language and country registries |
| `/[locale]/verification/` | Verification report |
| `/en/cs/`, `/en/cs/[slug]/` | Lumenary CS: the course page and its lessons (English only) |
| `/en/cs/languages/`, `…/[course]/`, `…/[course]/[slug]/` | Lumenary CS's programming-language courses: the index by family, each course and its lessons |
| `/en/cs/electives/`, `…/[course]/`, `…/[course]/[slug]/` | Lumenary CS's electives: the index, each elective and its lessons |
| `/en/ee/`, `/en/ee/[slug]/` | Lumenary EE: the course page and its lessons (English only) |
| `/en/robotics/`, `/en/robotics/[slug]/` | Lumenary Robotics: the course page and its lessons (English only) |
| `/en/chemistry/`, `/en/chemistry/[slug]/` | Lumenary Chemistry: the course page and its lessons (English only) |
| `/en/me/`, `/en/me/[slug]/` | Lumenary ME: the course page and its lessons (English only) |
| `/en/materials/`, `/en/materials/[slug]/` | Lumenary Materials: the course page and its lessons (English only) |
| `/en/statistics/`, `/en/statistics/[slug]/` | Lumenary Statistics: the course page and its lessons (English only) |
| `/[locale]/lingua/…` | No pages: Lumenary Lingua has its own site (see "Lumenary Lingua and Lumenary Prep" below), and `vercel.json` redirects these old addresses there |
| `/[locale]/about/`, `/[locale]/divisions/`, `/[locale]/contribute/` | Project pages |

### Header and footer

The header and footer show the navigation of the part of the academy a page belongs to (`src/lib/site-nav.ts`, `siteSection`). Lumenary Math's pages (`/math/…`, the labs, practice, progress and the educator resources) keep Math's navigation, its tools and its motto. The other subjects' pages link the subjects to one another, with the programming languages, the electives, the divisions and the project pages. Every other page (the front page, divisions, about, contribute, languages, verification) shows only the three divisions and the project pages. The footer is rendered by the layout, which cannot know the page, so it hands every set of columns to a small client component (`FooterNav`) that picks one from the pathname; each exported page's HTML contains only its own.

## Lesson architecture

A lesson is `content/math/lessons/<slug>/en.mdx`, with frontmatter validated by `LessonFrontmatter`. Its body is a sequence of `<Section id kind title>` blocks whose `kind` maps to the standard lesson architecture (motivation, intuition, definitions, examples, proof, formal, computation, visualization, exercises, misconceptions, viewpoints, trails, sets, categories, history, reading) and to a reasoning mode (H/F/C). From early undergraduate onwards a `viewpoints` section is required, showing the topic through other mathematicians' eyes as well as set theory and category theory (see `docs/curriculum/viewpoints.md`). The full contract for authors is `docs/authoring-guide.md`. Available components:

- Blocks: `Definition`, `Theorem`, `Proof`, `Example`, `Misconception`, `Note`, `Analogy`, `Viewpoint` (one mathematician's view: topology, geometry, analysis, algebra, …), `Figure`, `Reflection` (optional Christian reflection, collapsed), `ForGrownUps`, `Narrator`
- Verified content: `<Lean decl="…"/>`, `<Python id="…"/>`
- Links: `<Trail slug="…"/>`, `<Exercises/>`
- Links: `<TopicLink id="math.…">` links any topic (its lesson, or its topic page)
- Interactive explorations: about thirty generic, configurable widgets registered in `src/components/widgets/registry-*.ts` and documented in `docs/widgets/*.md` (number, shape and data, analysis, discrete, topology), plus the original ones (`SortingGame`, `VennExplorer`, `IntegerLine`, `ArrowDiagram`, `CompositionMachine`, …). `src/components/lesson/widget-map.ts` collects them and defines the presets that Wonder Trails embed.

Exercises live in `exercises.json` (types: `choice`, `integer`, `set`, `python`) and are rendered on the server into HTML (maths included), then hydrated as small client components.

## Extending to other subjects

Topic ids are namespaced (`math.*`) and subjects/levels are data. Subjects other than mathematics are **courses** (`src/lib/courses.ts`): a syllabus and lesson directories under `content/cs/`, `content/ee/` or `content/robotics/`, rendered by `src/components/course/CoursePages.tsx` with the same lesson components, plus highlighted and runnable code blocks (`CodeBlock`). Their code is run by `compute/verify_courses.py`, which writes `content/verification/course-code-report.json`. See [courses.md](courses.md).

## Lumenary Lingua and Lumenary Prep

Two of the academy's three divisions are not built here. **Lumenary Lingua**, the language courses, lives at [lingua.lumenary.academy](https://lingua.lumenary.academy), built from its own repository, [lumenary-academy/lumenary-lingua](https://github.com/lumenary-academy/lumenary-lingua), on the shared [@lumenary/core](https://github.com/lumenary-academy/lumenary-core) library. Its courses exist only in their teaching locale there: Spanish at `/en/spanish/`, English at `/es/ingles/`. **Lumenary Prep** lives at [prep.lumenary.academy](https://prep.lumenary.academy). This site links to both from the front page and the divisions page, with their base URLs in one place, `src/lib/sites.ts` (`LINGUA_URL`, `PREP_URL`).

Lingua's courses used to be part of this site, at `/[locale]/lingua/…`. Those addresses redirect permanently (308) to the Lingua site in `vercel.json`: `…/lingua/spanish/…` to `/en/spanish/…` and `…/lingua/ingles/…` to `/es/ingles/…` from any locale, and anything else under `/[locale]/lingua/` to Lingua's front page in the same locale. The course rules come before the general one. Because the site is exported with `trailingSlash: true`, the sources end in an optional `/:path(.*)?` rather than `/:path*`, which Vercel compiles strictly and which would not match a trailing slash.

## Page weight

Formulas are typeset at build time and travel as one HTML string each (`src/lib/rehype-katex-html.ts`), not as React element trees, so the React Server Components payload stays close to the size of the HTML. Lesson pages ship only the widget strings they use (`src/lib/widget-messages.ts`), and links to lessons, topics, labs and practice pages do not prefetch, so opening one page never downloads dozens of others in the background.
