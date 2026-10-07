import { q } from "@/lib/db";

export async function DELETE(_req: Request, ctx: RouteContext<"/api/notes/[id]">) {
  const { id } = await ctx.params;
  await q("DELETE FROM notes WHERE id = $1", [Number(id)]);
  return Response.json({ ok: true });
}
