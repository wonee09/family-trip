import { connection } from "next/server";
import { q, type Item, type Menu } from "@/lib/db";
import { cleanMenu, findMenu } from "@/lib/agent";

export const maxDuration = 120;

// 저장된 메뉴 (없으면 null)
export async function GET(_req: Request, ctx: RouteContext<"/api/itinerary/[id]/menu">) {
  await connection();
  const { id } = await ctx.params;
  const [row] = await q<{ menu: Menu | null }>("SELECT menu FROM itinerary_items WHERE id = $1", [Number(id)]);
  return Response.json(row?.menu ? cleanMenu(row.menu) : null);
}

// 웹에서 메뉴 찾아서 저장 (처음 또는 다시 찾기)
export async function POST(_req: Request, ctx: RouteContext<"/api/itinerary/[id]/menu">) {
  const { id } = await ctx.params;
  const [item] = await q<Item>("SELECT * FROM itinerary_items WHERE id = $1", [Number(id)]);
  if (!item) return Response.json({ error: "없는 일정" }, { status: 404 });
  const menu = { ...cleanMenu(await findMenu(item)), updated_at: new Date().toISOString() };
  await q("UPDATE itinerary_items SET menu = $1 WHERE id = $2", [JSON.stringify(menu), item.id]);
  return Response.json(menu);
}
