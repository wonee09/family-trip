import { q } from "@/lib/db";
import { askJson, PHRASES_SCHEMA } from "@/lib/agent";
import type { Phrase } from "@/lib/phrases";

export const maxDuration = 60;

// 특정 장소/상황에서 쓸 표현을 AI로 만들어 저장
export async function POST(req: Request) {
  const { place, category = "custom", item_id = null, author = "", existing = [] } = await req.json();
  if (!place) return Response.json({ error: "place 필요" }, { status: 400 });

  const { phrases } = await askJson<{ phrases: Phrase[] }>(`대만(타이베이)을 여행하는 한국인 가족(5명, 부모님 동반, 예약자 이름 SEO JIHUI)이
"${place}"에서 점원/직원에게 보여주거나 들려줄 실용 표현 6개를 만들어줘.
이미 있는 표현과 겹치지 않게: ${JSON.stringify(existing).slice(0, 1500)}
pron은 중국어 발음을 한글로 (예: 칭 게이 워 차이단), 병음·로마자 금지.`, "phrases", PHRASES_SCHEMA);

  const saved = [];
  for (const p of phrases.slice(0, 8)) {
    if (!p.ko || !p.zh) continue;
    const [row] = await q(
      "INSERT INTO phrases (category, item_id, ko, zh, pron, created_by) VALUES ($1,$2,$3,$4,$5,$6) RETURNING *",
      [category, item_id, p.ko, p.zh, p.pron ?? "", author],
    );
    saved.push(row);
  }
  return Response.json(saved);
}
