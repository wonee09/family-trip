import { connection } from "next/server";
import { addItem, getItinerary } from "@/lib/db";
import { withPron } from "@/lib/agent";

export async function GET() {
  await connection();
  return Response.json(await getItinerary());
}

export async function POST(req: Request) {
  const { date, ...fields } = await req.json();
  if (!date || !fields.title_ko) return Response.json({ error: "날짜와 제목이 필요해요" }, { status: 400 });
  return Response.json(await addItem(date, await withPron(fields)));
}
