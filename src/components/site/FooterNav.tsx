"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { siteSection, type SiteSection } from "@/lib/site-nav";

export interface FooterLink {
  label: string;
  /** A locale-prefixed path on this site, or a full URL (another site, or the source code). */
  href: string;
}
export interface FooterColumn {
  title: string;
  links: FooterLink[];
}

/**
 * The footer's columns, chosen by the part of the site the page belongs to (src/lib/site-nav.ts).
 * The footer is rendered by the layout, which cannot know the page, so it passes every set of columns
 * and this picks one from the pathname; each exported page's HTML has only its own. `children` is
 * the footer's description of Lumenary Scientia, and Lumenary Math's motto follows it on Math's pages.
 */
export function FooterNav({ columns, motto, children }: { columns: Record<SiteSection, FooterColumn[]>; motto: string; children: React.ReactNode }) {
  const section = siteSection(usePathname() ?? "");
  const cols = columns[section];
  return (
    <div className={`container-page grid gap-10 py-14 sm:grid-cols-2 ${cols.length > 2 ? "lg:grid-cols-[1.4fr_1fr_1fr_1fr]" : "lg:grid-cols-[1.4fr_1fr_1fr]"}`}>
      <div className="max-w-sm">
        {children}
        {section === "math" && <p className="mt-1 text-sm font-semibold tracking-wide text-gold-ink">{motto}</p>}
      </div>
      {cols.map(({ title, links }) => (
        <div key={title}>
          <h2 className="eyebrow">{title}</h2>
          <ul className="mt-4 space-y-2.5">
            {links.map(({ label, href }) => (
              <li key={href}>
                {href.startsWith("https://") ? (
                  <a href={href} className="text-sm text-ink-2 hover:text-ink hover:underline">
                    {label}
                  </a>
                ) : (
                  <Link href={href} className="text-sm text-ink-2 hover:text-ink hover:underline">
                    {label}
                  </Link>
                )}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
