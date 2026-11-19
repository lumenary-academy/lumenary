import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { resolveLocale } from "@/i18n/server";
import { getCollection, getCourseLesson } from "@/lib/courses";
import { href } from "@/lib/href";
import { mdInline } from "@/lib/markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export const metadata: Metadata = {
  title: "Electives · Lumenary CS",
  description: "Lumenary CS electives: whole courses on fields the main course only touches, from foundations to the research frontier. Free, open source, with tested code.",
};

/** Lumenary CS's electives (content/cs/electives/<id>). English only, like the rest of Lumenary CS. */
export default async function ElectivesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  if (locale !== "en") notFound();
  const courses = getCollection("cs/electives");
  return (
    <div>
      <header className="relative overflow-hidden border-b border-line">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-40 [mask-image:radial-gradient(ellipse_at_top_right,black,transparent_65%)]" aria-hidden="true" />
        <div className="container-page relative py-12 sm:py-16">
          <p className="eyebrow">
            <Link href={href(locale, "cs")} className="hover:underline">
              Lumenary CS
            </Link>
          </p>
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] text-ink sm:text-[3.4rem]">Electives</h1>
          <p className="mt-4 max-w-3xl font-serif text-xl leading-relaxed text-ink-2">
            Whole courses on fields that Lumenary CS&apos;s main course only touches, each from its foundations to the research frontier.
          </p>
          <p className="mt-4 max-w-3xl text-ink-2">
            Each elective says which <Link href={href(locale, "cs")} className="link">Lumenary CS</Link> lessons it builds on. Like the rest of Lumenary CS, every lesson was drafted with AI assistance and is awaiting review by a human expert, and a lesson says <em>Code tested</em> only when all of its code passed Lumenary&apos;s own checks.
          </p>
        </div>
      </header>
      <div className="container-page py-12">
        <ul className="grid gap-5 lg:grid-cols-2">
          {courses.map((c) => {
            const minutes = c.slugs.reduce((sum, s) => sum + getCourseLesson(c, s).frontmatter.minutes, 0);
            return (
              <li key={c.path}>
                <Link prefetch={false} href={href(locale, c.path)} className="card group flex h-full flex-col p-6 hover:shadow-[var(--shadow-lg)]">
                  <span className="font-display text-2xl font-semibold text-ink">{c.course.title}</span>
                  <span className="mt-2 leading-snug text-ink-2" dangerouslySetInnerHTML={{ __html: mdInline(c.course.subtitle) }} />
                  <span className="mt-4 flex flex-wrap gap-1.5">
                    {c.course.levels.map((l) => (
                      <span key={l.id} className="chip">
                        {l.title}
                      </span>
                    ))}
                  </span>
                  <span className="mt-auto inline-flex items-center gap-1 pt-4 text-xs text-muted">
                    {c.slugs.length} lessons · <Clock size={12} aria-hidden="true" /> about {Math.round(minutes / 60)} hours
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
