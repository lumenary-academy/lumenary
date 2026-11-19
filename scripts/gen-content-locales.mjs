#!/usr/bin/env node
/**
 * gen-content-locales.mjs — write src/lib/generated/content-locales.json: for every lesson, the
 * non-English locales that have a translation (`content/math/lessons/<slug>/<locale>.mdx`); and for
 * every course outside Lumenary Math (content/cs, content/lingua/<id>), the one locale it is taught
 * in, keyed by its site path ("cs", "lingua/spanish").
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

/** The locale each course's pages are generated in (mirrors getCourses() in src/lib/courses.ts). */
function courseLocales() {
  const out = {};
  const add = (file) => {
    if (!fs.existsSync(file)) return;
    const c = JSON.parse(fs.readFileSync(file, "utf8"));
    out[c.division === "lingua" ? `lingua/${c.id}` : c.id] = c.locale;
  };
  add(path.join(CONTENT, "cs/course.json"));
  const lingua = path.join(CONTENT, "lingua");
  if (fs.existsSync(lingua)) for (const d of fs.readdirSync(lingua).sort()) add(path.join(lingua, d, "course.json"));
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
  return { lessons, courses: courseLocales() };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, `${JSON.stringify(contentLocales(), null, 2)}\n`);
  console.log(`content locales: ${Object.keys(contentLocales().lessons).length} translated lesson(s) → ${path.relative(ROOT, OUT)}`);
}
