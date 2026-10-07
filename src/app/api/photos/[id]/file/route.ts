import { connection } from "next/server";
import { q } from "@/lib/db";
import { readStored } from "@/lib/storage";

// ?thumb=1 이면 썸네일, ?download=1 이면 다운로드 헤더
export async function GET(req: Request, ctx: RouteContext<"/api/photos/[id]/file">) {
  await connection();
  const { id } = await ctx.params;
  const sp = new URL(req.url).searchParams;
  const [row] = await q<{ storage: string; url: string; thumb_url: string; filename: string; content_type: string }>(
    "SELECT storage, url, thumb_url, filename, content_type FROM photos WHERE id = $1",
    [Number(id)],
  );
  if (!row) return new Response("Not found", { status: 404 });

  const useThumb = sp.has("thumb") && row.thumb_url;
  const file = await readStored(row.storage, useThumb ? row.thumb_url : row.url);
  if (!file) return new Response("Not found", { status: 404 });

  const headers: Record<string, string> = {
    "Content-Type": useThumb ? "image/jpeg" : row.content_type || file.type || "application/octet-stream",
    "Cache-Control": "private, max-age=31536000, immutable",
  };
  if (sp.has("download")) headers["Content-Disposition"] = `attachment; filename*=UTF-8''${encodeURIComponent(row.filename || `photo-${id}.jpg`)}`;
  return new Response(file.body, { headers });
}
