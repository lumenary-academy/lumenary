/**
 * The header's and footer's navigation (src/lib/site-nav.ts): each page gets the navigation of the
 * part of the site it belongs to, Lumenary Math's tools appear only on Math's pages, the subjects are
 * listed in one order everywhere, and Lumenary Academy's own pages (its front page and divisions
 * page) are linked on its site, not here.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { DIVISIONS_NAV, MATH_MORE, MATH_NAV, MATH_PROJECT_PAGES, MATH_TOOLS, navHref, PROJECT_PAGES, SCIENTIA_MORE, SCIENTIA_NAV, siteSection } from "@/lib/site-nav";
import { scientiaSubjects } from "@/lib/subjects";
import { ACADEMY_URL, LINGUA_URL, PREP_URL, SOURCE_URL } from "@/lib/sites";
import { json, ROOT } from "./helpers";

type Tree = { [k: string]: string | Tree };
const nav = json<Tree>("src/i18n/messages/en.json").nav as Tree;
const short = nav.short as Tree;
const ALL = [...MATH_NAV, ...MATH_MORE, ...MATH_PROJECT_PAGES, ...SCIENTIA_NAV, ...SCIENTIA_MORE, ...DIVISIONS_NAV, ...PROJECT_PAGES];

describe("site sections", () => {
  it("keeps Lumenary Math's pages in Math's section", () => {
    for (const p of ["/en/math/", "/en/math", "/es/math/lessons/collections/", "/en/math/curriculum/", "/en/math/trails/x/", "/en/lab/", "/en/formal/Lumenary.Sets/", "/en/practice/sets/", "/en/progress/", "/en/educators/", "/en/educators/worksheets/sets/"])
      expect(siteSection(p), p).toBe("math");
  });
  it("puts every other page in Scientia's section: the front page, the other subjects and the project pages", () => {
    for (const p of ["/en/cs/", "/en/cs", "/en/cs/functions/", "/en/cs/languages/", "/en/cs/languages/rust/ownership/", "/en/cs/electives/data-science/", "/en/ee/", "/en/robotics/moving/", "/en/chemistry/what-is-matter/", "/en/me/", "/en/materials/", "/en/statistics/describing-data/"])
      expect(siteSection(p), p).toBe("scientia");
    for (const p of ["/en/", "/en", "/ar/", "/es/about/", "/en/contribute/", "/en/languages/", "/en/verification/", "/en/mathematics/", "/en/csx/"]) expect(siteSection(p), p).toBe("scientia");
  });
});

describe("navigation lists", () => {
  /** Lumenary Math's own pages, which belong in no other section's navigation. */
  const mathOnly = (path: string) => /^(math|lab|formal|practice|progress|educators)(\/|$)/.test(path);
  const nonMath = { SCIENTIA_NAV, SCIENTIA_MORE, DIVISIONS_NAV, PROJECT_PAGES };

  it("links Lumenary Math's tools only from Math's pages (Scientia's subject list links Math's front page)", () => {
    for (const [name, list] of Object.entries(nonMath))
      for (const item of list) if (!(name === "SCIENTIA_NAV" && item.path === "math")) expect(mathOnly(item.path), `${name}: ${item.path}`).toBe(false);
    for (const item of MATH_TOOLS) expect(mathOnly(item.path), item.path).toBe(true);
  });

  it("links Lumenary Academy, Lingua, Prep and the source code on their own sites", () => {
    const find = (key: string) => [...DIVISIONS_NAV, ...PROJECT_PAGES].find((i) => i.key === key)!;
    expect(DIVISIONS_NAV.map((i) => i.key)).toEqual(["academy", "lingua", "prep"]);
    expect(navHref(find("academy"), "es")).toBe(`${ACADEMY_URL}/es/`);
    expect(navHref(find("lingua"), "es")).toBe(`${LINGUA_URL}/es/`);
    expect(navHref(find("prep"), "es")).toBe(PREP_URL);
    expect(navHref(find("source"), "es")).toBe(SOURCE_URL);
    expect(ACADEMY_URL).toBe("https://lumenary.academy");
    expect(SOURCE_URL).toBe("https://github.com/lumenary-academy/lumenary-scientia");
  });

  it("links the divisions page on Lumenary Academy's site, never on this one", () => {
    for (const item of ALL) expect(navHref(item, "en"), item.key).not.toMatch(/^\/[^/]+\/divisions\//);
    expect(navHref(MATH_MORE.find((i) => i.key === "divisions")!, "sw")).toBe(`${ACADEMY_URL}/sw/divisions/`);
  });

  it("lists Scientia's subjects in the order of SUBJECTS, with Chemistry right after Mathematics", () => {
    const open = scientiaSubjects().open.map((s) => s.path);
    expect(SCIENTIA_NAV.map((i) => i.path)).toEqual(open);
    expect(open.slice(0, 2)).toEqual(["math", "chemistry"]);
  });

  it("has a label for every item (and a short one for the header's)", () => {
    for (const item of ALL) expect(typeof nav[item.key], item.key).toBe("string");
    for (const item of [...MATH_NAV, ...SCIENTIA_NAV]) expect(typeof short[item.key], item.key).toBe("string");
  });
});

describe("content", () => {
  it("links the divisions page on Lumenary Academy's site, never on this one", () => {
    const sources = ["content/pages", "content/math", "content/cs", "content/ee", "content/robotics", "content/chemistry", "content/me", "content/materials", "content/statistics"].flatMap((dir) =>
      fs
        .readdirSync(path.join(ROOT, dir), { recursive: true, encoding: "utf8" })
        .filter((f) => /\.(mdx|json)$/.test(f))
        .map((f) => path.join(dir, f)),
    );
    expect(sources.length).toBeGreaterThan(400);
    // A Markdown link or an href to a divisions/ page anywhere but lumenary.academy: "](../divisions/)", "](/en/divisions/)".
    const local = /(\]\(|href=["'])(?!https:\/\/lumenary\.academy\/)[^)"'\s]*\bdivisions\//;
    for (const f of sources) expect(fs.readFileSync(path.join(ROOT, f), "utf8"), f).not.toMatch(local);
  });
});
