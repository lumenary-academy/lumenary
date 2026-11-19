/**
 * Lumenary CS and Lumenary Lingua: every course's syllabus, lessons and exercises are well formed,
 * every lesson compiles, uses only the components courses support, and links only to lessons and
 * topics that exist; and the generated code report is current and all green (docs/courses.md).
 */
import { describe, expect, it } from "vitest";
import { compile } from "@mdx-js/mdx";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { katexOptions } from "@/lib/markdown";
import { rehypeKatexHtml } from "@/lib/rehype-katex-html";
import { CourseCodeReport, CourseFile, CourseLessonFrontmatter, ExercisesFile, GraphFile, type Exercise } from "@/lib/schema";
import { SECTION_KINDS } from "@/components/lesson/kinds";
// @ts-expect-error -- plain ESM script without type declarations
import { contentLocales } from "../scripts/gen-content-locales.mjs";
import generatedLocales from "@/lib/generated/content-locales.json";
import { dirs, exists, fm, json } from "./helpers";

/** The MDX components a course lesson may use (src/components/course/CoursePages.tsx). */
const COMPONENTS = new Set(["Section", "Definition", "Theorem", "Proof", "Example", "Misconception", "Note", "Analogy", "Figure", "Reflection", "Exercises", "TopicLink", "LessonLink", "Say", "Viewpoint"]);
/** Plain HTML/SVG elements are allowed too (figures are inline SVG). */
const MIN_EXERCISES = { scientia: 4, lingua: 6 } as const;

const courseDirs = [
  ...(exists("content/cs/course.json") ? ["cs"] : []),
  ...(exists("content/cs/languages") ? dirs("content/cs/languages").filter((d) => exists(`content/cs/languages/${d}/course.json`)).map((d) => `cs/languages/${d}`) : []),
  ...(exists("content/lingua") ? dirs("content/lingua").filter((d) => exists(`content/lingua/${d}/course.json`)).map((d) => `lingua/${d}`) : []),
];
const topics = new Set(GraphFile.parse(json("content/math/graph/graph.json")).topics.map((t) => t.id));

/** Lines outside fenced code blocks (where JSX and `$` mean something to MDX). */
function prose(body: string): string {
  return body.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gm, "");
}

