import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { getCourse, getCourseLesson } from "@/lib/courses";
import { CourseLessonPage } from "@/components/course/CoursePages";

export const dynamicParams = false;

export function generateStaticParams() {
  const c = getCourse("materials", "scientia");
  return c ? c.slugs.map((slug) => ({ locale: c.course.locale, slug })) : [];
}

type Params = { params: Promise<{ locale: string; slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const c = getCourse("materials", "scientia");
  if (!c?.slugs.includes(slug)) return {};
  const { frontmatter } = getCourseLesson(c, slug);
  return { title: `${frontmatter.title} · ${c.course.title}`, description: frontmatter.subtitle };
}

export default async function MaterialsLessonPage({ params }: Params) {
  const { slug } = await params;
  const locale = await resolveLocale(params);
  const c = getCourse("materials", "scientia");
  if (!c || c.course.locale !== locale || !c.slugs.includes(slug)) notFound();
  return <CourseLessonPage c={c} slug={slug} locale={locale} />;
}
