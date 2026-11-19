import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { resolveLocale } from "@/i18n/server";
import { getCourse } from "@/lib/courses";
import { CourseOverview } from "@/components/course/CoursePages";
import { CsTracks } from "@/components/course/CsTracks";

export const dynamicParams = false;

/** Lumenary CS is taught in English; its pages exist only under /en/ (src/lib/href.ts points other locales there). */
export function generateStaticParams() {
  const c = getCourse("cs", "scientia");
  return c ? [{ locale: c.course.locale }] : [];
}

export function generateMetadata(): Metadata {
  const c = getCourse("cs", "scientia");
  return c ? { title: c.course.title, description: c.course.subtitle } : {};
}

export default async function CsPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const c = getCourse("cs", "scientia");
  if (!c || c.course.locale !== locale) notFound();
  return <CourseOverview c={c} locale={locale} extra={<CsTracks locale={locale} />} />;
}
