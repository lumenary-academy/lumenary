#!/usr/bin/env node
/**
 * translation-jobs.mjs — the translation job board for Lumenary Every Nation (docs/i18n/every-nation.md).
 *
 * English is the canonical source. For every translatable unit of Lumenary Scientia and every
 * non-English site locale, this lists a job when the translation is missing or stale (the English
 * changed since the translation's recorded `sourceHash`). Volunteers' copies of the
 * lumenary-every-nation tool read the board, translate with their own Claude subscription and open
 * pull requests; language experts review them.
 *
 *   node scripts/translation-jobs.mjs                 # summary on stdout
 *   node scripts/translation-jobs.mjs --out jobs.json # the board as JSON
 *
 * Units and kinds:
 *   math-lesson    content/math/lessons/<slug>/en.mdx + exercises.json  → <locale>.mdx + exercises.<locale>.json
 *   course         content/<course>/course.json                         → course.<locale>.json (an overlay)
 *   course-lesson  content/<course>/lessons/<slug>/lesson.mdx + exercises.json → lesson.<locale>.mdx + exercises.<locale>.json
 *   ui             src/i18n/messages/en.json → <locale>.json (missing keys only)
 *   glossary       content/registry/glossaries/en.json → <locale>.json (missing terms only)
 *
 * A source hash is sha256 (first 12 hex characters) of the English body without its frontmatter
 * (lessons) or of the whole file (course.json), exactly as the site computes staleness.
 * Lumenary Lingua's courses are not translated: they are built in their own repository, each for one pair of languages.
 */
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import matter from "gray-matter";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONTENT = path.join(ROOT, "content");
const rel = (p) => path.relative(ROOT, p).split(path.sep).join("/");
const read = (p) => fs.readFileSync(p, "utf8");
const exists = (p) => fs.existsSync(p);
export const shortHash = (text) => crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
const words = (text) => (text.replace(/^```[\s\S]*?^```/gm, "").match(/[\p{L}\p{N}]+/gu) ?? []).length;

/** The site's locales (src/i18n/config.ts), English first. */
export function siteLocales() {
  const m = read(path.join(ROOT, "src/i18n/config.ts")).match(/export const LOCALES = \[([^\]]*)\]/);
  if (!m) throw new Error("LOCALES not found in src/i18n/config.ts");
  return [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]);
}

/** Directories under content/ that are not Scientia courses, and the families nested in a subject (as src/lib/courses.ts). */
const NOT_COURSES = new Set(["math", "pages", "registry", "verification"]);
const COLLECTIONS = ["cs/languages", "cs/electives"];

export function scientiaCourseDirs() {
  const out = fs.readdirSync(CONTENT).sort().filter((d) => !NOT_COURSES.has(d) && exists(path.join(CONTENT, d, "course.json")));
  for (const family of COLLECTIONS) {
    const base = path.join(CONTENT, family);
    if (exists(base)) for (const d of fs.readdirSync(base).sort()) if (exists(path.join(base, d, "course.json"))) out.push(`${family}/${d}`);
  }
  return out;
}

/** The translation block recorded in a translated file, or null. */
function recordedHash(file, kind) {
  if (!exists(file)) return null;
  try {
    if (kind === "json") return JSON.parse(read(file)).translation?.sourceHash ?? "";
    return matter(read(file)).data?.translation?.sourceHash ?? "";
  } catch {
    return "";
  }
}

function status(target, hash, kind) {
  const recorded = recordedHash(target, kind);
  if (recorded === null) return "missing";
  return recorded === hash ? null : "stale";
}

/** Order: what most learners meet first comes first (lower is sooner). */
const MATH_LEVELS = ["k2", "g3-5", "g6-8", "g9-12", "ug1", "ug2", "grad", "research"];

