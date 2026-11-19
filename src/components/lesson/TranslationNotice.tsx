import { Languages, MessageSquareWarning } from "lucide-react";
import Link from "next/link";
import { LOCALE_META, type Locale } from "@/i18n/config";
import type { TFunction } from "@/i18n/dictionary";
import { href } from "@/lib/href";
import { SITE_URL } from "@/lib/sites";

/** Lumenary Every Nation: volunteers' AI drafts, corrected and reviewed by language experts (docs/i18n/every-nation.md). */
export const EVERY_NATION_URL = "https://github.com/lumenary-academy/lumenary-every-nation";

/** The pre-filled correction form for a translated page; reports go to that language's experts. */
export function correctionUrl(locale: string, pagePath: string): string {
  const page = `${SITE_URL}${href(locale, pagePath)}`;
  const q = new URLSearchParams({ template: "correction.yml", language: locale, page, title: `[${locale}] ${pagePath.replace(/\/+$/, "")}` });
  return `${EVERY_NATION_URL}/issues/new?${q.toString()}`;
}

/**
 * Above a page shown in a language other than English: a fallback, a machine draft or a stale
 * translation is said plainly; on any translated page, readers can suggest a correction.
 */
export function TranslationNotice({ t, requested, rendered, fallback, stale, status, page }: { t: TFunction; requested: Locale; rendered: Locale; fallback: boolean; stale: boolean; status: string; page?: string }) {
  if (requested === "en") return null;
  const messages: string[] = [];
  if (fallback) messages.push(t("language.fallbackNotice", { language: LOCALE_META[requested].nativeName, fallback: LOCALE_META[rendered].nativeName }));
  else if (status === "machine-draft") messages.push(t("language.draftNotice"));
  if (stale) messages.push(t("language.staleNotice"));
  const translated = !fallback && rendered === requested;
  if (!messages.length && !(translated && page)) return null;
  return (
    <div className="flex items-start gap-3 rounded-xl border border-warn/30 bg-warn-soft px-4 py-3 text-sm text-ink" role="note">
      <Languages size={17} className="mt-0.5 shrink-0 text-warn" aria-hidden="true" />
      <div>
        {messages.map((m) => (
          <p key={m}>{m}</p>
        ))}
        <p className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {translated && page && (
            <a href={correctionUrl(requested, page)} className="link inline-flex items-center gap-1" rel="noopener noreferrer">
              <MessageSquareWarning size={13} aria-hidden="true" /> {t("language.suggestCorrection")}
            </a>
          )}
          <Link href={href(requested, "contribute")} className="link">
            {t("language.helpTranslate")} →
          </Link>
        </p>
      </div>
    </div>
  );
}
