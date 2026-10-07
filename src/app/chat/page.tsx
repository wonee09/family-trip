"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Markdown from "@/components/Markdown";
import { useMe, useToast } from "@/components/AppShell";
import { api, copyText, openKakao, shareText, stripMarkdown } from "@/lib/client";

type Msg = { id: number; role: "user" | "assistant"; author: string; content: string; created_at: string };

const QUICK = ["오늘 일정 알려줘", "다음 일정까지 어떻게 가?", "지금 근처 맛집 추천", "내일 날씨 어때?", "한식당 추천해줘"];

function time(s: string) {
  return new Date(s).toLocaleTimeString("ko-KR", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Taipei" });
}

export default function ChatPage() {
  const { me, pick } = useMe();
  const toast = useToast();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const lastId = useRef(0);
  const stick = useRef(true);

  const fetchNew = useCallback(async () => {
    const rows = await api<Msg[]>(`/api/messages${lastId.current ? `?after=${lastId.current}` : ""}`).catch(() => null);
    setLoaded(true);
    if (!rows?.length) return;
    lastId.current = rows[rows.length - 1].id;
    setMsgs((m) => [...m, ...rows.filter((r) => !m.some((x) => x.id === r.id))]);
  }, []);

  // 처음 로드 + 4초마다 새 메시지 확인 (가족 공용방)
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- 서버 메시지 동기화 (setState는 응답 후 실행)
    fetchNew();
    const t = setInterval(() => document.visibilityState === "visible" && fetchNew(), 4000);
    return () => clearInterval(t);
  }, [fetchNew]);

  useEffect(() => {
    const el = scroller.current;
    if (el && stick.current) el.scrollTop = el.scrollHeight;
  }, [msgs, sending]);

  const send = useCallback(
    async (content: string) => {
      content = content.trim();
      if (!content || sending) return;
      if (!me) return pick();
      setSending(true);
      setText("");
      stick.current = true;
      // 내 메시지 먼저 보여주기
      setMsgs((m) => [...m, { id: -Date.now(), role: "user", author: me, content, created_at: new Date().toISOString() }]);
      try {
        await api("/api/messages", { method: "POST", json: { author: me, content } });
      } catch (e) {
        toast(`⚠️ ${(e as Error).message}`);
      } finally {
        setMsgs((m) => m.filter((x) => x.id > 0));
        await fetchNew();
        setSending(false);
      }
    },
    [me, pick, sending, fetchNew, toast],
  );

  // 일정 탭 등에서 ?ask=... 로 넘어오면 자동 질문
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || !me || !loaded) return;
    const ask = new URLSearchParams(location.search).get("ask");
    if (ask) {
      asked.current = true;
      history.replaceState(null, "", "/chat");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- URL로 받은 질문을 한 번만 자동 전송
      send(ask);
    }
  }, [me, loaded, send]);

  const share = async (content: string) => {
    const r = await shareText(stripMarkdown(content));
    if (r === "copied") toast("복사됐어요", { label: "카톡 열기", onClick: openKakao });
  };

  return (
    <div className="flex h-full flex-col">
      <div
        ref={scroller}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-[#bacee0] px-3 py-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
        }}
      >
        {loaded && msgs.length === 0 && (
          <div className="rounded-xl bg-white/80 p-4 text-sm leading-relaxed">
            <p className="mb-2 font-bold">🤖 가족 여행도우미예요!</p>
            <p>일정·예약·가족 정보를 다 알고 있어요. 이렇게 물어보세요:</p>
            <ul className="mt-2 list-disc pl-5 text-gray-700">
              <li>&quot;1일차 오후 A~D안 중에 뭐가 좋아?&quot;</li>
              <li>&quot;3일차 점심을 도소월로 확정해줘&quot;</li>
              <li>&quot;101 전망대 가는 법 알려줘&quot;</li>
              <li>&quot;호텔 와이파이 비번 abcd 메모해줘&quot;</li>
            </ul>
          </div>
        )}

        {msgs.map((m) => {
          const mine = m.role === "user" && m.author === me;
          if (m.role === "assistant")
            return (
              <div key={m.id} className="flex flex-col items-start">
                <span className="mb-1 text-xs text-gray-700">🤖 여행도우미</span>
                <div className="max-w-[92%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-[15px]">
                  <Markdown>{m.content}</Markdown>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-xs">
                  <button onClick={() => share(m.content)} className="rounded-full bg-yellow-300 px-2.5 py-1 font-medium active:bg-yellow-400">
                    💬 카톡 공유
                  </button>
                  <button
                    onClick={async () => {
                      await copyText(stripMarkdown(m.content));
                      toast("복사됐어요");
                    }}
                    className="rounded-full bg-white/70 px-2.5 py-1 active:bg-white"
                  >
                    복사
                  </button>
                  <span className="text-gray-600">{time(m.created_at)}</span>
                </div>
              </div>
            );
          return (
            <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
              {!mine && <span className="mb-1 text-xs text-gray-700">{m.author}</span>}
              <div className={`flex items-end gap-1.5 ${mine ? "flex-row-reverse" : ""}`}>
                <div className={`max-w-[80vw] whitespace-pre-wrap rounded-2xl px-3.5 py-2 sm:max-w-md ${mine ? "rounded-tr-sm bg-[#fee500]" : "rounded-tl-sm bg-white"}`}>
                  {m.content}
                </div>
                <span className="shrink-0 text-[11px] text-gray-600">{time(m.created_at)}</span>
              </div>
            </div>
          );
        })}

        {sending && (
          <div className="flex flex-col items-start">
            <span className="mb-1 text-xs text-gray-700">🤖 여행도우미</span>
            <div className="animate-pulse rounded-2xl rounded-tl-sm bg-white px-4 py-2.5 text-gray-500">생각하는 중… (검색하면 20초쯤 걸려요)</div>
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-gray-200 bg-white">
        <div className="flex gap-1.5 overflow-x-auto px-3 pt-2 [scrollbar-width:none]">
          {QUICK.map((q) => (
            <button key={q} onClick={() => send(q)} disabled={sending} className="shrink-0 rounded-full border border-gray-300 px-3 py-1 text-[13px] text-gray-700 active:bg-gray-100 disabled:opacity-40">
              {q}
            </button>
          ))}
        </div>
        <form
          className="flex items-end gap-2 p-2"
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && window.matchMedia("(pointer: fine)").matches) {
                e.preventDefault();
                send(text);
              }
            }}
            rows={1}
            placeholder={me ? `${me}님, 무엇이든 물어보세요` : "먼저 이름을 선택하세요"}
            className="max-h-32 min-h-[42px] flex-1 resize-none rounded-2xl border border-gray-300 px-3.5 py-2 outline-none focus:border-blue-500 [field-sizing:content]"
          />
          <button type="submit" disabled={sending || !text.trim()} className="h-[42px] shrink-0 rounded-full bg-blue-600 px-4 font-bold text-white disabled:bg-gray-300">
            전송
          </button>
        </form>
      </div>
    </div>
  );
}