export function translationJobs() {
  const locales = siteLocales().filter((l) => l !== "en");
  const jobs = [];
  const push = (job) => jobs.push(job);

  // Lumenary Math lessons, ordered by curriculum level.
  const graph = JSON.parse(read(path.join(CONTENT, "math/graph/graph.json")));
  const levelOf = new Map(graph.topics.filter((t) => t.lesson).map((t) => [t.lesson, t.level]));
  const lessonsDir = path.join(CONTENT, "math/lessons");
  for (const slug of fs.readdirSync(lessonsDir).sort()) {
    const dir = path.join(lessonsDir, slug);
    const en = path.join(dir, "en.mdx");
    if (!exists(en)) continue;
    const body = matter(read(en)).content;
    const hash = shortHash(body);
    const level = Math.max(0, MATH_LEVELS.indexOf(levelOf.get(slug) ?? "research"));
    const hasExercises = exists(path.join(dir, "exercises.json"));
    for (const locale of locales) {
      const target = path.join(dir, `${locale}.mdx`);
      const exTarget = path.join(dir, `exercises.${locale}.json`);
      let reason = status(target, hash, "mdx");
      if (!reason && hasExercises && !exists(exTarget)) reason = "missing-exercises";
      if (!reason) continue;
      push({
        id: `math-lesson/${slug}/${locale}`,
        kind: "math-lesson",
        locale,
        unit: slug,
        source: { lesson: rel(en), ...(hasExercises ? { exercises: rel(path.join(dir, "exercises.json")) } : {}) },
        target: { lesson: rel(target), ...(hasExercises ? { exercises: rel(exTarget) } : {}) },
        sourceHash: hash,
        reason,
        priority: level * 100 + 10,
        words: words(body),
      });
    }
  }

  // Lumenary Scientia's courses: the course page, then each lesson; Start levels before later ones.
  for (const dir of scientiaCourseDirs()) {
    const courseFile = path.join(CONTENT, dir, "course.json");
    const courseText = read(courseFile);
    const course = JSON.parse(courseText);
    const courseHash = shortHash(courseText);
    const nested = dir.includes("/") ? 50 : 0;
    for (const locale of locales) {
      const target = path.join(CONTENT, dir, `course.${locale}.json`);
      const reason = status(target, courseHash, "json");
      if (reason)
        push({ id: `course/${dir}/${locale}`, kind: "course", locale, unit: dir, source: { course: rel(courseFile) }, target: { course: rel(target) }, sourceHash: courseHash, reason, priority: nested, words: words(courseText) });
    }
    course.levels.forEach((level, li) => {
      for (const slug of level.lessons) {
        const ldir = path.join(CONTENT, dir, "lessons", slug);
        const src = path.join(ldir, "lesson.mdx");
        if (!exists(src)) continue;
        const body = matter(read(src)).content;
        const hash = shortHash(body);
        const hasExercises = exists(path.join(ldir, "exercises.json"));
        for (const locale of locales) {
          const target = path.join(ldir, `lesson.${locale}.mdx`);
          const exTarget = path.join(ldir, `exercises.${locale}.json`);
          let reason = status(target, hash, "mdx");
          if (!reason && hasExercises && !exists(exTarget)) reason = "missing-exercises";
          if (!reason) continue;
          push({
            id: `course-lesson/${dir}/${slug}/${locale}`,
            kind: "course-lesson",
            locale,
            unit: `${dir}/${slug}`,
            source: { lesson: rel(src), ...(hasExercises ? { exercises: rel(path.join(ldir, "exercises.json")) } : {}) },
            target: { lesson: rel(target), ...(hasExercises ? { exercises: rel(exTarget) } : {}) },
            sourceHash: hash,
            reason,
            priority: li * 100 + 20 + nested,
            words: words(body),
          });
        }
      }
    });
  }

  // Interface strings and glossaries: only what is missing.
  const flat = (obj, prefix = "") => Object.entries(obj).flatMap(([k, v]) => (v && typeof v === "object" ? flat(v, `${prefix}${k}.`) : [`${prefix}${k}`]));
  const enMessages = path.join(ROOT, "src/i18n/messages/en.json");
  const enKeys = flat(JSON.parse(read(enMessages)));
  const enGlossaryFile = path.join(CONTENT, "registry/glossaries/en.json");
  const enTerms = Object.keys(JSON.parse(read(enGlossaryFile)).terms ?? {});
  for (const locale of locales) {
    const file = path.join(ROOT, `src/i18n/messages/${locale}.json`);
    const have = new Set(exists(file) ? flat(JSON.parse(read(file))) : []);
    const keys = enKeys.filter((k) => !have.has(k));
    if (keys.length) push({ id: `ui/${locale}`, kind: "ui", locale, unit: "messages", source: { messages: rel(enMessages) }, target: { messages: rel(file) }, keys, reason: "missing", priority: 0, words: keys.length * 4 });
    const gfile = path.join(CONTENT, `registry/glossaries/${locale}.json`);
    const haveTerms = new Set(Object.keys(exists(gfile) ? (JSON.parse(read(gfile)).terms ?? {}) : {}));
    const terms = enTerms.filter((t) => !haveTerms.has(t));
    if (terms.length) push({ id: `glossary/${locale}`, kind: "glossary", locale, unit: "glossary", source: { glossary: rel(enGlossaryFile) }, target: { glossary: rel(gfile) }, keys: terms, reason: "missing", priority: 1, words: terms.length * 3 });
  }

  for (const j of jobs) if (j.kind !== "ui" && j.kind !== "glossary") j.glossary = `content/registry/glossaries/${j.locale}.json`;
  jobs.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
  return { version: 1, locales, jobs };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const board = translationJobs();
  const outIndex = process.argv.indexOf("--out");
  const commit = process.env.GITHUB_SHA ?? null;
  const full = { version: board.version, generatedAt: new Date().toISOString(), commit, locales: board.locales, jobs: board.jobs };
  if (outIndex > 0) fs.writeFileSync(process.argv[outIndex + 1], `${JSON.stringify(full, null, 2)}\n`);
  const by = {};
  for (const j of board.jobs) by[`${j.locale} ${j.kind}`] = (by[`${j.locale} ${j.kind}`] ?? 0) + 1;
  console.log(`translation jobs: ${board.jobs.length} (${board.jobs.reduce((n, j) => n + j.words, 0)} words)`);
  for (const [k, n] of Object.entries(by).sort()) console.log(`  ${k}: ${n}`);
}
