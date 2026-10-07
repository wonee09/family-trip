import { connection } from "next/server";
import { q } from "@/lib/db";

export async function GET() {
  await connection();
  return Response.json(await q("SELECT * FROM notes ORDER BY id DESC"));
}

export async function POST(req: Request) {
  const { author = "", content } = await req.json();
  if (!content?.trim()) return Response.json({ error: "내용 필요" }, { status: 400 });
  const [row] = await q("INSERT INTO notes (author, content) VALUES ($1, $2) RETURNING *", [author, content.trim()]);
  return Response.json(row);
}
