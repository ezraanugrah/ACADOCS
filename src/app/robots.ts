import type { MetadataRoute } from "next";

/** Workspace pribadi: jangan diindeks mesin pencari. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
