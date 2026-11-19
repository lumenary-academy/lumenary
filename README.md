# Lumenary Academy

**All the sciences. Many languages. Every nation.**

Lumenary Academy is a Christian-inspired education project in three divisions. This repository holds its website, [lumenary.academy](https://lumenary.academy), the open subjects of Lumenary Scientia — **Lumenary Math**, **Lumenary Statistics**, **Lumenary CS** (with its programming-language courses and electives), **Lumenary EE**, **Lumenary Robotics**, **Lumenary Chemistry**, **Lumenary ME** and **Lumenary Materials**. **Lumenary Lingua** and **Lumenary Prep** have their own sites and repositories.

## The three divisions

| Division | What it is | Status |
| --- | --- | --- |
| **Lumenary Scientia** | The sciences, free and open source for ever: no accounts, no advertising, no paid tiers | Available: mathematics (**[Lumenary Math](content/math/README.md)**), statistics (**Lumenary Statistics**, `content/statistics/`), computer science (**Lumenary CS**, `content/cs/`, with programming languages from Assembly to Zig in `content/cs/languages/` and electives in `content/cs/electives/`), electrical engineering (**Lumenary EE**, `content/ee/`), robotics (**Lumenary Robotics**, `content/robotics/`), chemistry (**Lumenary Chemistry**, `content/chemistry/`) mechanical engineering (**Lumenary ME**, `content/me/`) and materials science (**Lumenary Materials**, `content/materials/`). Physics, biology and other sciences pending |
| **Lumenary Lingua** | Languages, each taught through a language the learner already knows | At [lingua.lumenary.academy](https://lingua.lumenary.academy), built in its own repository, [lumenary-academy/lumenary-lingua](https://github.com/lumenary-academy/lumenary-lingua). Available, A1 to C2: Spanish taught in English and English taught in Spanish. Other pairs pending. Its old addresses here (`/<locale>/lingua/…`) redirect there (`vercel.json`) |
| **Lumenary Prep** | Exam preparation as a paid service: one price per course, paid once, for lifetime access | At [prep.lumenary.academy](https://prep.lumenary.academy), built in a separate repository |

Paying for Prep is never needed to use Scientia, and Scientia stays free and open source. The site's [divisions page](https://lumenary.academy/en/divisions/) (`content/pages/divisions/en.mdx`) has the details.

## Lumenary Math

Mathematics from kindergarten counting to the first year of graduate school, every lesson taught three ways: human (intuition and proof), formal (Lean 4 + Mathlib) and computational (Python). Every topic in the curriculum has a first-draft lesson; none has yet been reviewed by a human mathematician or teacher.

**[Lumenary Math's README](content/math/README.md)** covers what exists today, the honesty notes, the Lean and Python toolchain and the curriculum documentation.

## Lumenary CS, EE, Robotics, Chemistry, ME and Materials

Computer science, electrical engineering, robotics, chemistry, mechanical engineering and materials science are **courses**: a syllabus (`course.json`) and one directory per lesson (`lesson.mdx`, `exercises.json`), rendered with the same lesson components (and the same cat guides) as Lumenary Math. Lumenary CS runs from a first program to the frontier of AI in 55 lessons across eight levels (online at `/en/cs/`), with a course for each major programming language (`/en/cs/languages/`) and electives (`/en/cs/electives/`, starting with Blockchains & Verifiable Computation). Lumenary EE (`/en/ee/`) runs from a first circuit to chips, power grids and radios, Lumenary Robotics (`/en/robotics/`) from a first moving robot to robot learning and humanoids, Lumenary Chemistry (`/en/chemistry/`) from matter and change to the research frontier, Lumenary ME (`/en/me/`) from forces and simple machines to advanced manufacturing and fusion engineering, and Lumenary Materials (`/en/materials/`) from what things are made of to battery, quantum and architected materials. Their runnable Python blocks and Python exercises run in the browser; they, and the programs in other languages (compiled and run with each language's toolchain, Verilog with Icarus Verilog and circuits with ngspice), are executed by `npm run verify:courses`. All of it is AI-drafted and awaits human review, as the pages say. [docs/courses.md](docs/courses.md) is the authoring guide.

## Quick start

Requirements: Node ≥ 22.

```bash
npm install
npm run dev               # http://localhost:3000
npm run typecheck
npm test                  # lessons, courses, widgets, graph, registry, i18n and parser tests
npm run verify:courses    # run the code in the courses' lessons (needs the Python venv, see below)
npm run build             # static export to out/
npm start                 # serve out/ at http://localhost:4173
npm run test:e2e          # browser checks against out/ (Playwright)
```

The Lean and Python checks behind Lumenary Math need their own toolchains: see [its quick start](content/math/README.md#quick-start).

## Repository layout

```
content/
  math/              Lumenary Math: knowledge graph, lessons, trails (see its README)
  cs/                Lumenary CS: course.json and lessons/<slug>/, languages/<id>/, electives/<id>/ (see docs/courses.md)
  ee/                Lumenary EE: course.json and lessons/<slug>/
  robotics/          Lumenary Robotics: course.json and lessons/<slug>/
  chemistry/         Lumenary Chemistry: course.json and lessons/<slug>/
  me/                Lumenary ME: course.json and lessons/<slug>/
  materials/         Lumenary Materials: course.json and lessons/<slug>/
  statistics/        Lumenary Statistics: course.json and lessons/<slug>/
  pages/             About, Divisions, Contribute, Educators, evaluation package (MDX)
  registry/          languages.json, countries.json, glossaries/
  verification/      generated reports — never edit by hand
formal/              Lean 4 project for Lumenary Math
compute/             Python experiments for Lumenary Math, tests, verify.py, pinned requirements
src/
  app/[locale]/      routes (static export): the front page (the three divisions), math/, cs/, ee/, robotics/, chemistry/, me/, materials/, statistics/, and the project pages
  components/        UI, lesson blocks, widgets, graph, exercises
  i18n/              locale config and message catalogues
  lib/               schemas (zod), content loaders, MDX, layout, sandbox
scripts/             verification, screenshots, static server, source hashes
tests/               vitest suites
docs/                architecture, curriculum, i18n, design, testing, licensing, roadmap
```

## Documentation

- [Architecture](docs/architecture.md) · [Design system](docs/design-system.md) · [Testing strategy](docs/testing.md) · [Courses (CS, EE, Robotics)](docs/courses.md)
- [Language registry](docs/i18n/language-registry.md) · [Translation workflow](docs/i18n/translation-workflow.md) · [Geography](docs/geography.md)
- [Licensing](docs/licensing.md) · [Roadmap](docs/roadmap.md) · [Contributing](CONTRIBUTING.md)
- Lumenary Math's own documentation is listed in [its README](content/math/README.md#documentation).

## Licences

Software, Lean proofs and Python experiments: [Apache-2.0](LICENSE). Educational content (text, exercises, diagrams): [CC BY-SA 4.0](LICENSE-CONTENT). See [docs/licensing.md](docs/licensing.md).

Lumenary Academy is an independent project. No institutional endorsement is implied.
