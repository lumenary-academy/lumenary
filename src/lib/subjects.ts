import "server-only";
import type { Locale } from "@/i18n/config";
import { getLesson, lessonSlugs } from "./content";
import { getCollection, getCourse, getCourseLesson, getCourses, type Collection } from "./courses";
import { pageLocale } from "./href";

/** A subject of Lumenary Scientia that has content, with its size. Names and blurbs are `divisions.<key>` and `divisions.<key>Text`. */
export interface OpenSubject {
  key: string;
  path: string;
  lessons: number;
  /** For a collection of courses (the programming languages): how many. */
  courses?: number;
  /** Lessons the front page offers to try (site paths without the locale). */
  samples: string[];
}

type Entry = { key: string; path?: string; course?: string; collection?: Collection; math?: true; samples?: string[] };

/**
 * Lumenary Scientia's subjects in the order the site lists them. A subject is open once its content exists.
 *
 * `samples` are the lessons the front page offers to try: each subject's first lesson, where its
 * course starts. The programming languages offer the first lesson of two courses: Python, the
 * language of Lumenary CS's own lessons, and JavaScript, the language of the web.
 * Mathematics also offers a lesson for older learners (proof techniques, grades 9–12) beside its
 * first, kindergarten lesson.
 * tests/front-page-samples.test.ts checks that each exists and is in its course's first two levels.
 */
const SUBJECTS: Entry[] = [
  { key: "mathematics", path: "math", math: true, samples: ["math/lessons/collections", "math/lessons/proof-techniques"] },
  { key: "chemistry", path: "chemistry", course: "chemistry", samples: ["chemistry/what-is-matter"] },
  { key: "statistics", path: "statistics", course: "statistics", samples: ["statistics/what-is-statistics"] },
  { key: "computerScience", path: "cs", course: "cs", samples: ["cs/what-is-computing"] },
  { key: "programmingLanguages", path: "cs/languages", collection: "cs/languages", samples: ["cs/languages/python/the-python-way", "cs/languages/javascript/first-steps"] },
  { key: "electricalEngineering", path: "ee", course: "ee", samples: ["ee/what-is-electricity"] },
  { key: "robotics", path: "robotics", course: "robotics", samples: ["robotics/what-is-a-robot"] },
  { key: "mechanicalEngineering", path: "me", course: "me", samples: ["me/forces-and-motion"] },
  { key: "materialsScience", path: "materials", course: "materials", samples: ["materials/materials-around-us"] },
  { key: "physics" },
  { key: "biology" },
  { key: "otherSciences" },
];

export function scientiaSubjects(): { open: OpenSubject[]; pending: string[] } {
  const open: OpenSubject[] = [];
  const pending: string[] = [];
  for (const s of SUBJECTS) {
    const samples = s.samples ?? [];
    if (s.math) open.push({ key: s.key, path: s.path!, lessons: lessonSlugs().length, samples });
    else if (s.course && getCourse(s.course, "scientia")) open.push({ key: s.key, path: s.path!, lessons: getCourse(s.course, "scientia")!.slugs.length, samples });
    else if (s.collection && getCollection(s.collection).length > 0) {
      const courses = getCollection(s.collection);
      open.push({ key: s.key, path: s.path!, lessons: courses.reduce((n, c) => n + c.slugs.length, 0), courses: courses.length, samples });
    } else pending.push(s.key);
  }
  return { open, pending };
}

/** A sample lesson, titled in the language of the page its link opens. */
export interface SampleLesson {
  path: string;
  title: string;
  /** The locale of the lesson's page, and so of its title. */
  lang: string;
  /** For a lesson of a course in a collection (a programming language): the course's title. */
  course?: string;
}

/**
 * A sample lesson's title, read from the lesson in the locale its link opens: a translated Lumenary
 * Math lesson in the page's locale, any other in English. Throws if the lesson does not exist.
 */
export function sampleLesson(path: string, locale: Locale): SampleLesson {
  const lang = pageLocale(locale, path);
  const math = path.match(/^math\/lessons\/([^/]+)$/);
  if (math) {
    if (!lessonSlugs().includes(math[1])) throw new Error(`Sample lesson ${path}: no such Lumenary Math lesson`);
    return { path, title: getLesson(math[1], lang as Locale).frontmatter.title, lang };
  }
  const c = getCourses().find((x) => path.startsWith(`${x.path}/`) && !path.slice(x.path.length + 1).includes("/"));
  const slug = c ? path.slice(c.path.length + 1) : "";
  if (!c || !c.slugs.includes(slug)) throw new Error(`Sample lesson ${path}: no such lesson in a course's syllabus`);
  return { path, title: getCourseLesson(c, slug).frontmatter.title, lang, course: c.collection ? c.course.title : undefined };
}

/**
 * Whether a site link ("/en/robotics/moving/") points into a Scientia subject whose course is not
 * published yet. Lessons may link ahead to a subject that ships in a later release; those links render
 * as plain text until it does, and become links on their own once its course.json exists.
 */
export function linksToUnpublished(href: string | undefined): boolean {
  const m = href?.match(/^\/[a-z]{2,3}(?:-[A-Za-z]+)?\/([a-z][a-z-]*)(?=[/?#]|$)/);
  if (!m) return false;
  const subject = SUBJECTS.find((s) => s.course && s.path === m[1]);
  return subject !== undefined && !getCourse(subject.course!, "scientia");
}

/** Rendered HTML (a course's description) with links into unpublished subjects replaced by their text. */
export function unlinkUnpublished(html: string): string {
  return html.replace(/<a href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/g, (link, to: string, text: string) => (linksToUnpublished(to) ? text : link));
}
