import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/current-user";
import { canViewImage, findImageAccess, readImageFile } from "@/lib/images";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const found = findImageAccess(id);
  if (!found) {
    return new NextResponse(null, { status: 404 });
  }
  const user = await getCurrentUser();
  if (!canViewImage(found.access, user)) {
    return new NextResponse(null, { status: 404 });
  }
  const bytes = readImageFile(found.storageName);
  const shared = found.access.kind === "listing" && found.access.listingStatus === "published";
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": found.mime,
      "X-Content-Type-Options": "nosniff",
      "Content-Disposition": "inline",
      "Cache-Control": shared ? "public, max-age=3600" : "private, no-store",
    },
  });
}