/** ```python run blocks, as the code report counts them. */
function runnableBlocks(body: string): string[] {
  return [...body.matchAll(/^```python[ \t]+run[ \t]*\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1]!);
}

/** ```<lang> check blocks (complete programs run with the language's toolchain), as the code report counts them. */
function checkBlocks(body: string): string[] {
  return [...body.matchAll(/^```([\w#+-]+)[ \t]+check[ \t]*\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1]!);
}

it("there is Lumenary CS and at least the two first Lingua courses", () => {
  expect(courseDirs).toEqual(expect.arrayContaining(["cs", "lingua/spanish", "lingua/ingles"]));
});

it("the index of course locales is current (node scripts/gen-content-locales.mjs)", () => {
  expect(generatedLocales).toEqual(contentLocales());
});

const report = exists("content/verification/course-code-report.json") ? CourseCodeReport.parse(json("content/verification/course-code-report.json")) : null;

describe.each(courseDirs)("course %s", (dir) => {
  const course = CourseFile.parse(json(`content/${dir}/course.json`));
  const slugs = course.levels.flatMap((l) => l.lessons);

  it("has a valid syllabus: unique slugs, every lesson directory listed, the course id matching its directory", () => {
    expect(new Set(slugs).size).toBe(slugs.length);
    expect(new Set(course.levels.map((l) => l.id)).size).toBe(course.levels.length);
    expect(dirs(`content/${dir}/lessons`).sort()).toEqual([...slugs].sort());
    if (course.division === "lingua") expect(dir).toBe(`lingua/${course.id}`);
    else if (dir.startsWith("cs/languages/")) {
      expect(dir).toBe(`cs/languages/${course.id}`);
      expect(course.group, "a language course names its family").toBeTruthy();
    } else expect(dir).toBe(course.id);
  });

  describe.each(slugs)("%s", (slug) => {
    const base = `content/${dir}/lessons/${slug}`;
    const present = exists(`${base}/lesson.mdx`) && exists(`${base}/exercises.json`);
    it("has a lesson.mdx and an exercises.json", () => expect(present).toBe(true));
    if (!present) return;
    const doc = fm(`${base}/lesson.mdx`);
    const front = CourseLessonFrontmatter.parse(doc.data);
    const body = doc.content;
    const exercises: Exercise[] = ExercisesFile.parse(json(`${base}/exercises.json`)).exercises;

    it("has valid frontmatter and builds only on earlier lessons and real math topics", () => {
      for (const p of front.prerequisites) {
        expect(slugs.indexOf(p), `prerequisite ${p}`).toBeGreaterThanOrEqual(0);
        expect(slugs.indexOf(p), `prerequisite ${p} comes later`).toBeLessThan(slugs.indexOf(slug));
      }
      for (const id of front.related) expect(topics.has(id), id).toBe(true);
      for (const r of front.references) if (r.url) expect(r.url, r.title).toMatch(/^https:\/\//);
    });

    it("has enough well-formed exercises", () => {
      const file = ExercisesFile.parse(json(`${base}/exercises.json`));
      expect(file.lesson).toBe(slug);
      expect(exercises.length).toBeGreaterThanOrEqual(MIN_EXERCISES[course.division]);
      expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
      for (const ex of exercises) {
        if (ex.type === "python") expect(ex.reference, `${ex.id} needs a reference solution`).toBeTruthy();
        if (ex.type === "choice") expect(ex.options.filter((o) => o.correct).length, ex.id).toBeGreaterThanOrEqual(1);
        if (ex.type === "text" && course.division === "lingua") expect(ex.lang, `${ex.id} needs lang`).toBeTruthy();
      }
    });

    it("uses only course components, valid sections, and links that exist", () => {
      const text = prose(body);
      const used = new Set([...text.matchAll(/<([A-Z][A-Za-z]*)\b/g)].map((m) => m[1]!));
      for (const name of used) expect(COMPONENTS.has(name), `<${name}> is not available in courses`).toBe(true);
      const sections = [...text.matchAll(/<Section\b([^>]*)>/g)].map((m) => Object.fromEntries([...m[1]!.matchAll(/(\w+)="([^"]*)"/g)].map((a) => [a[1], a[2]])));
      expect(sections.length).toBeGreaterThanOrEqual(3);
      expect(new Set(sections.map((s) => s.id)).size).toBe(sections.length);
      for (const s of sections) {
        expect(s.id && s.title, "every Section has an id and a title").toBeTruthy();
        expect(Object.keys(SECTION_KINDS), `kind "${s.kind}"`).toContain(s.kind);
      }
      expect((text.match(/<Exercises\s*\/>/g) ?? []).length, "one <Exercises/>").toBe(1);
      for (const m of text.matchAll(/<LessonLink\s+slug="([^"]+)"/g)) expect(slugs, `LessonLink ${m[1]}`).toContain(m[1]);
      for (const m of text.matchAll(/<TopicLink\s+id="([^"]+)"/g)) expect(topics.has(m[1]!), `TopicLink ${m[1]}`).toBe(true);
      for (const m of text.matchAll(/<Say\b([^>]*)>/g)) expect(m[1], "<Say> needs lang").toMatch(/lang="[a-z]{2}(-[A-Z]{2})?"/);
    });

    it("compiles as MDX with valid maths", async () => {
      const file = await compile(body, { remarkPlugins: [remarkGfm, remarkMath], rehypePlugins: [[rehypeKatex, katexOptions], rehypeKatexHtml] });
      const katex = file.messages.filter((m) => m.source === "rehype-katex");
      expect(katex.map((m) => m.reason)).toEqual([]);
    });

    it("has all its runnable code in the code report, passing (compute/verify_courses.py)", () => {
      const snippets = runnableBlocks(body).length;
      const checks = checkBlocks(body).length;
      const pythonExercises = exercises.filter((e) => e.type === "python").length;
      if (snippets + checks + pythonExercises === 0) return;
      const row = report?.lessons[`${dir}/${slug}`];
      expect(row, "run npm run verify:courses").toBeTruthy();
      expect({ ...row!, checksPassed: undefined, checksSkipped: undefined }).toEqual({
        snippets, snippetsPassed: snippets, exercises: pythonExercises, exercisesPassed: pythonExercises, checks, checksPassed: undefined, checksSkipped: undefined,
      });
      // A check may be skipped where its toolchain isn't installed (CI); it may never fail.
      expect(row!.checksPassed + row!.checksSkipped, "every check passed or was skipped").toBe(checks);
    });
  });
});

it("course pages are linked to their teaching locale", async () => {
  const { href } = await import("@/lib/href");
  expect(href("es", "cs/complexity")).toBe("/en/cs/complexity/");
  expect(href("ar", "lingua/ingles")).toBe("/es/lingua/ingles/");
  expect(href("es", "lingua/spanish/sounds-and-greetings")).toBe("/en/lingua/spanish/sounds-and-greetings/");
  expect(href("hi", "lingua")).toBe("/hi/lingua/");
});
