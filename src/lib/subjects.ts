import "server-only";
import { lessonSlugs } from "./content";
import { getCollection, getCourse, type Collection } from "./courses";

/** A subject of Lumenary Scientia that has content, with its size. Names and blurbs are `divisions.<key>` and `divisions.<key>Text`. */
export interface OpenSubject {
  key: string;
  path: string;
  lessons: number;
  /** For a collection of courses (the programming languages): how many. */
  courses?: number;
}

type Entry = { key: string; path?: string; course?: string; collection?: Collection; math?: true };

/** Lumenary Scientia's subjects in the order the site lists them. A subject is open once its content exists. */
const SUBJECTS: Entry[] = [
  { key: "mathematics", path: "math", math: true },
  { key: "computerScience", path: "cs", course: "cs" },
  { key: "programmingLanguages", path: "cs/languages", collection: "cs/languages" },
  { key: "electricalEngineering", path: "ee", course: "ee" },
  { key: "robotics", path: "robotics", course: "robotics" },
  { key: "chemistry", path: "chemistry", course: "chemistry" },
  { key: "mechanicalEngineering", path: "me", course: "me" },
  { key: "materialsScience", path: "materials", course: "materials" },
  { key: "physics" },
  { key: "biology" },
  { key: "otherSciences" },
];

export function scientiaSubjects(): { open: OpenSubject[]; pending: string[] } {
  const open: OpenSubject[] = [];
  const pending: string[] = [];
  for (const s of SUBJECTS) {
    if (s.math) open.push({ key: s.key, path: s.path!, lessons: lessonSlugs().length });
    else if (s.course && getCourse(s.course, "scientia")) open.push({ key: s.key, path: s.path!, lessons: getCourse(s.course, "scientia")!.slugs.length });
    else if (s.collection && getCollection(s.collection).length > 0) {
      const courses = getCollection(s.collection);
      open.push({ key: s.key, path: s.path!, lessons: courses.reduce((n, c) => n + c.slugs.length, 0), courses: courses.length });
    } else pending.push(s.key);
  }
  return { open, pending };
}
