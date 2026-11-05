import type { ReactNode } from "react";
import { requireOwner } from "@/server/auth";

/** Konten workspace hanya dirender setelah sesi pemilik terverifikasi di server. */
export async function OwnerGate({ children }: { children: ReactNode }) {
  await requireOwner();
  return children;
}
