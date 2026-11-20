/**
 * The front page's sample lessons ("Try a lesson"): every link targets a lesson that exists in this
 * repository's syllabi. (Lumenary Lingua's and Lumenary Prep's samples are on Lumenary Academy's front
 * page, in its own repository.)
 */
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { lessonSlugs } from "@/lib/content";
import { getCourses } from "@/lib/courses";
import { href } from "@/lib/href";
import { sampleLesson, scientiaSubjects } from "@/lib/subjects";
import { json } from "./helpers";

describe("Lumenary Scientia's sample lessons", () => {
  const { open } = scientiaSubjects();

  it("gives every open subject one or two", () => {
    for (const s of open) expect(s.samples.length, s.key).toBeGreaterThanOrEqual(1);
    for (const s of open) expect(s.samples.length, s.key).toBeLessThanOrEqual(2);
  });

  it("links lessons that exist, in the subject, from its first two levels", () => {
    const math = lessonSlugs();
    for (const s of open)
      for (const path of s.samples) {
        expect(path.startsWith(`${s.path}/`), `${s.key}: ${path}`).toBe(true);
        const m = path.match(/^math\/lessons\/([^/]+)$/);
        if (m) {
          expect(math, path).toContain(m[1]);
          continue;
        }
        const course = getCourses().find((c) => path.startsWith(`${c.path}/`) && !path.slice(c.path.length + 1).includes("/"));
        expect(course, path).toBeDefined();
        const slug = path.slice(course!.path.length + 1);
        const level = course!.course.levels.findIndex((l) => l.lessons.includes(slug));
        expect(level, path).toBeGreaterThanOrEqual(0);
        expect(level, `${path} is in level ${level + 1}`).toBeLessThan(2);
      }
  });

  it("titles each in the language of the page its link opens, and courses link their English pages", () => {
    for (const locale of LOCALES)
      for (const s of open)
        for (const path of s.samples) {
          const lesson = sampleLesson(path, locale);
          expect(lesson.title.length, path).toBeGreaterThan(0);
          expect(href(locale, path), path).toBe(`/${lesson.lang}/${path}/`);
          if (!path.startsWith("math/")) expect(lesson.lang, path).toBe("en");
        }
  });
});

describe("the front page's strings", () => {
  it("exist in every locale, with the links to Lumenary Academy and its other divisions", () => {
    for (const locale of LOCALES) {
      const m = json<{ divisions: Record<string, string>; scientia: Record<string, string> }>(`src/i18n/messages/${locale}.json`);
      expect(typeof m.divisions.tryLesson, `${locale}: divisions.tryLesson`).toBe("string");
      for (const key of ["eyebrow", "lead", "free", "honesty", "about"]) expect(typeof m.scientia[key], `${locale}: scientia.${key}`).toBe("string");
      for (const name of ["academy", "lingua", "prep"]) expect(m.scientia.academy, `${locale}: scientia.academy`).toContain(`{${name}}`);
    }
  });
});
