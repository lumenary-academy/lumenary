import { href } from "./href";
import { linguaHome, PREP_URL } from "./sites";

/**
 * The site header's and footer's navigation. They were first designed for Lumenary Math alone; now
 * each page shows the navigation of the part of the academy it belongs to:
 *
 * - "math": Lumenary Math's own pages (/math/…, the labs, practice, progress and the educator
 *   resources, which are built from Math's lessons) keep Math's navigation;
 * - "scientia": the pages of Lumenary Scientia's other subjects show the subjects, the programming
 *   languages and electives, the divisions and the project pages;
 * - "academy": everything else (the front page, the divisions, about, contribute, languages and
 *   verification pages) shows the three divisions and the project pages, and nothing of one subject.
 *
 * Labels are `nav.<key>` (and `nav.short.<key>` in the header). Paths are site paths without the
 * locale; `site` marks a division with its own site, linked by URL.
 */
export type SiteSection = "math" | "scientia" | "academy";

export interface NavItem {
  key: string;
  path: string;
  /** A division built elsewhere: linked to its own site instead of `path`. */
  site?: "lingua" | "prep";
  /** A course's page: listed only once the course is published. */
  course?: true;
}

/** Lumenary Math's navigation, on its own pages. */
export const MATH_NAV: NavItem[] = [
  { key: "math", path: "math" },
  { key: "learn", path: "math/curriculum" },
  { key: "graph", path: "math/graph" },
  { key: "trails", path: "math/trails" },
  { key: "lab", path: "lab" },
  { key: "formal", path: "formal" },
  { key: "practice", path: "practice" },
  { key: "educators", path: "educators" },
  { key: "about", path: "about" },
];
/** The rest of the list in the menu on narrow screens, on Lumenary Math's pages. */
export const MATH_MORE: NavItem[] = [
  { key: "divisions", path: "divisions" },
  { key: "progress", path: "progress" },
  { key: "languages", path: "languages" },
  { key: "contribute", path: "contribute" },
  { key: "verification", path: "verification" },
];
/** Lumenary Math's tools, the footer's Math column on its pages. */
export const MATH_TOOLS: NavItem[] = MATH_NAV.filter((i) => !["math", "educators", "about"].includes(i.key));

/**
 * Lumenary Scientia's subjects, linked to one another on the other subjects' pages. They are in the
 * order of SUBJECTS in src/lib/subjects.ts, which a test checks.
 */
export const SCIENTIA_NAV: NavItem[] = [
  { key: "math", path: "math" },
  { key: "chemistry", path: "chemistry", course: true },
  { key: "statistics", path: "statistics", course: true },
  { key: "cs", path: "cs", course: true },
  { key: "programming", path: "cs/languages", course: true },
  { key: "ee", path: "ee", course: true },
  { key: "robotics", path: "robotics", course: true },
  { key: "me", path: "me", course: true },
  { key: "materials", path: "materials", course: true },
];
/** The rest of the list in the menu on narrow screens, on the other subjects' pages. */
export const SCIENTIA_MORE: NavItem[] = [
  { key: "electives", path: "cs/electives", course: true },
  { key: "divisions", path: "divisions" },
  { key: "about", path: "about" },
  { key: "contribute", path: "contribute" },
];

/** Lumenary Academy's three divisions. Scientia's subjects are listed on the front page. */
export const DIVISIONS_NAV: NavItem[] = [
  { key: "scientia", path: "#subjects" },
  { key: "lingua", path: "", site: "lingua" },
  { key: "prep", path: "", site: "prep" },
];
/** The academy's own pages, which belong to no one subject. */
export const PROJECT_PAGES: NavItem[] = [
  { key: "about", path: "about" },
  { key: "divisions", path: "divisions" },
  { key: "contribute", path: "contribute" },
  { key: "languages", path: "languages" },
  { key: "verification", path: "verification" },
];
/** The footer's project column on Lumenary Math's pages, with Math's educator resources and progress page. */
export const MATH_PROJECT_PAGES: NavItem[] = [
  { key: "about", path: "about" },
  { key: "divisions", path: "divisions" },
  { key: "educators", path: "educators" },
  { key: "contribute", path: "contribute" },
  { key: "languages", path: "languages" },
  { key: "verification", path: "verification" },
  { key: "progress", path: "progress" },
];
/** The header on the academy's pages: the divisions and the main project pages (the rest are in the menu on narrow screens). */
export const ACADEMY_NAV: NavItem[] = [...DIVISIONS_NAV, ...PROJECT_PAGES.filter((i) => ["divisions", "about", "contribute"].includes(i.key))];
export const ACADEMY_MORE: NavItem[] = PROJECT_PAGES.filter((i) => !ACADEMY_NAV.includes(i));

/** Lumenary Math's pages: its front page and everything under /math/, the labs, practice, progress and the educator resources. */
const MATH_PAGES = /^\/[^/]+\/(math|lab|formal|practice|progress|educators)(\/|$)/;
/** The other subjects' pages, by first path segment (cs covers its programming languages and electives). */
const SCIENTIA_PAGES = new RegExp(`^/[^/]+/(${[...new Set(SCIENTIA_NAV.filter((i) => i.key !== "math").map((i) => i.path.split("/")[0]))].join("|")})(/|$)`);

/** The part of the academy a page belongs to, from its pathname ("/en/cs/functions/"). */
export function siteSection(pathname: string): SiteSection {
  if (MATH_PAGES.test(pathname)) return "math";
  if (SCIENTIA_PAGES.test(pathname)) return "scientia";
  return "academy";
}

/** Where a navigation item links: a locale-prefixed page on this site, or a division's own site. */
export function navHref(item: NavItem, locale: string): string {
  if (item.site === "lingua") return linguaHome(locale);
  if (item.site === "prep") return PREP_URL;
  return href(locale, item.path);
}
