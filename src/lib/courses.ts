import "server-only";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import type { Locale } from "@/i18n/config";
import { CourseCodeReport, CourseFile, CourseLessonFrontmatter, ExercisesFile, type CourseLevel, type Exercise } from "./schema";
import { ROOT } from "./content";

/**
 * Courses outside Lumenary Math: Lumenary CS (content/cs) and Lumenary Lingua's courses
 * (content/lingua/<id>). A course is a syllabus (course.json: levels, each an ordered list of
 * lesson slugs) and one directory per lesson (lesson.mdx, exercises.json). Pages are generated
 * only in the locale the course is taught in (see src/lib/href.ts). docs/courses.md is the
 * authoring guide.
 */

const CONTENT = path.join(ROOT, "content");
const read = (p: string) => fs.readFileSync(p, "utf8");
const exists = (p: string) => fs.existsSync(p);

export interface LoadedCourse {
  course: CourseFile;
  /** Directory under content/, e.g. "cs" or "lingua/spanish". */
  dir: string;
  /** Site path of the course page, without locale: "cs" or "lingua/spanish". */
  path: string;
  /** Every lesson slug, in teaching order across levels. */
  slugs: string[];
}

export interface CourseLesson {
  slug: string;
  frontmatter: CourseLessonFrontmatter;
  body: string;
  level: CourseLevel;
}

const memo = new Map<string, unknown>();
function cached<T>(key: string, load: () => T): T {
  if (!memo.has(key)) memo.set(key, load());
  return memo.get(key) as T;
}

/** content/ directories that hold a course.json. */
export function courseDirs(): string[] {
  const out: string[] = [];
  if (exists(path.join(CONTENT, "cs/course.json"))) out.push("cs");
  const lingua = path.join(CONTENT, "lingua");
  if (exists(lingua)) {
    for (const d of fs.readdirSync(lingua).sort()) if (exists(path.join(lingua, d, "course.json"))) out.push(`lingua/${d}`);
  }
  return out;
}

export function getCourses(): LoadedCourse[] {
  return cached("courses", () =>
    courseDirs().map((dir) => {
      const course = CourseFile.parse(JSON.parse(read(path.join(CONTENT, dir, "course.json"))));
      return { course, dir, path: course.division === "lingua" ? `lingua/${course.id}` : course.id, slugs: course.levels.flatMap((l) => l.lessons) };
    }),
  );
}

export function getCourse(id: string, division?: CourseFile["division"]): LoadedCourse | undefined {
  return getCourses().find((c) => c.course.id === id && (!division || c.course.division === division));
}

export function getCourseLesson(c: LoadedCourse, slug: string): CourseLesson {
  return cached(`lesson:${c.dir}:${slug}`, () => {
    const { data, content } = matter(read(path.join(CONTENT, c.dir, "lessons", slug, "lesson.mdx")));
    const level = c.course.levels.find((l) => l.lessons.includes(slug));
    if (!level) throw new Error(`${slug} is in no level of ${c.dir}/course.json`);
    return { slug, frontmatter: CourseLessonFrontmatter.parse(data), body: content, level };
  });
}

export function getCourseExercises(c: LoadedCourse, slug: string): Exercise[] {
  const p = path.join(CONTENT, c.dir, "lessons", slug, "exercises.json");
  return exists(p) ? ExercisesFile.parse(JSON.parse(read(p))).exercises : [];
}

/** The locale a course's pages are generated in, by course path ("cs", "lingua/spanish"). */
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
  const count = row.snippets + row.exercises;
  if (count === 0) return null;
  return { tested: row.snippetsPassed === row.snippets && row.exercisesPassed === row.exercises, count };
}
