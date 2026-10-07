import { askJson, TRANSLATION_SCHEMA } from "@/lib/agent";

export const maxDuration = 60;

// 한국어 → 대만식 중국어, 또는 중국어 → 한국어
export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text?.trim()) return Response.json({ error: "text 필요" }, { status: 400 });
  const out = await askJson<{ direction: string; ko: string; zh: string; pron: string }>(`다음 문장을 번역해줘.
- 한국어면: 대만에서 자연스럽게 쓰는 번체 중국어로 (점원에게 보여줄 공손한 문장). direction="ko2zh"
- 중국어(또는 영어)면: 자연스러운 한국어로. direction="zh2ko"
- 뜻이 정확해야 해 (맵게/덜 맵게, 넣어/빼 같은 반대 의미 실수 금지). 원문에 없는 내용 추가 금지.
- ko에는 한국어 문장, zh에는 중국어 문장, pron에는 zh를 한글 발음으로 (예: 칭 부야오 샹차이).
문장: ${text}`, "translation", TRANSLATION_SCHEMA);
  return Response.json(out);
}
