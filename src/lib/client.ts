"use client";

export async function api<T = unknown>(url: string, init?: RequestInit & { json?: unknown }): Promise<T> {
  const { json, ...rest } = init ?? {};
  const res = await fetch(url, {
    ...rest,
    headers: json !== undefined ? { "Content-Type": "application/json", ...rest.headers } : rest.headers,
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });
  if (res.status === 401) {
    location.href = "/login";
    throw new Error("로그인이 필요해요");
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.error ?? `오류 (${res.status})`);
  return data as T;
}

// ---------- 중국어 음성 ----------
let voices: SpeechSynthesisVoice[] = [];
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  const load = () => (voices = window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.addEventListener?.("voiceschanged", load);
}

let audio: HTMLAudioElement | null = null;

export function speak(text: string) {
  const synth = typeof window !== "undefined" ? window.speechSynthesis : undefined;
  if (synth && !voices.length) voices = synth.getVoices();
  const voice =
    voices.find((v) => /zh[-_]TW/i.test(v.lang)) ??
    voices.find((v) => /zh[-_](HK|Hant)/i.test(v.lang)) ??
    voices.find((v) => /^zh|cmn/i.test(v.lang));

  if (synth && voice) {
    synth.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.voice = voice;
    u.lang = voice.lang;
    u.rate = 0.85;
    synth.speak(u);
    return;
  }
  // 휴대폰에 중국어 음성이 없으면 서버 TTS 사용
  audio ??= new Audio();
  audio.play().catch(() => {}); // 사용자 터치 안에서 오디오 잠금 해제
  fetch("/api/tts", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }) })
    .then((r) => (r.ok ? r.blob() : Promise.reject()))
    .then((b) => {
      audio!.src = URL.createObjectURL(b);
      return audio!.play();
    })
    .catch(() => alert("음성을 재생할 수 없어요"));
}

// ---------- 공유 (카톡) ----------
export function stripMarkdown(md: string) {
  return md
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\|?\s*-{2,}[-|\s:]*$/gm, "")
    .replace(/^\|(.+)\|$/gm, (_, row: string) => row.split("|").map((c) => c.trim()).join(" · "))
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export async function copyText(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
}

/** 공유 시트(카톡 포함)를 열고, 안 되면 복사. 결과: shared | copied | cancel */
export async function shareText(text: string): Promise<"shared" | "copied" | "cancel"> {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return "shared";
    } catch (e) {
      if ((e as Error).name === "AbortError") return "cancel";
    }
  }
  await copyText(text);
  return "copied";
}

export function openKakao() {
  location.href = "kakaotalk://launch";
}

export function mapLink(i: { map_url?: string; title_zh?: string; address_zh?: string; title_ko?: string }) {
  if (i.map_url) return i.map_url;
  const qText = i.address_zh || i.title_zh || i.title_ko || "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(qText)}`;
}

export function taipeiToday() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Taipei" });
}
