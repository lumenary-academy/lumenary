import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { getCourse, getCourseLesson, getCourses } from "@/lib/courses";
import { CourseLessonPage } from "@/components/course/CoursePages";

export const dynamicParams = false;

export function generateStaticParams() {
  return getCourses()
    .filter((c) => c.course.division === "lingua")
    .flatMap((c) => c.slugs.map((slug) => ({ locale: c.course.locale, course: c.course.id, slug })));
}

type Params = { params: Promise<{ locale: string; course: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { course, slug } = await params;
  const c = getCourse(course, "lingua");
  if (!c?.slugs.includes(slug)) return {};
  const { frontmatter } = getCourseLesson(c, slug);
  return { title: `${frontmatter.title} · ${c.course.title}`, description: frontmatter.subtitle };
}

export default async function LinguaLessonPage({ params }: Params) {
  const { course, slug } = await params;
  const locale = await resolveLocale(params);
  const c = getCourse(course, "lingua");
  if (!c || c.course.locale !== locale || !c.slugs.includes(slug)) notFound();
  return <CourseLessonPage c={c} slug={slug} locale={locale} />;
}
