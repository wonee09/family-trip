"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useMe, useToast } from "@/components/AppShell";
import MenuSheet from "@/components/MenuSheet";
import ShowToClerk from "@/components/ShowToClerk";
import { api, speak } from "@/lib/client";
import type { Day, Item } from "@/lib/db";
import { BASE_PHRASES, ITEM_TO_PHRASE, PHRASE_CATEGORIES, type Phrase, type PhraseCategory } from "@/lib/phrases";

type SavedPhrase = Phrase & { id: number; category: string; item_id: number | null; favorite: boolean };
type Shown = Phrase & { id?: number; favorite?: boolean; reverse?: boolean };
type Cat = PhraseCategory | "saved" | "place";

export default function SpeakPage() {
  const { me } = useMe();
  const toast = useToast();
  const [item, setItem] = useState<Item | null>(null);
  const [cat, setCat] = useState<Cat>("basic");
  const [saved, setSaved] = useState<SavedPhrase[]>([]);
  const [show, setShow] = useState<Shown | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState<"" | "translate" | "generate">("");

  const loadSaved = useCallback(() => api<SavedPhrase[]>("/api/phrases").then(setSaved).catch(() => {}), []);

  useEffect(() => {
    loadSaved();
    const id = Number(new URLSearchParams(location.search).get("item"));
    if (!id) return;
    api<(Day & { items: Item[] })[]>("/api/itinerary").then((days) => {
      const found = days.flatMap((d) => d.items).find((i) => i.id === id);
      if (found) {
        setItem(found);
        setCat("place");
      }
    });
  }, [loadSaved]);

  const placeCat: PhraseCategory = item ? (ITEM_TO_PHRASE[item.category] ?? "basic") : "basic";

  const list: Shown[] = useMemo(() => {
    if (cat === "saved") return saved.filter((p) => p.favorite || (p.category === "custom" && !p.item_id));
    if (cat === "place" && item) {
      const own = saved.filter((p) => p.item_id === item.id);
      const addr = item.address_zh || item.title_zh;
      const custom: Shown[] = addr
        ? [{ ko: `이 장소로 가 주세요 (${item.title_ko.replace(/^.*?:\s*/, "")})`, zh: `請帶我到這裡：${item.title_zh ? `${item.title_zh} ` : ""}${item.address_zh}`.trim(), pron: `칭 따이 워 따오 저리${item.zh_pron ? `: ${item.zh_pron}` : ""}` }]
        : [];
      return [...custom, ...own, ...BASE_PHRASES[placeCat]];
    }
    return BASE_PHRASES[cat as PhraseCategory] ?? [];
  }, [cat, saved, item, placeCat]);

  const open = (p: Shown) => {
    setShow(p);
    speak(p.zh);
  };

  const isFav = (p: Shown) => (p.id ? !!p.favorite : saved.some((s) => s.favorite && s.zh === p.zh));
  const toggleFav = async (p: Shown) => {
    const existing = p.id ? (p as SavedPhrase) : saved.find((s) => s.zh === p.zh);
    if (existing) await api(`/api/phrases/${existing.id}`, { method: "PATCH", json: { favorite: !existing.favorite } });
    else await api("/api/phrases", { method: "POST", json: { ...p, category: cat, favorite: true, author: me } });
    await loadSaved();
    toast(isFav(p) ? "즐겨찾기 해제" : "⭐ 즐겨찾기에 추가");
  };

  const translate = async () => {
    if (!input.trim()) return;
    setBusy("translate");
    try {
      const r = await api<{ direction: string; ko: string; zh: string; pron: string }>("/api/translate", { method: "POST", json: { text: input } });
      if (r.direction === "zh2ko") setShow({ ko: r.ko, zh: r.zh, pron: "", reverse: true });
      else open({ ko: r.ko, zh: r.zh, pron: r.pron });
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const generate = async () => {
    if (!item) return;
    setBusy("generate");
    try {
      await api("/api/phrases/generate", {
        method: "POST",
        json: {
          place: `${item.title_ko} ${item.title_zh} (${item.category}) ${item.note}`,
          category: placeCat,
          item_id: item.id,
          author: me,
          existing: list.map((p) => p.ko),
        },
      });
      await loadSaved();
      toast("표현을 추가했어요");
    } catch (e) {
      toast((e as Error).message);
    } finally {
      setBusy("");
    }
  };

  const tabs: { key: Cat; label: string }[] = [
    ...(item ? [{ key: "place" as Cat, label: `📍 ${item.title_ko.replace(/^.*?:\s*/, "").slice(0, 10)}` }] : []),
    { key: "saved", label: "⭐ 내 표현" },
    ...PHRASE_CATEGORIES.map((c) => ({ key: c.key as Cat, label: `${c.icon} ${c.label}` })),
  ];

  return (
    <div className="pb-6">
      {/* 직접 입력 번역 */}
      <form
        className="flex gap-2 border-b border-gray-200 bg-gray-50 p-3"
        onSubmit={(e) => {
          e.preventDefault();
          translate();
        }}
      >
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="한국어 입력 → 중국어로 (중국어 입력 → 한국어)" className="input flex-1" />
        <button disabled={!!busy || !input.trim()} className="shrink-0 rounded-lg bg-blue-600 px-3.5 font-bold text-white disabled:bg-gray-300">
          {busy === "translate" ? "…" : "번역"}
        </button>
      </form>

      {/* 카테고리 */}
      <div className="sticky top-0 z-10 flex gap-1.5 overflow-x-auto border-b border-gray-200 bg-white px-3 py-2 [scrollbar-width:none]">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setCat(t.key)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm ${cat === t.key ? "bg-gray-900 font-bold text-white" : "bg-gray-100 text-gray-700"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {cat === "place" && item && (
        <div className="mx-3 mt-3 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm">
          <div className="font-bold">{item.title_ko}</div>
          {item.title_zh && (
            <div className="text-gray-700">
              {item.title_zh} {item.zh_pron && <span className="text-[13px] text-gray-500">[{item.zh_pron}]</span>}
            </div>
          )}
          {item.address_zh && <div className="text-gray-600">{item.address_zh}</div>}
          {(item.category === "restaurant" || item.category === "korean") && (
            <button onClick={() => setMenuOpen(true)} className="mt-2 w-full rounded-lg bg-orange-100 py-2 font-bold text-orange-800 active:bg-orange-200">
              🍽️ 메뉴 보고 주문하기
            </button>
          )}
        </div>
      )}

      <ul className="mt-2 divide-y divide-gray-100">
        {list.map((p, idx) => (
          <li key={`${p.id ?? "b"}-${idx}`} className="flex items-center gap-2 px-3">
            <button onClick={() => open(p)} className="min-w-0 flex-1 py-2.5 text-left active:opacity-60">
              <div className="font-medium">{p.ko}</div>
              <div className="text-[15px] text-blue-700">{p.zh}</div>
              {p.pron && <div className="text-xs text-gray-400">{p.pron}</div>}
            </button>
            <button onClick={() => speak(p.zh)} className="shrink-0 rounded-full bg-gray-100 p-2 active:bg-gray-200" aria-label="듣기">
              🔊
            </button>
            <button onClick={() => toggleFav(p)} className="shrink-0 p-1 text-lg" aria-label="즐겨찾기">
              {isFav(p) ? "⭐" : "☆"}
            </button>
          </li>
        ))}
        {list.length === 0 && <li className="p-6 text-center text-sm text-gray-400">☆를 눌러 자주 쓰는 표현을 모아두세요</li>}
      </ul>

      {cat === "place" && item && (
        <div className="px-3 pt-3">
          <button onClick={generate} disabled={!!busy} className="w-full rounded-xl border border-dashed border-blue-300 py-3 text-sm text-blue-700 active:bg-blue-50 disabled:opacity-50">
            {busy === "generate" ? "만드는 중…" : "🤖 이 장소에서 쓸 표현 더 만들기"}
          </button>
        </div>
      )}

      {/* 점원에게 보여주는 전체 화면 */}
      {show && (
        <ShowToClerk zh={show.zh} ko={show.ko} pron={show.pron} reverse={show.reverse} autoSpeak={false} onClose={() => setShow(null)}>
          {!show.id && !show.reverse && (
            <button
              onClick={async () => {
                await api("/api/phrases", { method: "POST", json: { ...show, category: "custom", author: me } });
                await loadSaved();
                toast("내 표현에 저장했어요");
              }}
              className="rounded-xl border border-gray-300 px-4 py-3.5"
            >
              저장
            </button>
          )}
        </ShowToClerk>
      )}
      {menuOpen && item && <MenuSheet item={item} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}
