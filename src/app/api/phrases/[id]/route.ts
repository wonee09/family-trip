import { q } from "@/lib/db";

export async function PATCH(req: Request, ctx: RouteContext<"/api/phrases/[id]">) {
  const { id } = await ctx.params;
  const { favorite } = await req.json();
  const [row] = await q("UPDATE phrases SET favorite = $1 WHERE id = $2 RETURNING *", [!!favorite, Number(id)]);
  return Response.json(row ?? null);
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/phrases/[id]">) {
  const { id } = await ctx.params;
  await q("DELETE FROM phrases WHERE id = $1", [Number(id)]);
  return Response.json({ ok: true });
}
