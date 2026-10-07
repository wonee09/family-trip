"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { Suspense, useState } from "react";
import { EditSheet, ItemCard, dateLabel, dayColor, nextItem, useItinerary, type Draft } from "@/components/itinerary";

export default function DayPage() {
  return (
    <Suspense fallback={<p className="p-6 text-center text-gray-400">불러오는 중…</p>}>
      <DayView />
    </Suspense>
  );
}

function DayView() {
  const { date } = useParams<{ date: string }>();
  const router = useRouter();
  const { days, today, now, reload } = useItinerary();
  const [edit, setEdit] = useState<Draft | null>(null);

  if (!days) return <p className="p-6 text-center text-gray-400">불러오는 중…</p>;
  const idx = days.findIndex((d) => d.date === date);
  if (idx < 0)
    return (
      <div className="p-6 text-center">
        <p className="text-gray-500">해당 날짜 일정이 없어요</p>
        <Link href="/" className="mt-3 inline-block text-blue-600">
          ‹ 일정으로
        </Link>
      </div>
    );

  const day = days[idx];
  const c = dayColor(idx);
  const prev = days[idx - 1];
  const next = days[idx + 1];
  const main = day.items.filter((i) => i.category !== "korean");
  const korean = day.items.filter((i) => i.category === "korean");
  const upcoming = date === today ? nextItem(main, now) : null;

  return (
    <div className="min-h-full bg-gray-100 pb-8">
      {/* 날짜 헤더 */}
      <div className={`${c.bg} sticky top-0 z-10 text-white`}>
        <div className="flex items-center justify-between px-2 pt-2">
          <Link href="/" className="rounded-full px-2 py-1 text-sm font-medium active:bg-white/20">
            ‹ 전체 일정
          </Link>
          <div className="flex gap-1">
            {prev && (
              <button onClick={() => router.replace(`/day/${prev.date}`)} className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium active:bg-white/30">
                ‹ {idx}일차
              </button>
            )}
            {next && (
              <button onClick={() => router.replace(`/day/${next.date}`)} className="rounded-full bg-white/15 px-3 py-1 text-sm font-medium active:bg-white/30">
                {idx + 2}일차 ›
              </button>
            )}
          </div>
        </div>
        <div className="px-4 pt-1 pb-3">
          <div className="text-[13px] opacity-90">{dateLabel(day.date)}</div>
          <div className="flex items-baseline gap-2">
            <span className="text-[26px] font-extrabold">{idx + 1}일차</span>
            <span className="text-[15px] font-semibold">{day.title}</span>
          </div>
        </div>
      </div>

      {/* 타임라인 */}
      <ol className="relative mt-3 space-y-3 px-3">
        <span className="absolute top-2 bottom-2 left-[38px] w-0.5 bg-gray-300" aria-hidden />
        {main.map((i) => (
          <li key={i.id} className="relative flex gap-2.5">
            <div className="w-[52px] shrink-0 pt-2.5 text-center">
              <span className={`relative inline-block rounded-md px-1 py-0.5 text-[13px] leading-tight font-extrabold whitespace-pre-line ${upcoming?.id === i.id ? "bg-red-500 text-white" : `bg-white ${c.text}`}`}>
                {i.time.replace("~", "\n~") || "-"}
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <ItemCard item={i} highlight={upcoming?.id === i.id} onEdit={() => setEdit({ ...i, date: day.date })} />
            </div>
          </li>
        ))}
      </ol>

      <div className="px-3">
        <button
          onClick={() => setEdit({ date: day.date, category: "attraction", time: "" })}
          className="mt-3 w-full rounded-xl border-2 border-dashed border-gray-300 bg-white py-3 font-medium text-gray-600 active:bg-gray-50"
        >
          + 일정 추가
        </button>

        {/* 날짜별 한식당 칸 */}
        <section className="mt-4 rounded-2xl border border-orange-200 bg-orange-50 p-3">
          <div className="flex items-center justify-between">
            <h3 className="text-[17px] font-bold text-orange-800">🍚 한식당</h3>
            <div className="flex gap-1.5">
              <button
                onClick={() => router.push(`/chat?ask=${encodeURIComponent(`${idx + 1}일차(${dateLabel(day.date)}) 동선 근처 한식당 2~3곳 추천해줘. 부모님 입맛 고려해서.`)}`)}
                className="rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-orange-700 shadow-sm active:bg-orange-100"
              >
                🤖 AI 추천
              </button>
              <button onClick={() => setEdit({ date: day.date, category: "korean", time: "" })} className="rounded-full bg-white px-3 py-1.5 text-[13px] font-medium text-orange-700 shadow-sm active:bg-orange-100">
                + 추가
              </button>
            </div>
          </div>
          {korean.length === 0 ? (
            <p className="mt-2 text-[13px] text-orange-700/70">아직 없어요. AI 추천을 받아보세요.</p>
          ) : (
            <div className="mt-2 space-y-2">
              {korean.map((i) => (
                <ItemCard key={i.id} item={i} onEdit={() => setEdit({ ...i, date: day.date })} />
              ))}
            </div>
          )}
        </section>
      </div>

      {edit && (
        <EditSheet
          draft={edit}
          days={days}
          onClose={() => setEdit(null)}
          onSaved={() => {
            setEdit(null);
            reload();
          }}
        />
      )}
    </div>
  );
}
