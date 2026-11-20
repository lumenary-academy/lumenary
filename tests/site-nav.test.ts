/**
 * The header's and footer's navigation (src/lib/site-nav.ts): each page gets the navigation of the
 * part of the academy it belongs to, Lumenary Math's tools appear only on Math's pages, and the
 * subjects are listed in one order everywhere.
 */
import { describe, expect, it } from "vitest";
import { ACADEMY_MORE, ACADEMY_NAV, DIVISIONS_NAV, MATH_MORE, MATH_NAV, MATH_PROJECT_PAGES, MATH_TOOLS, navHref, PROJECT_PAGES, SCIENTIA_MORE, SCIENTIA_NAV, siteSection } from "@/lib/site-nav";
import { scientiaSubjects } from "@/lib/subjects";
import { LINGUA_URL, PREP_URL } from "@/lib/sites";
import { json } from "./helpers";

type Tree = { [k: string]: string | Tree };
const nav = json<Tree>("src/i18n/messages/en.json").nav as Tree;
const short = nav.short as Tree;

describe("site sections", () => {
  it("keeps Lumenary Math's pages in Math's section", () => {
    for (const p of ["/en/math/", "/en/math", "/es/math/lessons/collections/", "/en/math/curriculum/", "/en/math/trails/x/", "/en/lab/", "/en/formal/Lumenary.Sets/", "/en/practice/sets/", "/en/progress/", "/en/educators/", "/en/educators/worksheets/sets/"])
      expect(siteSection(p), p).toBe("math");
  });
  it("puts the other subjects' pages, with Lumenary CS's languages and electives, in Scientia's section", () => {
    for (const p of ["/en/cs/", "/en/cs", "/en/cs/functions/", "/en/cs/languages/", "/en/cs/languages/rust/ownership/", "/en/cs/electives/data-science/", "/en/ee/", "/en/robotics/moving/", "/en/chemistry/what-is-matter/", "/en/me/", "/en/materials/", "/en/statistics/describing-data/"])
      expect(siteSection(p), p).toBe("scientia");
  });
  it("treats the front page and the project pages as the academy's", () => {
    for (const p of ["/en/", "/en", "/ar/", "/en/divisions/", "/es/about/", "/en/contribute/", "/en/languages/", "/en/verification/", "/en/mechanics/", "/en/csx/"])
      expect(siteSection(p), p).toBe("academy");
  });
});

describe("navigation lists", () => {
  /** Lumenary Math's own pages, which belong in no other section's navigation. */
  const mathOnly = (path: string) => /^(math|lab|formal|practice|progress|educators)(\/|$)/.test(path);
  const nonMath = { SCIENTIA_NAV, SCIENTIA_MORE, ACADEMY_NAV, ACADEMY_MORE, DIVISIONS_NAV, PROJECT_PAGES };

  it("links Lumenary Math's tools only from Math's pages (Scientia's subject list links Math's front page)", () => {
    for (const [name, list] of Object.entries(nonMath))
      for (const item of list) if (!(name === "SCIENTIA_NAV" && item.path === "math")) expect(mathOnly(item.path), `${name}: ${item.path}`).toBe(false);
    for (const item of MATH_TOOLS) expect(mathOnly(item.path), item.path).toBe(true);
  });

  it("gives the academy's pages the three divisions and the project pages", () => {
    expect([...ACADEMY_NAV, ...ACADEMY_MORE].map((i) => i.key).sort()).toEqual([...DIVISIONS_NAV, ...PROJECT_PAGES].map((i) => i.key).sort());
    expect(navHref(DIVISIONS_NAV.find((i) => i.key === "lingua")!, "es")).toBe(`${LINGUA_URL}/es/`);
    expect(navHref(DIVISIONS_NAV.find((i) => i.key === "prep")!, "es")).toBe(PREP_URL);
    expect(navHref(DIVISIONS_NAV.find((i) => i.key === "scientia")!, "es")).toBe("/es/#subjects");
  });

  it("lists Scientia's subjects in the order of SUBJECTS, with Chemistry right after Mathematics", () => {
    const open = scientiaSubjects().open.map((s) => s.path);
    expect(SCIENTIA_NAV.map((i) => i.path)).toEqual(open);
    expect(open.slice(0, 2)).toEqual(["math", "chemistry"]);
  });

  it("has a label for every item (and a short one for the header's)", () => {
    for (const item of [...MATH_NAV, ...MATH_MORE, ...MATH_PROJECT_PAGES, ...SCIENTIA_NAV, ...SCIENTIA_MORE, ...ACADEMY_NAV, ...ACADEMY_MORE]) expect(typeof nav[item.key], item.key).toBe("string");
    for (const item of [...MATH_NAV, ...SCIENTIA_NAV, ...ACADEMY_NAV]) expect(typeof short[item.key], item.key).toBe("string");
  });
});
