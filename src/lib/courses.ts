import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Locale } from "@/i18n/config";
import { CourseCodeReport, CourseFile, CourseLessonFrontmatter, CourseTranslationFile, ExercisesFile, GUIDE_SETS, type CourseLevel, type Exercise, type GuideSet } from "./schema";
import { ROOT, shortHash } from "./content";
import { LOCALES } from "@/i18n/config";

/**
 * Courses outside Lumenary Math: Lumenary Scientia's other subjects (content/cs, content/ee,
 * content/robotics) and the courses nested in a subject (Lumenary CS's programming languages,
 * content/cs/languages/<id>, and electives, content/cs/electives/<id>). A course is a syllabus
 * (course.json: levels, each an ordered list of lesson slugs) and one directory per lesson
 * (lesson.mdx, exercises.json). Pages are generated only in the locale the course is taught in
 * (see src/lib/href.ts). docs/courses.md is the authoring guide. Lumenary Lingua's language
 * courses live in their own repository and site (lingua.lumenary.academy).
 */

const CONTENT = path.join(ROOT, "content");
const read = (p: string) => fs.readFileSync(p, "utf8");
const exists = (p: string) => fs.existsSync(p);

/** Families of courses nested in a subject, by directory: each has an index page at its path. */
export const COLLECTIONS = {
  "cs/languages": { label: "Programming languages" },
  "cs/electives": { label: "Electives" },
} as const;
export type Collection = keyof typeof COLLECTIONS;

/** Directories under content/ that are not courses. */
const NOT_COURSES = new Set(["math", "pages", "registry", "verification"]);

export interface LoadedCourse {
  course: CourseFile;
  /** Directory under content/, e.g. "cs", "ee" or "cs/languages/rust". */
  dir: string;
  /** Site path of the course page, without locale: the same as `dir` ("cs", "cs/languages/rust"). */
  path: string;
  /** The family the course is nested in ("cs/languages", "cs/electives"), if any. */
  collection?: Collection;
  /** Every lesson slug, in teaching order across levels. */
  slugs: string[];
}

export interface CourseLesson {
  slug: string;
  frontmatter: CourseLessonFrontmatter;
  body: string;
  level: CourseLevel;
  /** The language this text is in: the course's own, or a translation's. */
  locale: Locale;
  /** For a translation: true when the original lesson has changed since it was translated. */
  stale: boolean;
}

const memo = new Map<string, unknown>();
function cached<T>(key: string, load: () => T): T {
  if (!memo.has(key)) memo.set(key, load());
  return memo.get(key) as T;
}

/** content/ directories that hold a course.json: subjects (cs, ee, robotics), cs/languages/<id>, cs/electives/<id>. */
export function courseDirs(): string[] {
  const out = fs
    .readdirSync(CONTENT)
    .sort()
    .filter((d) => !NOT_COURSES.has(d) && exists(path.join(CONTENT, d, "course.json")));
  for (const family of Object.keys(COLLECTIONS)) {
    const base = path.join(CONTENT, family);
    if (!exists(base)) continue;
    for (const d of fs.readdirSync(base).sort()) if (exists(path.join(base, d, "course.json"))) out.push(`${family}/${d}`);
  }
  return out;
}

const collectionOf = (dir: string) => (Object.keys(COLLECTIONS) as Collection[]).find((k) => dir.startsWith(`${k}/`));

export function getCourses(): LoadedCourse[] {
  return cached("courses", () =>
    courseDirs().map((dir) => {
      const course = CourseFile.parse(JSON.parse(read(path.join(CONTENT, dir, "course.json"))));
      return { course, dir, path: dir, collection: collectionOf(dir), slugs: course.levels.flatMap((l) => l.lessons) };
    }),
  );
}

/**
 * The cat guides' roles in a course: the course's own `guides`, else the programming-language set for
 * cs/languages, else its subject's set (cs and its electives, ee, robotics, chemistry…). Undefined for
 * a subject with no guide set of its own (its guides keep Lumenary Math's roles).
 */
export function guideSet(c: LoadedCourse): GuideSet | undefined {
  if (c.course.guides) return c.course.guides;
  if (c.collection === "cs/languages") return "programming";
  const subject = c.dir.split("/")[0]!;
  return (GUIDE_SETS as readonly string[]).includes(subject) ? (subject as GuideSet) : undefined;
}

/** A subject (cs, ee, robotics), by id; never a course nested in a collection. */
export function getCourse(id: string, division?: CourseFile["division"]): LoadedCourse | undefined {
  return getCourses().find((c) => c.course.id === id && (!division || c.course.division === division) && !c.collection);
}

/** The courses of a collection (content/cs/languages/<id>, content/cs/electives/<id>), in alphabetical order. */
export function getCollection(collection: Collection): LoadedCourse[] {
  return getCourses().filter((c) => c.collection === collection);
}

