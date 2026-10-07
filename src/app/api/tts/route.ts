import { openai } from "@/lib/agent";

// 휴대폰에 중국어 음성이 없을 때 쓰는 대체 TTS
export async function POST(req: Request) {
  const { text } = await req.json();
  if (!text) return new Response("text 필요", { status: 400 });
  const speech = await openai().audio.speech.create({
    model: "gpt-4o-mini-tts",
    voice: "alloy",
    input: String(text).slice(0, 500),
    instructions: "Speak in Taiwanese Mandarin (台灣國語), clearly and a little slowly.",
    response_format: "mp3",
  });
  return new Response(speech.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "private, max-age=86400" } });
}
