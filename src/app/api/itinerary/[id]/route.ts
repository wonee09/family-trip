import { deleteItem, updateItem } from "@/lib/db";
import { withPron } from "@/lib/agent";

export async function PATCH(req: Request, ctx: RouteContext<"/api/itinerary/[id]">) {
  const { id } = await ctx.params;
  const row = await updateItem(Number(id), await withPron(await req.json()));
  return row ? Response.json(row) : Response.json({ error: "없음" }, { status: 404 });
}

export async function DELETE(_req: Request, ctx: RouteContext<"/api/itinerary/[id]">) {
  const { id } = await ctx.params;
  return Response.json({ deleted: await deleteItem(Number(id)) });
}
