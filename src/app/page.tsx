"use client";

import Link from "next/link";
import { catIcon, dateLabel, dayColor, nextItem, useItinerary, type DayWithItems } from "@/components/itinerary";

// 카드에 보여줄 핵심 일정 (예약·관광·식당 우선, 최대 4개)
function highlights(d: DayWithItems) {
  const key = d.items.filter((i) => (i.reserved && i.category !== "hotel") || ["attraction", "restaurant"].includes(i.category));
  return (key.length ? key : d.items).slice(0, 4);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
}

export default function HomePage() {
  const { days, today, now } = useItinerary();
  if (!days) return <p className="p-6 text-center text-gray-400">불러오는 중…</p>;

  const first = days[0]?.date;
  const last = days[days.length - 1]?.date;
  const todayIdx = days.findIndex((d) => d.date === today);
  const upcoming = todayIdx >= 0 ? nextItem(days[todayIdx].items, now) : null;

  return (
    <div className="space-y-3 bg-gray-100 p-3 pb-8">
      {/* 상단 안내: 출발 전 D-day / 여행 중 다음 일정 */}
      {today && first && today < first && (
        <div className="rounded-2xl bg-gray-900 p-4 text-white">
          <div className="text-sm opacity-80">대만 가족여행 🇹🇼</div>
          <div className="mt-0.5 text-2xl font-extrabold">출발까지 D-{daysBetween(today, first)}</div>
          <div className="mt-1 text-sm opacity-90">{days[0].items[0] ? `${days[0].items[0].time} ${days[0].items[0].title_ko}` : ""}</div>
        </div>
      )}
      {todayIdx >= 0 && (
        <Link href={`/day/${today}`} className="block rounded-2xl bg-red-500 p-4 text-white active:bg-red-600">
          <div className="text-sm opacity-90">
            오늘은 {todayIdx + 1}일차 · 지금 {now}
          </div>
          <div className="mt-0.5 text-xl font-extrabold">{upcoming ? `다음: ${upcoming.time} ${upcoming.title_ko}` : "오늘 일정 끝! 푹 쉬세요 🛌"}</div>
          <div className="mt-1 text-sm font-medium opacity-90">오늘 일정 보기 ›</div>
        </Link>
      )}
      {today && last && today > last && (
        <Link href="/photos" className="block rounded-2xl bg-gray-900 p-4 text-white">
          <div className="text-xl font-extrabold">여행 끝! 수고하셨어요 👏</div>
          <div className="mt-1 text-sm opacity-90">📷 사진 탭에 사진을 모아주세요 ›</div>
        </Link>
      )}

      {days.map((d, idx) => {
        const c = dayColor(idx);
        const isToday = d.date === today;
        return (
          <Link
            key={d.id}
            href={`/day/${d.date}`}
            className={`block overflow-hidden rounded-2xl bg-white shadow-sm active:scale-[0.99] ${isToday ? "ring-4 ring-red-400" : ""}`}
          >
            <div className={`${c.bg} flex items-end justify-between px-4 py-3 text-white`}>
              <div>
                <div className="text-[13px] font-medium opacity-90">{dateLabel(d.date)}</div>
                <div className="text-[26px] leading-tight font-extrabold">{idx + 1}일차</div>
              </div>
              <div className="text-right">
                {isToday && <div className="mb-1 inline-block rounded-full bg-white px-2 py-0.5 text-xs font-bold text-red-600">오늘</div>}
                <div className="text-sm font-semibold">{d.title}</div>
              </div>
            </div>
            <ul className="space-y-1.5 px-4 py-3">
              {highlights(d).map((i) => (
                <li key={i.id} className="flex gap-2.5 text-[15px]">
                  <span className={`w-[46px] shrink-0 font-bold ${c.text}`}>{i.time.slice(0, 5)}</span>
                  <span className="min-w-0 flex-1 truncate">
                    {catIcon(i.category)} {i.title_ko}
                    {i.reserved && <span className="ml-1 text-xs font-bold text-green-600">✓</span>}
                  </span>
                </li>
              ))}
            </ul>
            <div className={`flex items-center justify-between border-t ${c.border} ${c.soft} px-4 py-2.5 text-sm font-bold ${c.text}`}>
              <span>일정 {d.items.length}개</span>
              <span>자세히 보기 ›</span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
