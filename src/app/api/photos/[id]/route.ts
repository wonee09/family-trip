import { q } from "@/lib/db";
import { removeStored } from "@/lib/storage";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/photos/[id]">) {
  const { id } = await ctx.params;
  const [row] = await q<{ storage: string; url: string; thumb_url: string }>(
    "DELETE FROM photos WHERE id = $1 RETURNING storage, url, thumb_url",
    [Number(id)],
  );
  if (row) await removeStored(row.storage, [row.url, row.thumb_url]);
  return Response.json({ ok: true });
}
