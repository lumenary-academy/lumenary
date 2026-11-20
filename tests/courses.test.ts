/**
 * The courses (Lumenary CS with its languages and electives, Lumenary EE, Lumenary Robotics): every
 * course's syllabus, lessons and exercises are well formed,
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
import { CourseCodeReport, CourseFile, CourseLessonFrontmatter, ExercisesFile, GraphFile, type CourseLessonFrontmatter as CourseLessonFrontmatterType, type Exercise } from "@/lib/schema";
import { SECTION_KINDS } from "@/components/lesson/kinds";
// @ts-expect-error -- plain ESM script without type declarations
import { contentLocales } from "../scripts/gen-content-locales.mjs";
import generatedLocales from "@/lib/generated/content-locales.json";
import { dirs, exists, fm, json } from "./helpers";

/** The MDX components a course lesson may use (src/components/course/CoursePages.tsx). */
const COMPONENTS = new Set(["Section", "Definition", "Theorem", "Proof", "Example", "Misconception", "Note", "Analogy", "Figure", "Reflection", "Exercises", "TopicLink", "LessonLink", "Viewpoint", "Narrator"]);
/** Plain HTML/SVG elements are allowed too (figures are inline SVG). */
const MIN_EXERCISES = 4;

/** Every course directory, as src/lib/courses.ts finds them: subjects and the courses nested in a subject. */
const NOT_COURSES = new Set(["math", "pages", "registry", "verification"]);
const COLLECTIONS = ["cs/languages", "cs/electives"];
const courseDirs = [
  ...dirs("content").filter((d) => !NOT_COURSES.has(d) && exists(`content/${d}/course.json`)).sort(),
  ...COLLECTIONS.flatMap((family) => (exists(`content/${family}`) ? dirs(`content/${family}`).filter((d) => exists(`content/${family}/${d}/course.json`)).sort().map((d) => `${family}/${d}`) : [])),
];
const topics = new Set(GraphFile.parse(json("content/math/graph/graph.json")).topics.map((t) => t.id));
/** The Scientia subjects with courses ("cs", "ee", …): Markdown links into them are checked. */
const subjects = new Set(courseDirs.filter((d) => !d.includes("/")));
/** Every course page and lesson page, for checking Markdown links between courses ("/en/cs/…/", "/en/ee/…/"). */
const coursePages = new Set<string>(["/en/cs/languages/", "/en/cs/electives/"]);
for (const dir of courseDirs) {
  try {
    const c = CourseFile.parse(json(`content/${dir}/course.json`));
    const base = `/${c.locale}/${dir}/`;
    coursePages.add(base);
    for (const slug of c.levels.flatMap((l) => l.lessons)) coursePages.add(`${base}${slug}/`);
  } catch {
    // an invalid course.json fails its own syllabus test
  }
}

