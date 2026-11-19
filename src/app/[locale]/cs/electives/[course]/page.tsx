import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { courseLocalesOf, getCollection, getCollectionCourse } from "@/lib/courses";
import { CourseOverview } from "@/components/course/CoursePages";

export const dynamicParams = false;

/** Lumenary CS electives are taught in English; their pages exist only under /en/. */
export function generateStaticParams() {
  return getCollection("cs/electives").flatMap((c) => courseLocalesOf(c).map((locale) => ({ locale, course: c.course.id })));
}

type Params = { params: Promise<{ locale: string; course: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const c = getCollectionCourse("cs/electives", (await params).course);
  return c ? { title: c.course.title, description: c.course.subtitle } : {};
}

export default async function ElectiveCoursePage({ params }: Params) {
  const { course } = await params;
  const locale = await resolveLocale(params);
  const c = getCollectionCourse("cs/electives", course);
  if (!c || !courseLocalesOf(c).includes(locale)) notFound();
  return <CourseOverview c={c} locale={locale} />;
}
