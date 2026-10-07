"use client";

import { useEffect, useState } from "react";
import Markdown from "@/components/Markdown";
import ShowToClerk from "@/components/ShowToClerk";
import { useToast } from "@/components/AppShell";
import { api, speak } from "@/lib/client";
import type { Item, Menu, MenuDish } from "@/lib/db";

/** 식당 메뉴 (대표 메뉴 + 기타). 처음 열 때 웹에서 찾아 저장 */
export default function MenuSheet({ item, onClose }: { item: Item; onClose: () => void }) {
  const toast = useToast();
  const [menu, setMenu] = useState<Menu | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [order, setOrder] = useState<MenuDish | null>(null);

  const search = async () => {
    setSearching(true);
    try {
      setMenu(await api<Menu>(`/api/itinerary/${item.id}/menu`, { method: "POST" }));
    } catch (e) {
      toast(`메뉴를 못 찾았어요: ${(e as Error).message}`);
    } finally {
      setSearching(false);
    }
  };

  useEffect(() => {
    let alive = true;
    api<Menu | null>(`/api/itinerary/${item.id}/menu`)
      .then((m) => {
        if (!alive) return;
        setMenu(m);
        setLoading(false);
        if (!m) search();
      })
      .catch(() => setLoading(false));
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 열릴 때 한 번만
  }, [item.id]);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="flex max-h-[92dvh] w-full max-w-xl flex-col rounded-t-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 pt-4 pb-3">
          <div className="min-w-0">
            <p className="text-lg font-bold">🍽️ 메뉴</p>
            <p className="truncate text-sm text-gray-600">{item.title_ko.replace(/^.*?:\s*/, "")}</p>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-sm">
            닫기
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          {(loading || searching) && !menu && (
            <div className="py-12 text-center text-gray-500">
              <p className="animate-pulse text-3xl">🔎</p>
              <p className="mt-2 font-medium">메뉴를 웹에서 찾는 중…</p>
              <p className="text-sm">처음 한 번은 1분 정도 걸려요. 다음부터는 바로 열려요.</p>
            </div>
          )}

          {!loading && !searching && !menu && (
            <div className="py-10 text-center">
              <p className="text-gray-500">메뉴 정보가 없어요</p>
              <button onClick={search} className="mt-3 rounded-lg bg-blue-600 px-4 py-2 font-bold text-white">
                다시 찾기
              </button>
            </div>
          )}

          {menu && (
            <div className="space-y-4">
              <div className="rounded-xl bg-gray-50 p-3 text-sm text-gray-700">
                <Markdown>{menu.summary}</Markdown>
              </div>
              <p className="text-xs text-gray-500">👆 메뉴를 누르면 점원에게 보여줄 &quot;이거 주세요&quot; 화면이 나와요</p>

              <DishList title="⭐ 대표 메뉴" dishes={menu.signature} onPick={setOrder} highlight />
              {menu.others.length > 0 && <DishList title="그 밖의 메뉴" dishes={menu.others} onPick={setOrder} />}

              {menu.tips && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed">
                  <p className="mb-1 font-bold text-amber-800">💡 주문 팁</p>
                  <Markdown>{menu.tips}</Markdown>
                </div>
              )}

              {menu.sources.length > 0 && (
                <div className="text-xs text-gray-400">
                  출처:{" "}
                  {menu.sources.map((u, i) => (
                    <a key={u} href={u} target="_blank" rel="noreferrer" className="mr-2 underline">
                      [{i + 1}]
                    </a>
                  ))}
                  · 가격·메뉴는 바뀔 수 있어요
                </div>
              )}

              <button onClick={search} disabled={searching} className="w-full rounded-lg border border-gray-300 py-2.5 text-sm text-gray-600 disabled:opacity-50">
                {searching ? "다시 찾는 중… (1분 정도)" : "🔄 메뉴 다시 찾기"}
              </button>
            </div>
          )}
        </div>
      </div>

      {order && (
        <ShowToClerk zh={`我要這個：${order.zh}`} ko={`이거 주세요: ${order.ko}`} pron={`워 야오 저거: ${order.pron}`} onClose={() => setOrder(null)} />
      )}
    </div>
  );
}

function DishList({ title, dishes, onPick, highlight }: { title: string; dishes: MenuDish[]; onPick: (d: MenuDish) => void; highlight?: boolean }) {
  return (
    <section>
      <h3 className="mb-1.5 font-bold">{title}</h3>
      <ul className={`divide-y overflow-hidden rounded-xl border ${highlight ? "divide-orange-100 border-orange-200" : "divide-gray-100 border-gray-200"}`}>
        {dishes.map((d, i) => (
          <li key={`${d.zh}-${i}`} className={`flex items-start gap-2 px-3 py-2.5 ${highlight ? "bg-orange-50/40" : ""}`}>
            <button onClick={() => onPick(d)} className="min-w-0 flex-1 text-left active:opacity-60">
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-bold">{d.ko}</span>
                {d.price && <span className="shrink-0 text-sm font-semibold text-gray-700">{d.price}</span>}
              </div>
              <div className="text-[15px] text-blue-700">{d.zh}</div>
              {d.pron && <div className="text-xs text-gray-400">{d.pron}</div>}
              {d.desc && <div className="mt-0.5 text-[13px] text-gray-600">{d.desc}</div>}
            </button>
            <button onClick={() => speak(d.zh)} className="mt-1 shrink-0 rounded-full bg-gray-100 p-2 active:bg-gray-200" aria-label="듣기">
              🔊
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
