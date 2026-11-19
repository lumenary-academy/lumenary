#!/usr/bin/env node
/**
 * gen-content-locales.mjs — write src/lib/generated/content-locales.json: for every lesson, the
 * non-English locales that have a translation (`content/math/lessons/<slug>/<locale>.mdx`); and for
 * every course outside Lumenary Math (content/cs, content/ee, content/robotics and their nested courses such as
 * content/cs/languages/<id>), the one locale it is taught in, keyed by its site path ("cs",
 * "cs/languages/rust").
 *
 * Lesson, practice and worksheet pages are generated only in English and in locales with a
 * translation; links in other locales point to the English page (see src/lib/href.ts). This
 * keeps the static export to a size any host can serve, instead of six identical copies of
 * every English lesson. Runs before `next build`/`next dev`; `npm test` checks it is current.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const LESSONS = path.join(ROOT, "content/math/lessons");
const OUT = path.join(ROOT, "src/lib/generated/content-locales.json");
const CONTENT = path.join(ROOT, "content");

/** Directories under content/ that are not courses, and the course families nested in a subject (mirrors courseDirs() in src/lib/courses.ts). */
const NOT_COURSES = new Set(["math", "pages", "registry", "verification"]);
const COLLECTIONS = ["cs/languages", "cs/electives"];

/** The locale each course's pages are generated in (mirrors getCourses() in src/lib/courses.ts). */
function courseLocales() {
  const out = {};
  const add = (file) => {
    if (!fs.existsSync(file)) return;
    const c = JSON.parse(fs.readFileSync(file, "utf8"));
    out[path.relative(CONTENT, path.dirname(file))] = c.locale;
  };
  for (const d of fs.readdirSync(CONTENT).sort()) if (!NOT_COURSES.has(d)) add(path.join(CONTENT, d, "course.json"));
  for (const family of COLLECTIONS) {
    const base = path.join(CONTENT, family);
    if (fs.existsSync(base)) for (const d of fs.readdirSync(base).sort()) add(path.join(base, d, "course.json"));
  }
  return out;
}

/** The site's locales, from src/i18n/config.ts. */
function siteLocales() {
  const m = fs.readFileSync(path.join(ROOT, "src/i18n/config.ts"), "utf8").match(/export const LOCALES = \[([^\]]*)\]/);
  return m ? [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]) : ["en"];
}

/**
 * Translations of Scientia courses (docs/i18n/every-nation.md): for each course path and locale, whether
 * the course page is translated (course.<locale>.json) and which lessons are (lessons/<slug>/lesson.<locale>.mdx).
 */
function courseTranslations(courses) {
  const out = {};
  const locales = siteLocales();
  for (const [coursePath, taught] of Object.entries(courses)) {
    const dir = path.join(CONTENT, coursePath);
    const syllabus = JSON.parse(fs.readFileSync(path.join(dir, "course.json"), "utf8"));
    const slugs = syllabus.levels.flatMap((l) => l.lessons);
    for (const l of locales) {
      if (l === taught) continue;
      const lessons = slugs.filter((s) => fs.existsSync(path.join(dir, "lessons", s, `lesson.${l}.mdx`)));
      const course = fs.existsSync(path.join(dir, `course.${l}.json`));
      if (course || lessons.length) (out[coursePath] ??= {})[l] = { course, lessons };
    }
  }
  return out;
}

export function contentLocales() {
  const lessons = {};
  for (const slug of fs.readdirSync(LESSONS).sort()) {
    const dir = path.join(LESSONS, slug);
    if (!fs.existsSync(path.join(dir, "en.mdx"))) continue;
    const locales = fs.readdirSync(dir).filter((f) => /^[A-Za-z-]+\.mdx$/.test(f) && f !== "en.mdx").map((f) => f.replace(/\.mdx$/, "")).sort();
    if (locales.length) lessons[slug] = locales;
  }
  const courses = courseLocales();
  return { lessons, courses, courseTranslations: courseTranslations(courses) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(contentLocales(), null, 2)}\n`);
  console.log(`content locales: ${Object.keys(contentLocales().lessons).length} translated lesson(s) → ${path.relative(ROOT, OUT)}`);
}
