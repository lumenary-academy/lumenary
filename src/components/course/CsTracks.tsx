import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getCollection, getCourse, type LoadedCourse } from "@/lib/courses";
import { href } from "@/lib/href";
import { mdInline } from "@/lib/markdown";

const lessonCount = (courses: LoadedCourse[]) => courses.reduce((n, c) => n + c.slugs.length, 0);

/**
 * On Lumenary CS's front page, before the levels of the main course: its programming-language
 * courses (every language, one click away) and its electives, with the neighbouring subjects.
 */
export function CsTracks({ locale }: { locale: string }) {
  const languages = getCollection("cs/languages");
  const electives = getCollection("cs/electives");
  const neighbours = (["ee", "robotics"] as const).map((id) => getCourse(id, "scientia")).filter((c) => c !== undefined);
  const arrow = <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />;
  return (
    <section className="container-page pt-12" aria-labelledby="cs-tracks">
      <h2 id="cs-tracks" className="sr-only">
        Beyond the main course
      </h2>
      <div className="grid gap-5 lg:grid-cols-[1.65fr_1fr]">
        {languages.length > 0 && (
          <article className="card relative flex flex-col overflow-hidden p-6">
            <div className="absolute inset-x-0 top-0 h-1 bg-compute" aria-hidden="true" />
            <p className="eyebrow">
              Programming languages · {languages.length} courses · {lessonCount(languages)} lessons
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-ink">Learn a language, from Assembly to Zig</h3>
            <p className="mt-2 text-ink-2">Each course goes from your first program in the language to the idioms, tools and practices of professionals who use it every day. Every complete program in it is compiled and run.</p>
            <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Programming-language courses">
              {languages.map((c) => (
                <li key={c.path}>
                  <Link prefetch={false} href={href(locale, c.path)} className="chip border-compute/40 bg-compute-soft text-ink hover:border-compute">
                    {c.course.title}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link href={href(locale, "cs/languages")} className="btn btn-primary">
                All programming languages {arrow}
              </Link>
            </div>
          </article>
        )}
        <div className="flex flex-col gap-5">
          {electives.length > 0 && (
            <article className="card relative overflow-hidden p-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-formal" aria-hidden="true" />
              <p className="eyebrow">Electives</p>
              <h3 className="mt-2 text-2xl font-semibold text-ink">Go deeper into one field</h3>
              <ul className="mt-4 space-y-3">
                {electives.map((c) => (
                  <li key={c.path}>
                    <Link prefetch={false} href={href(locale, c.path)} className="group block">
                      <span className="font-display text-lg font-semibold text-ink group-hover:underline">{c.course.title}</span>
                      <span className="block text-sm text-muted">{c.slugs.length} lessons, from foundations to the frontier</span>
                    </Link>
                  </li>
                ))}
              </ul>
              <Link href={href(locale, "cs/electives")} className="link mt-4 inline-block text-sm font-semibold">
                All electives
              </Link>
            </article>
          )}
          {neighbours.length > 0 && (
            <article className="card relative overflow-hidden p-6">
              <div className="absolute inset-x-0 top-0 h-1 bg-gold" aria-hidden="true" />
              <p className="eyebrow">Next door in Lumenary Scientia</p>
              <ul className="mt-3 space-y-3">
                {neighbours.map((c) => (
                  <li key={c.path}>
                    <Link prefetch={false} href={href(locale, c.path)} className="group block">
                      <span className="font-display text-lg font-semibold text-ink group-hover:underline">{c.course.title}</span>
                      <span className="block text-sm leading-snug text-muted" dangerouslySetInnerHTML={{ __html: mdInline(c.course.subtitle.split(":")[0]!) }} />
                    </Link>
                  </li>
                ))}
              </ul>
            </article>
          )}
        </div>
      </div>
    </section>
  );
}