/** The body outside fenced code blocks and inline code spans (where JSX and `$` mean something to MDX). */
function prose(body: string): string {
  return body.replace(/^(```|~~~)[^\n]*\n[\s\S]*?^\1\s*$/gm, "").replace(/(`+)(?!`)[\s\S]*?[^`]\1(?!`)/g, "");
}

/** ```python run blocks, as the code report counts them. */
function runnableBlocks(body: string): string[] {
  return [...body.matchAll(/^```python[ \t]+run[ \t]*\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1]!);
}

/** ```<lang> check blocks (complete programs run with the language's toolchain), as the code report counts them. */
function checkBlocks(body: string): string[] {
  return [...body.matchAll(/^```([\w#+-]+)[ \t]+check[ \t]*\n([\s\S]*?)^```\s*$/gm)].map((m) => m[1]!);
}

it("there are Lumenary CS, EE, Robotics, Chemistry, ME and Materials and the blockchain elective", () => {
  expect(courseDirs).toEqual(expect.arrayContaining(["cs", "ee", "robotics", "chemistry", "me", "materials", "cs/electives/blockchains-verifiable-computation"]));
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
    if (dir.startsWith("cs/languages/")) {
      expect(dir).toBe(`cs/languages/${course.id}`);
      expect(course.group, "a language course names its family").toBeTruthy();
    } else if (dir.startsWith("cs/electives/")) expect(dir).toBe(`cs/electives/${course.id}`);
    else expect(dir).toBe(course.id);
  });

  describe.each(slugs)("%s", (slug) => {
    const base = `content/${dir}/lessons/${slug}`;
    const present = exists(`${base}/lesson.mdx`) && exists(`${base}/exercises.json`);
    it("has a lesson.mdx and an exercises.json", () => expect(present).toBe(true));
    if (!present) return;
    // A lesson whose files don't parse fails its own test, not the whole suite's collection.
    let loaded: { front: CourseLessonFrontmatterType; body: string; exercises: Exercise[] } | Error;
    try {
      const doc = fm(`${base}/lesson.mdx`);
      loaded = { front: CourseLessonFrontmatter.parse(doc.data), body: doc.content, exercises: ExercisesFile.parse(json(`${base}/exercises.json`)).exercises };
    } catch (err) {
      loaded = err instanceof Error ? err : new Error(String(err));
    }
    it("has frontmatter and exercises that parse", () => expect(loaded instanceof Error ? loaded.message : "ok").toBe("ok"));
    if (loaded instanceof Error) return;
    const { front, body, exercises } = loaded;

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
      expect(exercises.length).toBeGreaterThanOrEqual(MIN_EXERCISES);
      expect(new Set(exercises.map((e) => e.id)).size).toBe(exercises.length);
      for (const ex of exercises) {
        if (ex.type === "python") expect(ex.reference, `${ex.id} needs a reference solution`).toBeTruthy();
        if (ex.type === "choice") expect(ex.options.filter((o) => o.correct).length, ex.id).toBeGreaterThanOrEqual(1);
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
      // Markdown links to other courses' pages must point to pages that exist (anchors allowed).
      for (const m of text.matchAll(/\]\((\/en\/([a-z][a-z-]*)(?:\/[^)#\s]*)?)(?:#[^)\s]*)?\)/g)) {
        if (!subjects.has(m[2]!)) continue;
        const target = m[1]!.endsWith("/") ? m[1]! : `${m[1]}/`;
        expect(coursePages.has(target), `link to ${m[1]}`).toBe(true);
      }
      // The cat guides: every cat who speaks is listed in the frontmatter, and every listed cat speaks.
      const speakers = new Set([...text.matchAll(/<Narrator\s+who="([^"]*)"/g)].map((m) => m[1]!));
      for (const who of speakers) expect(["chloe", "margaret", "gideon"], `<Narrator who="${who}">`).toContain(who);
      expect([...speakers].sort(), "frontmatter narrators lists exactly the cats who speak").toEqual([...new Set(front.narrators)].sort());
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
  expect(href("ar", "cs/languages/rust/")).toBe("/en/cs/languages/rust/");
  expect(href("hi", "ee#levels")).toBe("/en/ee/#levels");
  expect(href("es", "divisions")).toBe("/es/divisions/");
});

it("links into a Scientia subject that is not published yet are plain text until it is", async () => {
  const { linksToUnpublished, unlinkUnpublished } = await import("@/lib/subjects");
  expect(linksToUnpublished("/en/cs/")).toBe(false);
  expect(linksToUnpublished("/en/ee/feedback-control/")).toBe(false);
  expect(linksToUnpublished("/en/math/topics/")).toBe(false);
  expect(linksToUnpublished("https://example.org/en/robotics/")).toBe(false);
  const published = subjects.has("robotics");
  expect(linksToUnpublished("/en/robotics/moving/#motors")).toBe(!published);
  const link = '<a href="/en/robotics/">Lumenary Robotics</a>';
  expect(unlinkUnpublished(`See ${link}.`)).toBe(published ? `See ${link}.` : "See Lumenary Robotics.");
});

it("every subject's cat guides have a role and a question in every set, and courses pick the right set", async () => {
  const { GUIDE_SETS } = await import("@/lib/schema");
  const { getCourses, guideSet } = await import("@/lib/courses");
  const en = json("src/i18n/messages/en.json") as { narrators: { sets: Record<string, Record<string, string>> } };
  for (const set of GUIDE_SETS)
    for (const key of ["chloeRole", "chloeQ", "margaretRole", "margaretQ", "gideonRole", "gideonQ"]) expect(en.narrators.sets[set]?.[key], `narrators.sets.${set}.${key}`).toBeTruthy();
  for (const c of getCourses()) {
    const set = guideSet(c);
    expect(GUIDE_SETS, c.dir).toContain(set);
    if (c.collection === "cs/languages" && !c.course.guides) expect(set, c.dir).toBe("programming");
  }
});
