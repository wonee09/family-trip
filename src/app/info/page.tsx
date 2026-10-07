"use client";

import { useCallback, useEffect, useState } from "react";
import Markdown from "@/components/Markdown";
import { useMe, useToast } from "@/components/AppShell";
import { api } from "@/lib/client";
import { GUIDE_MD, HOTEL } from "@/lib/trip";

type Note = { id: number; author: string; content: string; created_at: string };

export default function InfoPage() {
  const { me, pick } = useMe();
  const toast = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState("");

  const load = useCallback(() => api<Note[]>("/api/notes").then(setNotes).catch((e) => toast(e.message)), [toast]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async () => {
    if (!text.trim()) return;
    if (!me) return pick();
    await api("/api/notes", { method: "POST", json: { author: me, content: text } });
    setText("");
    load();
  };

  return (
    <div className="space-y-4 p-4 pb-10">
      <section className="rounded-xl border border-gray-200 p-3">
        <h2 className="font-bold">🏨 숙소</h2>
        <p className="mt-1">
          {HOTEL.ko} · <span className="text-blue-700">{HOTEL.zh}</span>
        </p>
        <p className="text-sm text-gray-600">
          {HOTEL.address} · {HOTEL.near}
        </p>
      </section>

      <section className="rounded-xl border border-yellow-200 bg-yellow-50 p-3">
        <h2 className="font-bold">📝 가족 메모</h2>
        <p className="mb-2 text-xs text-gray-500">와이파이 비번, 집합 장소, 정산 등. AI도 이 메모를 참고해요.</p>
        <ul className="space-y-1.5">
          {notes.map((n) => (
            <li key={n.id} className="flex items-start gap-2 rounded-lg bg-white px-3 py-2 text-sm">
              <span className="flex-1 whitespace-pre-wrap">{n.content}</span>
              <span className="shrink-0 text-xs text-gray-400">{n.author}</span>
              <button
                onClick={async () => {
                  if (!confirm("메모를 삭제할까요?")) return;
                  await api(`/api/notes/${n.id}`, { method: "DELETE" });
                  load();
                }}
                className="shrink-0 text-xs text-gray-400"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="메모 추가" className="input flex-1" />
          <button className="shrink-0 rounded-lg bg-gray-900 px-4 text-white">추가</button>
        </form>
      </section>

      <Markdown>{GUIDE_MD}</Markdown>
    </div>
  );
}
