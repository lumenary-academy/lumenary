import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { courseLocalesOf, getCourse } from "@/lib/courses";
import { CourseOverview } from "@/components/course/CoursePages";

export const dynamicParams = false;

/** Lumenary ME is taught in English; its pages exist only under /en/ (src/lib/href.ts points other locales there). */
export function generateStaticParams() {
  const c = getCourse("me", "scientia");
  return c ? courseLocalesOf(c).map((locale) => ({ locale })) : [];
}

export function generateMetadata(): Metadata {
  const c = getCourse("me", "scientia");
  return c ? { title: c.course.title, description: c.course.subtitle } : {};
}

export default async function MePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const c = getCourse("me", "scientia");
  if (!c || !courseLocalesOf(c).includes(locale)) notFound();
  return <CourseOverview c={c} locale={locale} />;
}
