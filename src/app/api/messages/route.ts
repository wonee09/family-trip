import { connection } from "next/server";
import { q } from "@/lib/db";
import { runAgent } from "@/lib/agent";

export const maxDuration = 120;

type Msg = { id: number; role: "user" | "assistant"; author: string; content: string; created_at: string };

export async function GET(req: Request) {
  await connection();
  const after = Number(new URL(req.url).searchParams.get("after") ?? 0);
  const rows = after
    ? await q<Msg>("SELECT * FROM messages WHERE room = 'family' AND id > $1 ORDER BY id", [after])
    : await q<Msg>("SELECT * FROM (SELECT * FROM messages WHERE room = 'family' ORDER BY id DESC LIMIT 100) t ORDER BY id");
  return Response.json(rows);
}

export async function POST(req: Request) {
  const { author, content } = (await req.json()) as { author?: string; content?: string };
  if (!author || !content?.trim()) return Response.json({ error: "이름과 내용이 필요해요" }, { status: 400 });

  await q("INSERT INTO messages (role, author, content) VALUES ('user', $1, $2)", [author, content.trim()]);
  const history = await q<Msg>(
    "SELECT * FROM (SELECT * FROM messages WHERE room = 'family' ORDER BY id DESC LIMIT 30) t ORDER BY id",
  );

  try {
    const { text, changed } = await runAgent(history, author);
    await q("INSERT INTO messages (role, author, content) VALUES ('assistant', '여행도우미', $1)", [text]);
    return Response.json({ ok: true, changed });
  } catch (e) {
    console.error(e);
    const raw = e instanceof Error ? e.message : String(e);
    const msg = raw.includes("credit") || raw.includes("quota") ? "OpenAI 크레딧이 부족해요. 원장님께 알려주세요." : raw;
    await q("INSERT INTO messages (role, author, content) VALUES ('assistant', '여행도우미', $1)", [
      `⚠️ 답변 중 오류가 났어요: ${msg}`,
    ]);
    return Response.json({ ok: false, error: msg }, { status: 500 });
  }
}
