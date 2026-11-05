export const MAX_QUERY_LENGTH = 100;

/**
 * Pecah kueri jadi kata (maks. 5). Semua kata harus ada di nama file (AND), tidak peka huruf besar/kecil.
 * `*` dibuang karena PostgREST memperlakukannya sebagai wildcard (nama file Acadocs tidak pernah memuat `*`).
 */
export function searchTerms(raw: string) {
  return raw
    .normalize("NFC")
    .slice(0, MAX_QUERY_LENGTH)
    .replace(/\*/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 5);
}

/** Escape karakter khusus LIKE (`\`, `%`, `_`) agar dicari sebagai teks biasa. */
export function escapeLike(term: string) {
  return term.replace(/[\\%_]/g, (char) => `\\${char}`);
}
