import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Atom, Bot, Braces, Cog, Cpu, FlaskConical, Gem, GraduationCap, Languages, Sigma, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { getT, resolveLocale } from "@/i18n/server";
import { href } from "@/lib/href";
import { scientiaSubjects } from "@/lib/subjects";

/** Lumenary Prep is its own site. */
const PREP_URL = "https://prep.lumenary.academy";

/** Each Scientia subject's icon and accent. */
const SUBJECT_LOOK: Record<string, { Icon: LucideIcon; accent: string }> = {
  mathematics: { Icon: Sigma, accent: "bg-gold" },
  computerScience: { Icon: Cpu, accent: "bg-compute" },
  programmingLanguages: { Icon: Braces, accent: "bg-compute" },
  electricalEngineering: { Icon: Zap, accent: "bg-sky" },
  robotics: { Icon: Bot, accent: "bg-human" },
  chemistry: { Icon: FlaskConical, accent: "bg-formal" },
  mechanicalEngineering: { Icon: Cog, accent: "bg-sky" },
  materialsScience: { Icon: Gem, accent: "bg-human" },
};

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  return { description: (await getT(await resolveLocale(params)))("divisions.lead") };
}

function Division({ Icon, accent, name, what, badge, text, children, action }: { Icon: LucideIcon; accent: string; name: string; what: string; badge: string; text: string; children?: React.ReactNode; action: React.ReactNode }) {
  return (
    <article className="card relative flex h-full flex-col overflow-hidden p-6">
      <div className={`absolute inset-x-0 top-0 h-1 ${accent}`} aria-hidden="true" />
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-paper-2 text-ink">
          <Icon size={22} aria-hidden="true" />
        </span>
        <span className="chip">{badge}</span>
      </div>
      <h2 className="mt-5 text-2xl font-semibold text-ink" lang="en">
        {name}
      </h2>
      <p className="mt-1 text-xs font-bold uppercase tracking-[0.14em] text-gold-ink">{what}</p>
      <p className="mt-3 leading-relaxed text-ink-2">{text}</p>
      {children}
      <div className="mt-auto pt-6">{action}</div>
    </article>
  );
}

/** Lumenary Academy's front page: its three divisions. Lumenary Math's own front page is /math/. */
export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = await resolveLocale(params);
  const t = await getT(locale);
  const arrow = <ArrowRight size={16} className="rtl:rotate-180" aria-hidden="true" />;
  const { open, pending } = scientiaSubjects();

  return (
    <>
      <section className="relative overflow-hidden border-b border-line">
        <div className="bg-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:radial-gradient(ellipse_at_70%_30%,black,transparent_70%)]" aria-hidden="true" />
        <div className="pointer-events-none absolute -top-40 end-[-10%] h-[36rem] w-[36rem] rounded-full bg-gold/15 blur-3xl" aria-hidden="true" />
        <div className="container-page relative py-14 sm:py-20">
          <p className="eyebrow">{t("divisions.eyebrow")}</p>
          <h1 className="mt-4 text-[2.6rem] font-semibold leading-[1.05] tracking-tight text-ink sm:text-6xl">{t("meta.siteName")}</h1>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-2">{t("divisions.lead")}</p>
        </div>
      </section>

      <section className="container-page py-14 sm:py-16">
        <ul className="grid gap-5 lg:grid-cols-3">
          <li>
            <Division
              Icon={Atom}
              accent="bg-gold"
              name="Lumenary Scientia"
              what={t("divisions.scientiaWhat")}
              badge={t("divisions.scientiaBadge")}
              text={t("divisions.scientiaText")}
              action={
                <a href="#subjects" className="btn btn-primary">
                  {t("divisions.scientiaCta")} {arrow}
                </a>
              }
            >
              <ul className="mt-5 flex flex-wrap gap-1.5" aria-label={t("divisions.available")}>
                {open.map((s) => (
                  <li key={s.key}>
                    <Link href={href(locale, s.path)} className="chip border-gold/50 bg-gold-soft text-gold-ink hover:border-gold">
                      {t(`divisions.${s.key}`)}
                    </Link>
                  </li>
                ))}
              </ul>
            </Division>
          </li>
          <li>
            <Division
              Icon={Languages}
              accent="bg-sky"
              name="Lumenary Lingua"
              what={t("divisions.linguaWhat")}
              badge={t("divisions.available")}
              text={t("divisions.linguaText")}
              action={
                <Link href={href(locale, "lingua")} className="btn btn-primary">
                  {t("divisions.linguaCta")} {arrow}
                </Link>
              }
            />
          </li>
          <li>
            <Division
              Icon={GraduationCap}
              accent="bg-formal"
              name="Lumenary Prep"
              what={t("divisions.prepWhat")}
              badge={t("divisions.prepBadge")}
              text={t("divisions.prepText")}
              action={
                <a href={PREP_URL} className="btn btn-primary">
                  {t("divisions.prepCta")} <ArrowUpRight size={16} className="rtl:-scale-x-100" aria-hidden="true" />
                </a>
              }
            />
          </li>
        </ul>
      </section>

      <section id="subjects" className="scroll-mt-20 border-t border-line bg-paper-2/40" aria-labelledby="subjects-title">
        <div className="container-page py-14 sm:py-16">
          <p className="eyebrow">Lumenary Scientia</p>
          <h2 id="subjects-title" className="mt-3 text-3xl font-semibold text-ink sm:text-4xl">
            {t("divisions.subjectsTitle")}
          </h2>
          <p className="mt-3 max-w-3xl leading-relaxed text-ink-2">{t("divisions.subjectsLead")}</p>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {open.map((s) => {
              const look = SUBJECT_LOOK[s.key] ?? { Icon: Atom, accent: "bg-gold" };
              return (
                <li key={s.key}>
                  <Link href={href(locale, s.path)} className="card group relative flex h-full flex-col overflow-hidden p-5 hover:shadow-[var(--shadow-lg)]">
                    <span className={`absolute inset-x-0 top-0 h-1 ${look.accent}`} aria-hidden="true" />
                    <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-paper-2 text-ink">
                      <look.Icon size={20} aria-hidden="true" />
                    </span>
                    <span className="mt-4 font-display text-xl font-semibold text-ink">{t(`divisions.${s.key}`)}</span>
                    <span className="mt-1.5 text-sm leading-snug text-ink-2">{t(`divisions.${s.key}Text`)}</span>
                    <span className="mt-auto flex items-center justify-between gap-2 pt-4 text-xs text-muted">
                      <span>
                        {s.courses ? `${t("divisions.coursesN", { n: s.courses })} · ` : ""}
                        {t("divisions.lessonsN", { n: s.lessons })}
                      </span>
                      <ArrowRight size={14} className="text-muted transition-transform group-hover:translate-x-0.5 rtl:rotate-180" aria-hidden="true" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
          {pending.length > 0 && (
            <div className="mt-8 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-muted">{t("divisions.pending")}:</span>
              {pending.map((k) => (
                <span key={k} className="chip">
                  {t(`divisions.${k}`)}
                </span>
              ))}
            </div>
          )}
          <p className="mt-10">
            <Link href={href(locale, "divisions")} className="link font-semibold">
              {t("divisions.more")}
            </Link>
          </p>
        </div>
      </section>
    </>
  );
}
