"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useToast } from "@/components/AppShell";
import MenuSheet from "@/components/MenuSheet";
import { api, mapLink, speak, taipeiToday } from "@/lib/client";
import type { Day, Item } from "@/lib/db";

export type DayWithItems = Day & { items: Item[] };

export const CATEGORIES: Record<string, string> = {
  flight: "✈️ 항공",
  transport: "🚕 이동",
  hotel: "🏨 숙소",
  restaurant: "🍜 식당",
  korean: "🍚 한식당",
  attraction: "📍 관광",
  shop: "🛍️ 쇼핑",
  etc: "📌 기타",
};
export const catIcon = (c: string) => CATEGORIES[c]?.split(" ")[0] ?? "📌";

// 날짜별 색 (카드·헤더)
export const DAY_COLORS = [
  { bg: "bg-sky-600", soft: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  { bg: "bg-emerald-600", soft: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  { bg: "bg-orange-500", soft: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  { bg: "bg-violet-600", soft: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
];
export const dayColor = (idx: number) => DAY_COLORS[idx % DAY_COLORS.length];

export function dateLabel(date: string) {
  const d = new Date(`${date}T00:00:00`);
  return `${d.getMonth() + 1}월 ${d.getDate()}일 (${"일월화수목금토"[d.getDay()]})`;
}

/** 대만 시각 기준 HH:MM */
export function taipeiTime() {
  return new Date().toLocaleTimeString("en-GB", { timeZone: "Asia/Taipei", hour: "2-digit", minute: "2-digit" });
}

/** 일정 + 오늘 날짜(대만 기준). today는 마운트 후에 채워짐 */
export function useItinerary() {
  const toast = useToast();
  const [days, setDays] = useState<DayWithItems[] | null>(null);
  const [today, setToday] = useState("");
  const [now, setNow] = useState("");
  const load = useCallback(
    () =>
      api<DayWithItems[]>("/api/itinerary")
        .then((d) => {
          setToday(taipeiToday());
          setNow(taipeiTime());
          setDays(d);
        })
        .catch((e) => toast(e.message)),
    [toast],
  );
  useEffect(() => {
    load();
  }, [load]);
  return { days, today, now, reload: load };
}

/** 오늘 일정 중 지금 이후 첫 항목 (시간이 HH:MM으로 시작하는 것만) */
export function nextItem(items: Item[], now: string) {
  return items.find((i) => /^\d{2}:\d{2}/.test(i.time) && i.time.slice(0, 5) >= now) ?? null;
}

const isRestaurant = (c: string) => c === "restaurant" || c === "korean";

export function ItemCard({ item: i, highlight, onEdit }: { item: Item; highlight?: boolean; onEdit: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const food = isRestaurant(i.category);
  return (
    <div className={`rounded-xl border bg-white p-3 shadow-sm ${highlight ? "border-red-400 ring-2 ring-red-200" : "border-gray-200"}`}>
      <Link href={`/speak?item=${i.id}`} className="block active:opacity-60">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[17px] leading-snug font-bold">
            {catIcon(i.category)} {i.title_ko}
          </span>
          {i.reserved && <span className="rounded bg-green-100 px-1.5 py-0.5 text-[11px] font-bold text-green-700">예약완료</span>}
          {highlight && <span className="rounded bg-red-500 px-1.5 py-0.5 text-[11px] font-bold text-white">다음 일정</span>}
        </div>
      </Link>
      {i.title_zh && (
        <button onClick={() => speak(i.title_zh)} className="mt-1 block w-full rounded-lg bg-blue-50/60 px-2.5 py-1.5 text-left active:bg-blue-100">
          <div className="text-[15px] font-medium text-blue-700">
            {i.title_zh} <span className="text-sm">🔊</span>
          </div>
          {i.zh_pron && <div className="text-[13px] text-gray-600">[{i.zh_pron}]</div>}
        </button>
      )}
      {i.address_zh && <div className="mt-1 text-[13px] text-gray-500">📍 {i.address_zh}</div>}
      {i.note && <div className="mt-1.5 rounded-lg bg-gray-50 px-2.5 py-1.5 text-[13px] leading-snug text-gray-700">{i.note}</div>}

      <div className={`mt-2.5 grid gap-1.5 text-[13px] font-medium ${food ? "grid-cols-4" : "grid-cols-3"}`}>
        {food && (
          <button onClick={() => setMenuOpen(true)} className="rounded-lg bg-orange-100 py-2 font-bold text-orange-800 active:bg-orange-200">
            🍽️ 메뉴
          </button>
        )}
        <Link href={`/speak?item=${i.id}`} className="rounded-lg bg-blue-50 py-2 text-center text-blue-700 active:bg-blue-100">
          🗣️ {food ? "표현" : "현지 표현"}
        </Link>
        <a href={mapLink(i)} target="_blank" rel="noreferrer" className="rounded-lg bg-gray-100 py-2 text-center active:bg-gray-200">
          🗺️ 지도
        </a>
        <button onClick={onEdit} className="rounded-lg bg-gray-100 py-2 active:bg-gray-200">
          ✏️ 수정
        </button>
      </div>
      {menuOpen && <MenuSheet item={i} onClose={() => setMenuOpen(false)} />}
    </div>
  );
}

export type Draft = Partial<Item> & { date: string };

export function EditSheet({ draft, days, onClose, onSaved }: { draft: Draft; days: DayWithItems[]; onClose: () => void; onSaved: () => void }) {
  const toast = useToast();
  const [edit, setEdit] = useState<Draft>(draft);

  const save = async () => {
    if (!edit.title_ko?.trim()) return toast("제목을 입력하세요");
    const { id, ...body } = edit;
    if (id) await api(`/api/itinerary/${id}`, { method: "PATCH", json: body });
    else await api("/api/itinerary", { method: "POST", json: body });
    onSaved();
  };
  const remove = async () => {
    if (!edit.id || !confirm("이 일정을 삭제할까요?")) return;
    await api(`/api/itinerary/${edit.id}`, { method: "DELETE" });
    onSaved();
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div
        className="max-h-[90dvh] w-full max-w-xl space-y-2.5 overflow-y-auto rounded-t-2xl bg-white p-4 pb-[calc(1rem+env(safe-area-inset-bottom))]"
        onClick={(e) => e.stopPropagation()}
      >
        <p className="text-lg font-bold">{edit.id ? "일정 수정" : "일정 추가"}</p>
        <div className="grid grid-cols-2 gap-2">
          <Field label="날짜">
            <select value={edit.date} onChange={(e) => setEdit({ ...edit, date: e.target.value })} className="input">
              {days.map((d, i) => (
                <option key={d.id} value={d.date}>
                  {i + 1}일차 · {dateLabel(d.date)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="시간">
            <input value={edit.time ?? ""} onChange={(e) => setEdit({ ...edit, time: e.target.value })} placeholder="13:00" className="input" />
          </Field>
        </div>
        <Field label="제목 (한국어)">
          <input value={edit.title_ko ?? ""} onChange={(e) => setEdit({ ...edit, title_ko: e.target.value })} className="input" />
        </Field>
        <Field label="중국어 이름 (택시·점원에게 보여줄 것)">
          <input value={edit.title_zh ?? ""} onChange={(e) => setEdit({ ...edit, title_zh: e.target.value, zh_pron: "" })} className="input" />
        </Field>
        <Field label="한글 발음 (비워두면 자동으로 채워져요)">
          <input value={edit.zh_pron ?? ""} onChange={(e) => setEdit({ ...edit, zh_pron: e.target.value })} className="input" />
        </Field>
        <Field label="중국어 주소">
          <input value={edit.address_zh ?? ""} onChange={(e) => setEdit({ ...edit, address_zh: e.target.value })} className="input" />
        </Field>
        <Field label="구글지도 링크">
          <input value={edit.map_url ?? ""} onChange={(e) => setEdit({ ...edit, map_url: e.target.value })} className="input" />
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="종류">
            <select value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })} className="input">
              {Object.entries(CATEGORIES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-end gap-2 pb-2 text-sm">
            <input type="checkbox" checked={!!edit.reserved} onChange={(e) => setEdit({ ...edit, reserved: e.target.checked })} className="size-5" />
            예약 완료
          </label>
        </div>
        <Field label="메모">
          <textarea value={edit.note ?? ""} onChange={(e) => setEdit({ ...edit, note: e.target.value })} rows={2} className="input" />
        </Field>
        <div className="flex gap-2 pt-1">
          {edit.id && (
            <button onClick={remove} className="rounded-lg border border-red-200 px-4 py-2.5 text-red-600">
              삭제
            </button>
          )}
          <button onClick={onClose} className="flex-1 rounded-lg border border-gray-300 py-2.5">
            취소
          </button>
          <button onClick={save} className="flex-1 rounded-lg bg-blue-600 py-2.5 font-bold text-white">
            저장
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-0.5 block text-xs text-gray-500">{label}</span>
      {children}
    </label>
  );
}