export function getCollectionCourse(collection: Collection, id: string): LoadedCourse | undefined {
  return getCollection(collection).find((c) => c.course.id === id);
}

/** The programming-language courses (content/cs/languages/<id>), in alphabetical order. */
export function getLanguageCourses(): LoadedCourse[] {
  return getCollection("cs/languages");
}

export function getLanguageCourse(id: string): LoadedCourse | undefined {
  return getCollectionCourse("cs/languages", id);
}

const lessonFile = (c: LoadedCourse, slug: string, locale: Locale) => path.join(CONTENT, c.dir, "lessons", slug, locale === c.course.locale ? "lesson.mdx" : `lesson.${locale}.mdx`);

/** A lesson in a locale: its translation (lesson.<locale>.mdx) when there is one, otherwise the original. */
export function getCourseLesson(c: LoadedCourse, slug: string, locale: Locale = c.course.locale): CourseLesson {
  const use = locale !== c.course.locale && exists(lessonFile(c, slug, locale)) ? locale : c.course.locale;
  return cached(`lesson:${c.dir}:${slug}:${use}`, () => {
    const { data, content } = matter(read(lessonFile(c, slug, use)));
    const level = c.course.levels.find((l) => l.lessons.includes(slug));
    if (!level) throw new Error(`${slug} is in no level of ${c.dir}/course.json`);
    const frontmatter = CourseLessonFrontmatter.parse(data);
    let stale = false;
    if (use !== c.course.locale) {
      const recorded = frontmatter.translation?.sourceHash;
      stale = recorded !== undefined && recorded !== shortHash(matter(read(lessonFile(c, slug, c.course.locale))).content);
    }
    return { slug, frontmatter, body: content, level, locale: use, stale };
  });
}

export function getCourseExercises(c: LoadedCourse, slug: string, locale: Locale = c.course.locale): Exercise[] {
  const dir = path.join(CONTENT, c.dir, "lessons", slug);
  const translated = path.join(dir, `exercises.${locale}.json`);
  const p = locale !== c.course.locale && exists(translated) && exists(lessonFile(c, slug, locale)) ? translated : path.join(dir, "exercises.json");
  return exists(p) ? ExercisesFile.parse(JSON.parse(read(p))).exercises : [];
}

/** A course's translated page (course.<locale>.json), if there is one. */
export function getCourseTranslation(c: LoadedCourse, locale: Locale): CourseTranslationFile | null {
  if (locale === c.course.locale) return null;
  const p = path.join(CONTENT, c.dir, `course.${locale}.json`);
  return exists(p) ? cached(`courseTranslation:${c.dir}:${locale}`, () => CourseTranslationFile.parse(JSON.parse(read(p)))) : null;
}

/** The course's human-readable fields in a locale (translated where a course.<locale>.json exists); the syllabus is unchanged. */
export function localizedCourse(c: LoadedCourse, locale: Locale): CourseFile {
  const t = getCourseTranslation(c, locale);
  if (!t) return c.course;
  const levels = c.course.levels.map((l) => {
    const tl = t.levels.find((x) => x.id === l.id);
    return tl ? { ...l, title: tl.title, short: tl.short, summary: tl.summary } : l;
  });
  return { ...c.course, title: t.title, subtitle: t.subtitle, description: t.description, ui: t.ui, levels, locale };
}

/** The locales a course's own page exists in: the language it is taught in, and each language with a course.<locale>.json. */
export function courseLocalesOf(c: LoadedCourse): Locale[] {
  return [c.course.locale, ...LOCALES.filter((l) => getCourseTranslation(c, l) !== null)];
}

/** The locales a lesson's page exists in: the course's language, and each language with a lesson.<locale>.mdx. */
export function lessonLocalesOf(c: LoadedCourse, slug: string): Locale[] {
  return [c.course.locale, ...LOCALES.filter((l) => l !== c.course.locale && exists(lessonFile(c, slug, l)))];
}

/** The locale a course's pages are generated in, by course path ("cs", "ee", "cs/languages/rust"). */
export function courseLocales(): Record<string, Locale> {
  return Object.fromEntries(getCourses().map((c) => [c.path, c.course.locale]));
}

export function getCourseCodeReport() {
  return cached("courseCode", () => {
    const p = path.join(CONTENT, "verification/course-code-report.json");
    return exists(p) ? CourseCodeReport.parse(JSON.parse(read(p))) : null;
  });
}

/** Whether a lesson's runnable code was run and passed, from the generated report; null when it has none. */
export function lessonCodeStatus(c: LoadedCourse, slug: string): { tested: boolean; count: number } | null {
  const row = getCourseCodeReport()?.lessons[`${c.dir}/${slug}`];
  if (!row) return null;
  const count = row.snippets + row.exercises + row.checks;
  if (count === 0) return null;
  return { tested: row.snippetsPassed === row.snippets && row.exercisesPassed === row.exercises && row.checksPassed === row.checks, count };
}
