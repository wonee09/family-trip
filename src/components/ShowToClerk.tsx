"use client";

import { useEffect } from "react";
import { speak } from "@/lib/client";

/** 점원·기사님에게 보여주는 전체 화면 (중국어 크게 + 음성) */
export default function ShowToClerk({
  zh,
  ko,
  pron,
  reverse,
  autoSpeak = true,
  onClose,
  children,
}: {
  zh: string;
  ko: string;
  pron?: string;
  reverse?: boolean; // 중→한 번역 결과: 한국어를 크게
  autoSpeak?: boolean;
  onClose: () => void;
  children?: React.ReactNode; // 추가 버튼
}) {
  useEffect(() => {
    if (autoSpeak && !reverse) speak(zh);
  }, [zh, autoSpeak, reverse]);

  return (
    <div className="fixed inset-0 z-[55] flex flex-col bg-white pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-y-auto px-6 text-center">
        {reverse && <p className="text-sm text-gray-400">🇹🇼 → 🇰🇷 번역</p>}
        <p className="text-[2.6rem] leading-tight font-bold break-keep text-gray-900">{reverse ? ko : zh}</p>
        <div>
          <p className="text-lg text-gray-700">{reverse ? zh : ko}</p>
          {pron && <p className="text-sm text-gray-400">{pron}</p>}
        </div>
      </div>
      <div className="flex gap-2 p-3">
        {!reverse && (
          <button onClick={() => speak(zh)} className="flex-1 rounded-xl bg-blue-600 py-3.5 font-bold text-white active:bg-blue-700">
            🔊 다시 듣기
          </button>
        )}
        {children}
        <button onClick={onClose} className={`rounded-xl border border-gray-300 px-5 py-3.5 ${reverse ? "flex-1" : ""}`}>
          닫기
        </button>
      </div>
    </div>
  );
}
