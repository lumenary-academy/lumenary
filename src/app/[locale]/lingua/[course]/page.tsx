import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { getCourse, getCourses } from "@/lib/courses";
import { CourseOverview } from "@/components/course/CoursePages";

export const dynamicParams = false;

/** Each Lingua course is generated only in the locale it is taught in. */
export function generateStaticParams() {
  return getCourses()
    .filter((c) => c.course.division === "lingua")
    .map((c) => ({ locale: c.course.locale, course: c.course.id }));
}

type Params = { params: Promise<{ locale: string; course: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = getCourse((await params).course, "lingua");
  return c ? { title: c.course.title, description: c.course.subtitle } : {};
}

export default async function LinguaCoursePage({ params }: Params) {
  const { course } = await params;
  const locale = await resolveLocale(params);
  const c = getCourse(course, "lingua");
  if (!c || c.course.locale !== locale) notFound();
  return <CourseOverview c={c} locale={locale} />;
}
