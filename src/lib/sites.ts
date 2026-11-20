/**
 * Lumenary Academy's divisions that have their own sites. This site is the academy's front page and
 * Lumenary Scientia; Lumenary Lingua and Lumenary Prep are built from their own repositories.
 */

/** Lumenary Lingua (github.com/lumenary-academy/lumenary-lingua). Its front page exists in every locale. */
export const LINGUA_URL = "https://lingua.lumenary.academy";

/** Lumenary Prep. */
export const PREP_URL = "https://prep.lumenary.academy";

/** Lumenary Lingua's front page in a locale: https://lingua.lumenary.academy/<locale>/. */
export const linguaHome = (locale: string) => `${LINGUA_URL}/${locale}/`;
