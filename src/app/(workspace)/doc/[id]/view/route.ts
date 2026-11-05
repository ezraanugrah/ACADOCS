import type { NextRequest } from "next/server";
import { redirectToFile } from "@/server/file-urls";

export async function GET(request: NextRequest, context: RouteContext<"/doc/[id]/view">) {
  const { id } = await context.params;
  return redirectToFile(request, id, "view");
}
