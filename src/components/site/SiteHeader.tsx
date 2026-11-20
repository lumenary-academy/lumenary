"use client";

import { ArrowUpRight, Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/client";
import { href } from "@/lib/href";
import { ACADEMY_MORE, ACADEMY_NAV, MATH_MORE, MATH_NAV, navHref, SCIENTIA_MORE, SCIENTIA_NAV, siteSection, type NavItem } from "@/lib/site-nav";
import { LogoMark, Wordmark } from "@/components/brand/Logo";
import { LanguageSelector } from "./LanguageSelector";
import { CatToggle } from "./CatToggle";
import { ThemeToggle } from "./ThemeToggle";

/**
 * The site header. Its navigation depends on the part of the academy the page belongs to (see
 * src/lib/site-nav.ts): Lumenary Math's on Math's pages, Scientia's subjects on the other subjects'
 * pages, and the divisions and project pages everywhere else. `available` lists the course paths that
 * have pages (from the layout, which reads the content), so a subject appears only once its course is published.
 */
export function SiteHeader({ available = [] }: { available?: string[] }) {
  const { locale, t } = useI18n();
  const pathname = usePathname() ?? "";
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const section = siteSection(pathname);
  const published = (item: NavItem) => !item.course || available.includes(item.path);
  const [nav, more] =
    section === "math" ? [MATH_NAV, MATH_MORE] : section === "scientia" ? [SCIENTIA_NAV.filter(published), SCIENTIA_MORE.filter(published)] : [ACADEMY_NAV, ACADEMY_MORE];

  const isActive = (item: NavItem) => {
    const { path } = item;
    if (item.site || path.startsWith("#")) return false;
    const target = `/${locale}/${path}`;
    if (path === "math") return pathname === `${target}/` || pathname === target;
    // Lumenary CS's own pages, but not its programming languages or electives, which have their own links.
    if (path === "cs") return pathname.startsWith(target) && !pathname.startsWith(`${target}/languages`) && !pathname.startsWith(`${target}/electives`);
    if (path === "math/curriculum") return pathname.startsWith(target) || pathname.startsWith(`/${locale}/math/lessons`) || pathname.startsWith(`/${locale}/math/topics`);
    return pathname.startsWith(target);
  };

  /** A navigation link. The divisions with their own sites are plain links, marked as leaving this site. */
  const navLink = (item: NavItem, label: string, className: string) =>
    item.site ? (
      <a key={item.key} href={navHref(item, locale)} title={t(`nav.${item.key}`)} className={className}>
        {label}
        <ArrowUpRight size={13} className="opacity-60 rtl:-scale-x-100" aria-hidden="true" />
      </a>
    ) : (
      <Link key={item.key} href={navHref(item, locale)} aria-current={isActive(item) ? "page" : undefined} title={t(`nav.${item.key}`)} className={className}>
        {label}
      </Link>
    );

  return (
    <header
      data-site-header
      className={`sticky top-0 z-40 border-b transition-colors ${scrolled ? "border-line bg-paper/85 backdrop-blur-md" : "border-transparent bg-paper/60 backdrop-blur-sm"}`}
    >
      <div className="container-page flex h-16 items-center gap-4">
        <Link href={href(locale)} className="flex shrink-0 items-center gap-2.5 text-ink" aria-label={`${t("meta.siteName")} — ${t("nav.home")}`}>
          <LogoMark size={30} />
          <Wordmark />
        </Link>
        <nav className="ms-2 hidden items-center gap-0.5 xl:flex" aria-label="Primary">
          {nav.map((item) =>
            navLink(
              item,
              t(`nav.short.${item.key}`),
              `inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1.5 text-[0.9rem] font-medium transition-colors ${
                isActive(item) ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2 hover:text-ink"
              }`,
            ),
          )}
        </nav>
        <div className="ms-auto flex items-center gap-1">
          <LanguageSelector />
          <CatToggle />
          <ThemeToggle />
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-ink-2 hover:bg-paper-2 xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? t("nav.close") : t("nav.menu")}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" className="border-t border-line bg-paper xl:hidden" aria-label="Primary">
          <ul className="container-page grid grid-cols-2 gap-1 py-3 sm:grid-cols-4">
            {[...nav, ...more].map((item) => (
              <li key={item.key}>
                {navLink(item, t(`nav.${item.key}`), `flex items-center gap-1 rounded-lg px-3 py-2.5 text-sm font-medium ${isActive(item) ? "bg-ink text-paper" : "text-ink-2 hover:bg-paper-2"}`)}
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
