/**
 * The front page's sample lessons ("Try a lesson"): every link targets a lesson that exists. Lumenary
 * Scientia's are checked against this repository's syllabi; Lumenary Lingua's against a pinned copy of
 * its syllabi (its content is in its own repository). Lumenary Prep's content is private: its links
 * were checked with curl when they were chosen (see PREP_SAMPLES in src/lib/sites.ts), so here they
 * are only checked to be well formed.
 */
import { describe, expect, it } from "vitest";
import { LOCALES } from "@/i18n/config";
import { lessonSlugs } from "@/lib/content";
import { getCourses } from "@/lib/courses";
import { href } from "@/lib/href";
import { LINGUA_SAMPLES, LINGUA_URL, linguaLesson, PREP_SAMPLES, PREP_URL, prepLesson } from "@/lib/sites";
import { sampleLesson, scientiaSubjects } from "@/lib/subjects";
import { json } from "./helpers";

/**
 * Lumenary Lingua's courses, copied from lumenary-lingua's content/lingua/<id>/course.json (commit
 * a41be2c, 19 November 2026): the locale each is taught in, its title and its lessons in order.
 */
const LINGUA_SYLLABI: Record<string, { locale: string; title: string; first: { slug: string; title: string }; lessons: string[] }> = {
  spanish: {
    locale: "en",
    title: "Spanish, taught in English",
    first: { slug: "sounds-and-greetings", title: "Sounds and greetings" },
    lessons: [
      ...["sounds-and-greetings", "who-you-are", "numbers-and-time", "family-and-descriptions", "daily-routine", "food-and-places"],
      ...["what-happened", "trips-and-irregular-pasts", "when-i-was-young", "plans-and-future", "body-health-and-commands", "home-town-and-comparisons"],
      ...["telling-a-story", "wishes-and-advice", "feelings-and-doubt", "work-and-hypotheses", "news-and-experiences", "opinions-and-debate"],
      ...["if-i-were", "conditions-and-time-clauses", "science-and-the-impersonal", "reported-speech", "formal-writing", "regional-spanish"],
      ...["argument-and-connectors", "nuances-of-mood-and-aspect", "reading-literature", "professional-and-academic", "humour-and-colloquial-speech", "media-and-rhetoric"],
      ...["style-and-register", "translation-pitfalls", "golden-age-spanish", "dialects-and-society", "oratory", "writing-with-precision"],
    ],
  },
  ingles: {
    locale: "es",
    title: "Inglés, enseñado en español",
    first: { slug: "sonidos-y-saludos", title: "Sonidos y saludos" },
    lessons: [
      ...["sonidos-y-saludos", "quien-eres", "numeros-y-horas", "familia-y-descripciones", "rutina-diaria", "comida-y-lugares"],
      ...["lo-que-paso", "mientras-ocurria", "planes-y-futuro", "comparaciones", "obligaciones-y-consejos", "experiencias"],
      ...["contar-historias", "condicionales", "la-voz-pasiva", "estilo-indirecto", "oraciones-de-relativo", "phrasal-verbs"],
      ...["condicionales-del-pasado", "deseos-y-arrepentimientos", "deducciones", "gerundios-e-infinitivos", "conectores", "ingles-formal"],
      ...["enfasis-e-inversion", "colocaciones", "ingles-academico", "modismos", "variedades-del-ingles", "medios-y-retorica"],
      ...["estilo-y-registro", "falsos-amigos", "literatura-clasica", "humor-y-juegos-de-palabras", "oratoria", "escribir-con-precision"],
    ],
  },
};

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

describe("Lumenary Lingua's sample lessons", () => {
  it("are the first lesson of each course, at its address on Lingua's site", () => {
    expect(LINGUA_SAMPLES.map((s) => s.course).sort()).toEqual(Object.keys(LINGUA_SYLLABI).sort());
    for (const s of LINGUA_SAMPLES) {
      const syllabus = LINGUA_SYLLABI[s.course];
      expect(syllabus.lessons, s.slug).toContain(s.slug);
      expect({ locale: s.locale, slug: s.slug, title: s.title, courseTitle: s.courseTitle }).toEqual({ locale: syllabus.locale, ...syllabus.first, courseTitle: syllabus.title });
      expect(linguaLesson(s)).toBe(`${LINGUA_URL}/${syllabus.locale}/${s.course}/${s.slug}/`);
    }
  });
});

describe("Lumenary Prep's sample lessons", () => {
  it("are well-formed lesson addresses on Prep's site", () => {
    expect(PREP_SAMPLES.length).toBeGreaterThanOrEqual(3);
    for (const s of PREP_SAMPLES) {
      expect(prepLesson(s)).toMatch(new RegExp(`^${PREP_URL.replace(/\./g, "\\.")}/courses/[a-z0-9-]+/lessons/[a-z0-9-]+$`));
      expect(s.title.length).toBeGreaterThan(0);
      expect(s.exam.length).toBeGreaterThan(0);
    }
  });
});

describe("the front page's strings", () => {
  it("exist in every locale", () => {
    for (const locale of LOCALES) {
      const d = json<{ divisions: Record<string, string> }>(`src/i18n/messages/${locale}.json`).divisions;
      for (const key of ["tryLesson", "prepTry", "prepTryNote"]) expect(typeof d[key], `${locale}: divisions.${key}`).toBe("string");
    }
  });
});
