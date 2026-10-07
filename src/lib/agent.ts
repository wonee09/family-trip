import OpenAI from "openai";
import type { ResponseInputItem, Tool } from "openai/resources/responses/responses";
import { addItem, deleteItem, getItinerary, q, updateItem } from "./db";
import { GUIDE_MD, TRIP_FACTS } from "./trip";

export const MODEL = process.env.OPENAI_MODEL || "gpt-5.4-mini";

let client: OpenAI | null = null;
export function openai() {
  if (!process.env.OPENAI_API_KEY) throw new Error("OPENAI_API_KEY가 .env에 없습니다.");
  client ??= new OpenAI();
  return client;
}

function taipeiNow() {
  return new Date().toLocaleString("ko-KR", { timeZone: "Asia/Taipei", dateStyle: "full", timeStyle: "short" });
}

const itemProps = {
  time: { type: "string", description: "예: '13:00' 또는 '08:30~17:30'" },
  title_ko: { type: "string", description: "한국어 제목" },
  title_zh: { type: "string", description: "중국어(번체) 장소명" },
  address_zh: { type: "string", description: "중국어(번체) 주소" },
  map_url: { type: "string" },
  category: {
    type: "string",
    enum: ["flight", "transport", "hotel", "restaurant", "korean", "attraction", "shop", "etc"],
    description: "korean = 한식당",
  },
  reserved: { type: "boolean" },
  note: { type: "string" },
};

const TOOLS: Tool[] = [
  { type: "web_search" },
  {
    type: "function",
    name: "add_itinerary_item",
    description: "일정에 항목을 추가한다. 가족이 추가/저장해 달라고 할 때만 사용.",
    strict: false,
    parameters: {
      type: "object",
      properties: { date: { type: "string", description: "YYYY-MM-DD" }, ...itemProps },
      required: ["date", "title_ko", "category"],
    },
  },
  {
    type: "function",
    name: "update_itinerary_item",
    description: "일정 항목을 수정한다 (id는 시스템 프롬프트의 일정 목록 참고). 바꿀 필드만 넣는다. date를 넣으면 날짜 이동.",
    strict: false,
    parameters: {
      type: "object",
      properties: { id: { type: "integer" }, date: { type: "string" }, ...itemProps },
      required: ["id"],
    },
  },
  {
    type: "function",
    name: "delete_itinerary_item",
    description: "일정 항목을 삭제한다. 가족이 명확히 삭제를 원할 때만.",
    strict: false,
    parameters: { type: "object", properties: { id: { type: "integer" } }, required: ["id"] },
  },
  {
    type: "function",
    name: "save_note",
    description: "가족 공용 메모에 저장한다 (와이파이 비번, 집합 장소, 정산 등).",
    strict: false,
    parameters: { type: "object", properties: { content: { type: "string" } }, required: ["content"] },
  },
];

async function runTool(name: string, args: Record<string, unknown>, author: string) {
  switch (name) {
    case "add_itinerary_item": {
      const { date, ...fields } = args;
      return await addItem(String(date), await withPron(fields));
    }
    case "update_itinerary_item": {
      const { id, ...fields } = args;
      return (await updateItem(Number(id), await withPron(fields))) ?? { error: "해당 id 없음" };
    }
    case "delete_itinerary_item":
      return { deleted: await deleteItem(Number(args.id)) };
    case "save_note": {
      const [row] = await q("INSERT INTO notes (author, content) VALUES ($1, $2) RETURNING id", [author, String(args.content)]);
      return { saved: row.id };
    }
    default:
      return { error: `unknown tool ${name}` };
  }
}

