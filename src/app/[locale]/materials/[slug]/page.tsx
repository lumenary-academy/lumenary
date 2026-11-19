import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/i18n/config";
import { resolveLocale } from "@/i18n/server";
import { getCourse, getCourseLesson, lessonLocalesOf } from "@/lib/courses";
import { CourseLessonPage } from "@/components/course/CoursePages";

export const dynamicParams = false;

export function generateStaticParams() {
  const c = getCourse("materials", "scientia");
  return c ? c.slugs.flatMap((slug) => lessonLocalesOf(c, slug).map((locale) => ({ locale, slug }))) : [];
}

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug, locale } = await params;
  const c = getCourse("materials", "scientia");
  if (!c?.slugs.includes(slug)) return {};
  const { frontmatter } = getCourseLesson(c, slug, isLocale(locale) ? locale : undefined);
  return { title: `${frontmatter.title} · ${c.course.title}`, description: frontmatter.subtitle };
}

export default async function MaterialsLessonPage({ params }: Params) {
  const { slug } = await params;
  const locale = await resolveLocale(params);
  const c = getCourse("materials", "scientia");
  if (!c || !c.slugs.includes(slug) || !lessonLocalesOf(c, slug).includes(locale)) notFound();
  return <CourseLessonPage c={c} slug={slug} locale={locale} />;
}
