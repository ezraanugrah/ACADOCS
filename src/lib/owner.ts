import { cleanEnvValue } from "@/lib/supabase/env";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * UUID akun pemilik dari env server (ACADOCS_OWNER_ID).
 * null = belum dikonfigurasi → semua akses workspace ditolak (fail closed).
 */
export function getOwnerId() {
  const id = cleanEnvValue(process.env.ACADOCS_OWNER_ID);
  return id && UUID.test(id) ? id.toLowerCase() : null;
}

export function isOwnerId(userId: string | null | undefined) {
  const ownerId = getOwnerId();
  return Boolean(ownerId && userId && userId.toLowerCase() === ownerId);
}
