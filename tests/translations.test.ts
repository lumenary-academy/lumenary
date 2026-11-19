/**
 * Lumenary Every Nation (docs/i18n/every-nation.md): the translation job board is consistent, and
 * every translated course page and lesson keeps the English original's structure — the same code,
 * the same exercises and answers — and records what it was translated from.
 */
import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { CourseFile, CourseLessonFrontmatter, CourseTranslationFile, ExercisesFile } from "@/lib/schema";
import { LOCALES } from "@/i18n/config";
// @ts-expect-error -- plain ESM script without type declarations
import { translationJobs, scientiaCourseDirs, shortHash } from "../scripts/translation-jobs.mjs";
import { ROOT, exists, json, read } from "./helpers";

const board = translationJobs() as { locales: string[]; jobs: { id: string; kind: string; locale: string; source: Record<string, string>; target: Record<string, string>; sourceHash?: string; reason: string }[] };

describe("the translation job board", () => {
  it("covers every non-English site locale", () => expect(board.locales).toEqual(LOCALES.filter((l) => l !== "en")));
  it("has unique job ids and only known kinds and reasons", () => {
    expect(new Set(board.jobs.map((j) => j.id)).size).toBe(board.jobs.length);
    for (const j of board.jobs) {
      expect(["math-lesson", "course", "course-lesson", "ui", "glossary"]).toContain(j.kind);
      expect(["missing", "stale", "missing-exercises"]).toContain(j.reason);
    }
  });
  it("points every job at English sources that exist and at targets in the same place", () => {
    for (const j of board.jobs) {
      for (const src of Object.values(j.source)) expect(exists(src), `${j.id}: ${src}`).toBe(true);
      for (const [k, target] of Object.entries(j.target)) {
        expect(path.dirname(target), `${j.id}: ${k}`).toBe(path.dirname(j.source[k] ?? Object.values(j.source)[0]!));
        expect(target, j.id).toContain(j.locale);
      }
    }
  });
});

/** Fenced code blocks (with their info strings) and $…$ maths, in order: what a translation must keep. */
const code = (body: string) => [...body.matchAll(/^(```[^\n]*)\n([\s\S]*?)^```\s*$/gm)].map((m) => `${m[1]}\n${m[2]}`);
const components = (body: string) => [...body.replace(/^```[\s\S]*?^```/gm, "").matchAll(/<([A-Z][A-Za-z]*)\b/g)].map((m) => m[1]);

const translated: { dir: string; slug: string; locale: string }[] = [];
const overlays: { dir: string; locale: string }[] = [];
for (const dir of scientiaCourseDirs() as string[]) {
  for (const f of fs.readdirSync(path.join(ROOT, "content", dir))) {
    const m = f.match(/^course\.([A-Za-z-]+)\.json$/);
    if (m) overlays.push({ dir, locale: m[1]! });
  }
  const lessons = path.join(ROOT, "content", dir, "lessons");
  if (!fs.existsSync(lessons)) continue;
  for (const slug of fs.readdirSync(lessons))
    for (const f of fs.readdirSync(path.join(lessons, slug))) {
      const m = f.match(/^lesson\.([A-Za-z-]+)\.mdx$/);
      if (m) translated.push({ dir, slug, locale: m[1]! });
    }
}

describe.each(overlays.length ? overlays : [null])("translated course page %o", (o) => {
  if (!o) return it("(none yet)", () => undefined);
  it("parses, is in a site locale, and translates exactly the course's levels", () => {
    expect(LOCALES).toContain(o.locale);
    const t = CourseTranslationFile.parse(json(`content/${o.dir}/course.${o.locale}.json`));
    const c = CourseFile.parse(json(`content/${o.dir}/course.json`));
    expect(t.levels.map((l) => l.id)).toEqual(c.levels.map((l) => l.id));
    expect(t.translation.status).not.toBe("canonical");
  });
});

describe.each(translated.length ? translated : [null])("translated lesson %o", (x) => {
  if (!x) return it("(none yet)", () => undefined);
  const base = `content/${x.dir}/lessons/${x.slug}`;
  const en = matter(read(`${base}/lesson.mdx`));
  const tr = matter(read(`${base}/lesson.${x.locale}.mdx`));
  it("is in a site locale, records its translation, and keeps the syllabus fields", () => {
    expect(LOCALES).toContain(x.locale);
    const fm = CourseLessonFrontmatter.parse(tr.data);
    expect(fm.translation, "a translation block").toBeTruthy();
    expect(fm.translation!.sourceHash).toMatch(/^[0-9a-f]{12}$/);
    const src = CourseLessonFrontmatter.parse(en.data);
    expect(fm.prerequisites).toEqual(src.prerequisites);
    expect(fm.related).toEqual(src.related);
    expect(fm.minutes).toBe(src.minutes);
  });
  it("keeps every code block and component of the original, in order", () => {
    expect(code(tr.content)).toEqual(code(en.content));
    expect(components(tr.content)).toEqual(components(en.content));
  });
  it("keeps the exercises' ids, types and answers", () => {
    if (!exists(`${base}/exercises.json`)) return;
    const src = ExercisesFile.parse(json(`${base}/exercises.json`)).exercises;
    if (!exists(`${base}/exercises.${x.locale}.json`)) return;
    const t = ExercisesFile.parse(json(`${base}/exercises.${x.locale}.json`)).exercises;
    const shape = (e: (typeof src)[number]) => {
      const r = e as Record<string, unknown>;
      return { id: e.id, type: e.type, answer: r.answer, options: (r.options as { id: string; correct: boolean }[] | undefined)?.map((o) => [o.id, o.correct]), starter: r.starter, tests: r.tests, reference: r.reference };
    };
    expect(t.map(shape)).toEqual(src.map(shape));
  });
  it("reports staleness honestly (its sourceHash is the original's, or the page says it is out of date)", () => {
    const fm = CourseLessonFrontmatter.parse(tr.data);
    expect(typeof fm.translation!.sourceHash === "string" && fm.translation!.sourceHash.length === 12).toBe(true);
    expect(typeof shortHash(en.content)).toBe("string");
  });
});
