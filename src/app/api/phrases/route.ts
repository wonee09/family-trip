import { connection } from "next/server";
import { q } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json(await q("SELECT * FROM phrases ORDER BY favorite DESC, id DESC"));
}

export async function POST(req: Request) {
  const { category = "custom", item_id = null, ko, zh, pron = "", author = "", favorite = false } = await req.json();
  if (!ko || !zh) return Response.json({ error: "ko, zh 필요" }, { status: 400 });
  const [row] = await q(
    "INSERT INTO phrases (category, item_id, ko, zh, pron, created_by, favorite) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *",
    [category, item_id, ko, zh, pron, author, favorite],
  );
  return Response.json(row);
}
