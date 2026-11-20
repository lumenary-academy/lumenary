import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { courseLocalesOf, getLanguageCourse, getLanguageCourses } from "@/lib/courses";
import { CourseOverview } from "@/components/course/CoursePages";

export const dynamicParams = false;

/** The programming-language courses are taught in English; their pages exist only under /en/. */
export function generateStaticParams() {
  return getLanguageCourses().flatMap((c) => courseLocalesOf(c).map((locale) => ({ locale, course: c.course.id })));
}

type Params = { params: Promise<{ locale: string; course: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = getLanguageCourse((await params).course);
  return c ? { title: c.course.title, description: c.course.subtitle } : {};
}

export default async function LanguageCoursePage({ params }: Params) {
  const { course } = await params;
  const locale = await resolveLocale(params);
  const c = getLanguageCourse(course);
  if (!c || !courseLocalesOf(c).includes(locale)) notFound();
  return <CourseOverview c={c} locale={locale} />;
}