async function systemPrompt() {
  const days = await getItinerary();
  const itinerary = days
    .map(
      (d) =>
        `### ${d.date} ${d.title}\n` +
        d.items
          .map((i) => `- [id ${i.id}] ${i.time} ${i.title_ko}${i.title_zh ? ` (${i.title_zh})` : ""} | ${i.category}${i.reserved ? " | 예약완료" : ""}${i.address_zh ? ` | ${i.address_zh}` : ""}${i.note ? ` | ${i.note}` : ""}`)
          .join("\n"),
    )
    .join("\n\n");
  const notes = await q<{ author: string; content: string }>("SELECT author, content FROM notes ORDER BY id DESC LIMIT 30");

  return `너는 한 가족의 대만 여행 비서 "여행도우미"야. 가족 공용 채팅방에서 여러 가족이 함께 질문해.
현재 대만 시각: ${taipeiNow()}

# 답변 원칙
- 쉬운 한국어, **짧고 핵심만** (모바일 화면). 필요하면 표·목록 사용.
- 부모님은 영어를 잘 못 읽어. 장소·메뉴는 영어 대신 **중국어(번체) + 한글 뜻**으로 써. 점원·기사에게 보여줄 문장은 번체 중국어로 따로 적어줘.
- 영업시간, 날씨, 교통, 행사, 맛집 등 바뀔 수 있는 정보는 web_search로 확인하고, 확인 못 했으면 "확인 필요"라고 말해.
- 부모님 동반 여행이라 이동·체력을 고려해 추천.
- 일정 추가/수정/삭제 요청이면 도구를 써서 실제로 반영하고, 무엇을 바꿨는지 한 줄로 알려줘. 추천만 요청하면 바로 저장하지 말고 "일정에 넣을까요?"라고 물어봐.
- 한식당 추천은 category를 "korean"으로.
- 구글지도 링크는 https://www.google.com/maps/search/?api=1&query=<중국어 장소명> 형식으로 만들어도 돼.

# 여행 기본 정보
${TRIP_FACTS}

# 현재 일정 (DB)
${itinerary}

# 가족 공용 메모
${notes.map((n) => `- (${n.author}) ${n.content}`).join("\n") || "(없음)"}

# 참고 자료 (정보 탭 내용)
${GUIDE_MD}`;
}

export async function runAgent(history: { role: "user" | "assistant"; author: string; content: string }[], author: string) {
  const input: ResponseInputItem[] = history.map((m) =>
    m.role === "user"
      ? { role: "user", content: `[${m.author}] ${m.content}` }
      : { role: "assistant", content: m.content },
  );
  const instructions = await systemPrompt();
  let changed = false;

  for (let step = 0; step < 6; step++) {
    const res = await openai().responses.create({
      model: MODEL,
      instructions,
      input,
      tools: TOOLS,
      reasoning: { effort: "low" },
    });

    const calls = res.output.filter((o) => o.type === "function_call");
    if (!calls.length) return { text: res.output_text || "(답변이 비어 있어요. 다시 물어봐 주세요)", changed };

    input.push(...(res.output as ResponseInputItem[]));
    for (const call of calls) {
      let output: unknown;
      try {
        output = await runTool(call.name, JSON.parse(call.arguments || "{}"), author);
        if (call.name !== "save_note") changed = true;
      } catch (e) {
        output = { error: String(e) };
      }
      input.push({ type: "function_call_output", call_id: call.call_id, output: JSON.stringify(output) });
    }
  }
  return { text: "작업이 너무 길어져서 멈췄어요. 조금 나눠서 물어봐 주세요.", changed };
}

// 번역·표현 생성은 점원에게 그대로 보여주므로 더 정확한 모델 사용
export const TRANSLATE_MODEL = process.env.OPENAI_TRANSLATE_MODEL || "gpt-5.4";

// 단발성 JSON 응답 (번역, 표현 생성) — 스키마 강제
export async function askJson<T>(prompt: string, name: string, schema: Record<string, unknown>): Promise<T> {
  const res = await openai().responses.create({
    model: TRANSLATE_MODEL,
    input: prompt,
    reasoning: { effort: "low" },
    text: { format: { type: "json_schema", name, schema, strict: true } },
  });
  return JSON.parse(res.output_text) as T;
}

const PHRASE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ko: { type: "string", description: "한국어 뜻" },
    zh: { type: "string", description: "대만식 번체 중국어" },
    pron: { type: "string", description: "중국어 발음을 한글로 적은 것 (병음·로마자 금지)" },
  },
  required: ["ko", "zh", "pron"],
};

export const TRANSLATION_SCHEMA = {
  ...PHRASE_SCHEMA,
  properties: { direction: { type: "string", enum: ["ko2zh", "zh2ko"] }, ...PHRASE_SCHEMA.properties },
  required: ["direction", "ko", "zh", "pron"],
};

export const PHRASES_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: { phrases: { type: "array", items: PHRASE_SCHEMA } },
  required: ["phrases"],
};

