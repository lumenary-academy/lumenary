import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Languages } from "lucide-react";
import { LOCALE_META } from "@/i18n/config";
import { getT, resolveLocale } from "@/i18n/server";
import { getCourses } from "@/lib/courses";
import { href } from "@/lib/href";
import { mdInline } from "@/lib/markdown";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const t = await getT(await resolveLocale(params));
  return { title: t("lingua.title"), description: t("lingua.lead") };
}

/** Lumenary Lingua's front page, in every locale: its courses, each shown in the language it is taught in. */
export default async function LinguaPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getT(locale);
  const courses = getCourses().filter((c) => c.course.division === "lingua");
  return (
    <div>
      <header className="border-b border-line">
        <div className="container-page py-12 sm:py-16">
          <p className="eyebrow">Lumenary Academy</p>
          <h1 className="mt-4 text-4xl font-semibold text-ink sm:text-5xl" lang="en">
            {t("lingua.title")}
          </h1>
          <p className="mt-4 max-w-2xl text-lg leading-relaxed text-ink-2">{t("lingua.lead")}</p>
        </div>
      </header>
      <div className="container-page py-12">
        <ul className="grid gap-5 md:grid-cols-2">
          {courses.map(({ course, path, slugs }) => {
            const first = course.levels[0]!.short;
            const last = course.levels[course.levels.length - 1]!.short;
            return (
              <li key={path}>
                <article className="card flex h-full flex-col p-6">
                  <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-paper-2 text-ink">
                    <Languages size={22} aria-hidden="true" />
                  </span>
                  <div lang={course.locale} dir={LOCALE_META[course.locale].dir}>
                    <h2 className="mt-5 text-2xl font-semibold text-ink">{course.title}</h2>
                    <p className="mt-2 leading-relaxed text-ink-2" dangerouslySetInnerHTML={{ __html: mdInline(course.subtitle) }} />
                  </div>
                  <p className="mt-4 flex flex-wrap gap-2 text-sm">
                    <span className="chip">{t("lingua.levels", { from: first, to: last })}</span>
                    <span className="chip">{t("lingua.lessons", { n: slugs.length })}</span>
                  </p>
                  <div className="mt-auto pt-6">
                    <Link href={href(locale, path)} className="btn btn-primary">
                      {t("lingua.open")} <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />
                    </Link>
                  </div>
                </article>
              </li>
            );
          })}
        </ul>
        <p className="mt-10 text-ink-2">
          {t("lingua.planned")}{" "}
          <Link href={href(locale, "divisions")} className="link font-semibold">
            {t("lingua.plannedLink")}
          </Link>
        </p>
      </div>
    </div>
  );
}
