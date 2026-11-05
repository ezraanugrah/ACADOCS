/** Metadata satu file. Bentuknya mengikuti tabel `documents` yang direncanakan. */
export type DocumentItem = {
  id: string;
  folder: string;
  name: string;
  extension: string;
  mime_type: string;
  size_bytes: number;
  version: number;
  created_at: string;
  updated_at: string;
};