// ---------- 중국어 한글 발음 ----------
/** title_zh가 있고 발음이 비어 있으면 AI로 한글 발음을 채운다 */
export async function withPron<T extends { title_zh?: unknown; zh_pron?: unknown }>(fields: T): Promise<T> {
  const zh = typeof fields.title_zh === "string" ? fields.title_zh.trim() : "";
  if (!zh || (typeof fields.zh_pron === "string" && fields.zh_pron.trim())) return fields;
  try {
    const { pron } = await askJson<{ pron: string }>(
      `다음 대만 중국어(번체)를 한국 사람이 읽을 수 있게 한글 발음으로 적어줘. 기호(→, ·)와 숫자는 그대로 두고, 병음·로마자는 쓰지 마.\n${zh}`,
      "pron",
      { type: "object", additionalProperties: false, properties: { pron: { type: "string" } }, required: ["pron"] },
    );
    return { ...fields, zh_pron: pron };
  } catch {
    return fields;
  }
}

// ---------- 식당 메뉴 ----------
const DISH_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    ko: { type: "string", description: "뜻을 살린 자연스러운 한국어 메뉴 이름 (예: 五花嫩牛 → 우삼겹, 香嫩無骨雞腿 → 뼈 없는 닭다리살). 한자 음독 금지" },
    zh: { type: "string", description: "메뉴판에 있는 중국어(번체) 이름" },
    pron: { type: "string", description: "zh의 한글 발음" },
    price: { type: "string", description: "예: NT$180. 모르면 빈 문자열" },
    desc: { type: "string", description: "한 줄 설명 (재료, 맛, 맵기)" },
  },
  required: ["ko", "zh", "pron", "price", "desc"],
};

const MENU_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string", description: "어떤 가게인지 한두 문장" },
    signature: { type: "array", items: DISH_SCHEMA, description: "대표 메뉴 3~5개" },
    others: { type: "array", items: DISH_SCHEMA, description: "그 밖의 메뉴 5~12개" },
    tips: { type: "string", description: "주문 팁 (부모님 동반, 5명 기준, 고수·매운맛 주의 등)" },
    sources: { type: "array", items: { type: "string" }, description: "참고한 웹페이지 URL" },
  },
  required: ["summary", "signature", "others", "tips", "sources"],
};

export async function findMenu(place: { title_ko: string; title_zh: string; address_zh: string; map_url: string; note: string }) {
  const res = await openai().responses.create({
    model: TRANSLATE_MODEL,
    tools: [{ type: "web_search" }],
    reasoning: { effort: "low" },
    input: `대만 타이베이 식당의 메뉴를 웹에서 찾아서 정리해줘. 한국인 가족 5명(부모님 동반)이 주문할 때 쓸 거야.
식당: ${place.title_ko} ${place.title_zh}
주소: ${place.address_zh}
지도: ${place.map_url}
메모: ${place.note}

규칙:
- 실제로 이 식당 메뉴로 확인된 것만 써. 지어내지 마. 확인이 안 되면 그 사실을 summary에 쓰고, 이 종류 식당의 일반적인 메뉴는 others에 넣되 desc 앞에 "(일반 메뉴)"라고 표시해.
- zh는 메뉴판에 쓰인 번체 이름, pron은 한글 발음(병음 금지), price는 확인된 경우만.
- ko는 한국 사람이 바로 알아듣는 뜻 위주 이름 (五花嫩牛 → "오화연우"가 아니라 "우삼겹").
- summary, desc, tips는 자연스러운 한국어로만 (일본어·중국어 섞지 말고, 필요한 중국어는 괄호로).
- sources에는 실제로 참고한 URL만.`,
    text: { format: { type: "json_schema", name: "menu", schema: MENU_SCHEMA, strict: true } },
  });
  return JSON.parse(res.output_text) as import("./db").Menu;
}

/** 웹검색 인용 링크 "([사이트](url))" 제거 — 출처는 sources에 따로 있음 */
export function cleanMenu(menu: import("./db").Menu): import("./db").Menu {
  const strip = (t: string) =>
    t
      .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .trim();
  const dish = (d: import("./db").MenuDish) => ({ ...d, desc: strip(d.desc) });
  return { ...menu, summary: strip(menu.summary), tips: strip(menu.tips), signature: menu.signature.map(dish), others: menu.others.map(dish) };
}
