"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, Suspense, useContext, useEffect, useState } from "react";
import { MEMBERS } from "@/lib/trip";

const TABS = [
  { href: "/", label: "일정", icon: "📅" },
  { href: "/chat", label: "채팅", icon: "💬" },
  { href: "/speak", label: "말하기", icon: "🗣️" },
  { href: "/photos", label: "사진", icon: "📷" },
  { href: "/info", label: "정보", icon: "ℹ️" },
];

const MemberCtx = createContext<{ me: string; pick: () => void }>({ me: "", pick: () => {} });
export const useMe = () => useContext(MemberCtx);

const ToastCtx = createContext<(msg: string, action?: { label: string; onClick: () => void }) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function useCurrentTab() {
  const path = usePathname();
  return TABS.find((t) => (t.href === "/" ? path === "/" || path.startsWith("/day/") : path.startsWith(t.href)));
}

function HeaderTitle() {
  const current = useCurrentTab();
  return (
    <>
      {current?.icon} {current?.label ?? "여행도우미"}
    </>
  );
}

function TabBar() {
  const current = useCurrentTab();
  return (
    <>
      {TABS.map((t) => {
        const active = t === current;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "font-bold text-blue-600" : "text-gray-500"}`}
          >
            <span className="text-xl leading-none">{t.icon}</span>
            {t.label}
          </Link>
        );
      })}
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState("");
  const [picking, setPicking] = useState(false);
  const [toast, setToast] = useState<{ msg: string; action?: { label: string; onClick: () => void } } | null>(null);

  useEffect(() => {
    let saved = "";
    try {
      saved = localStorage.getItem("ft_member") ?? "";
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage는 마운트 후에만 읽을 수 있음
    if (saved) setMe(saved);
    else setPicking(true);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  const choose = (name: string) => {
    setMe(name);
    setPicking(false);
    try {
      localStorage.setItem("ft_member", name);
    } catch {}
  };


  return (
    <MemberCtx.Provider value={{ me, pick: () => setPicking(true) }}>
      <ToastCtx.Provider value={(msg, action) => setToast({ msg, action })}>
        <div className="mx-auto flex h-dvh max-w-xl flex-col bg-white">
          <header className="flex h-12 shrink-0 items-center justify-between border-b border-gray-200 px-4">
            <h1 className="text-[17px] font-bold">
              <Suspense fallback="여행도우미">
                <HeaderTitle />
              </Suspense>
            </h1>
            <button onClick={() => setPicking(true)} className="rounded-full bg-gray-100 px-3 py-1 text-sm active:bg-gray-200">
              👤 {me || "이름 선택"}
            </button>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto">{children}</main>

          <nav className="flex shrink-0 border-t border-gray-200 bg-white pb-[env(safe-area-inset-bottom)]">
            <Suspense fallback={null}>
              <TabBar />
            </Suspense>
          </nav>
        </div>

        {picking && (
          <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center" onClick={() => me && setPicking(false)}>
            <div className="w-full max-w-xl rounded-t-2xl bg-white p-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
              <p className="mb-1 text-lg font-bold">누구세요? 👋</p>
              <p className="mb-4 text-sm text-gray-500">채팅·사진에 이름이 표시돼요. 이 폰에 기억됩니다.</p>
              <div className="grid grid-cols-3 gap-2">
                {MEMBERS.map((m) => (
                  <button
                    key={m.name}
                    onClick={() => choose(m.name)}
                    className={`rounded-xl border py-3 active:bg-blue-50 ${me === m.name ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}
                  >
                    <div className="font-bold">{m.name}</div>
                    <div className="text-xs text-gray-500">{m.role}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {toast && (
          <div className="fixed inset-x-0 bottom-20 z-50 flex justify-center px-4">
            <div className="flex items-center gap-3 rounded-full bg-gray-900 px-4 py-2.5 text-sm text-white shadow-lg">
              <span>{toast.msg}</span>
              {toast.action && (
                <button onClick={toast.action.onClick} className="rounded-full bg-yellow-300 px-3 py-1 font-bold text-gray-900">
                  {toast.action.label}
                </button>
              )}
            </div>
          </div>
        )}
      </ToastCtx.Provider>
    </MemberCtx.Provider>
  );
}
