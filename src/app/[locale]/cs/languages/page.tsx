import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { getCourse, getLanguageCourses } from "@/lib/courses";
import { href } from "@/lib/href";
import { mdInline } from "@/lib/markdown";

export const dynamicParams = false;

export function generateStaticParams() {
  return [{ locale: "en" }];
}

export const metadata: Metadata = {
  title: "Programming languages · Lumenary CS",
  description: "Learn to program in the world's major programming languages, from Assembly to Zig: free, open source, with tested code.",
};

/** The programming-language courses, by family. English only, like the rest of Lumenary CS. */
export default async function LanguagesPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  if (locale !== "en") notFound();
  const courses = getLanguageCourses();
  const groups = [...new Set(courses.map((c) => c.course.group ?? "Other"))];
  const cs = getCourse("cs", "scientia");
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
          <h1 className="mt-4 text-4xl font-semibold leading-[1.08] text-ink sm:text-[3.4rem]">Programming languages</h1>
          <p className="mt-4 max-w-3xl font-serif text-xl leading-relaxed text-ink-2">
            {courses.length} languages, from Assembly to Zig. Each course starts from your first program in the language and goes to the idioms, tools and practices of professionals who use it every day.
          </p>
          <p className="mt-4 max-w-3xl text-ink-2">
            New to programming? Start with {cs ? <Link href={href(locale, "cs/what-is-computing")} className="link">Lumenary CS&apos;s first lessons</Link> : "Lumenary CS"}, which teach the ideas behind every language. Every course was drafted with AI assistance and is awaiting review by a human expert in that language. Its complete programs are compiled and run by Lumenary&apos;s own checks; a lesson says <em>Code tested</em> only when all of its code passed.
          </p>
          <nav className="mt-8 flex flex-wrap gap-2" aria-label="Families">
            {groups.map((g) => (
              <a key={g} href={`#${g.toLowerCase().replace(/[^a-z]+/g, "-")}`} className="chip hover:border-line-2 hover:text-ink">
                {g}
              </a>
            ))}
          </nav>
        </div>
      </header>
      <div className="container-page space-y-12 py-12">
        {groups.map((g) => (
          <section key={g} id={g.toLowerCase().replace(/[^a-z]+/g, "-")} className="scroll-mt-24" aria-labelledby={`${g}-title`}>
            <h2 id={`${g}-title`} className="text-2xl font-semibold text-ink">
              {g}
            </h2>
            <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {courses
                .filter((c) => (c.course.group ?? "Other") === g)
                .map(({ course, path, slugs }) => (
                  <li key={path}>
                    <Link prefetch={false} href={href(locale, path)} className="card group flex h-full flex-col p-5 hover:shadow-[var(--shadow-lg)]">
                      <span className="flex items-baseline justify-between gap-3">
                        <span className="font-display text-xl font-semibold text-ink">{course.title}</span>
                        {course.year && <span className="text-xs text-muted">{course.year}</span>}
                      </span>
                      <span className="mt-2 text-sm leading-snug text-ink-2" dangerouslySetInnerHTML={{ __html: mdInline(course.subtitle) }} />
                      <span className="mt-auto pt-3 text-xs text-muted">{slugs.length} lessons</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
