"use client";

import { useState } from "react";

export default function LoginPage() {
  const [code, setCode] = useState("");
  const [err, setErr] = useState("");

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-white p-6">
      <form
        className="w-full max-w-xs space-y-3 text-center"
        onSubmit={async (e) => {
          e.preventDefault();
          const res = await fetch("/api/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ passcode: code }) });
          if (res.ok) location.href = "/";
          else setErr("비밀번호가 달라요");
        }}
      >
        <p className="text-4xl">🇹🇼</p>
        <p className="text-lg font-bold">우리가족 여행도우미</p>
        <input value={code} onChange={(e) => setCode(e.target.value)} type="password" inputMode="numeric" placeholder="가족 비밀번호" className="input text-center" autoFocus />
        {err && <p className="text-sm text-red-600">{err}</p>}
        <button className="w-full rounded-lg bg-blue-600 py-2.5 font-bold text-white">들어가기</button>
      </form>
    </div>
  );
}
