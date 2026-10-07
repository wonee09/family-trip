"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMe, useToast } from "@/components/AppShell";
import { api } from "@/lib/client";
import { MEMBERS } from "@/lib/trip";

type Photo = { id: number; author: string; filename: string; content_type: string; size: number; has_thumb: boolean; created_at: string };

const src = (p: Photo, thumb = false) => `/api/photos/${p.id}/file${thumb && p.has_thumb ? "?thumb=1" : ""}`;
const isVideo = (p: Photo) => p.content_type.startsWith("video/");

// 목록용 작은 썸네일 (데이터 절약)
async function makeThumb(file: File): Promise<Blob | null> {
  if (!file.type.startsWith("image/")) return null;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 480 / Math.max(bmp.width, bmp.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bmp.width * scale);
    canvas.height = Math.round(bmp.height * scale);
    canvas.getContext("2d")!.drawImage(bmp, 0, 0, canvas.width, canvas.height);
    return await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.75));
  } catch {
    return null;
  }
}

export default function PhotosPage() {
  const { me, pick } = useMe();
  const toast = useToast();
  const [photos, setPhotos] = useState<Photo[] | null>(null);
  const [storage, setStorage] = useState<"blob" | "local">("local");
  const [filter, setFilter] = useState("");
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [viewer, setViewer] = useState<Photo | null>(null);
  const [progress, setProgress] = useState("");
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(
    () =>
      api<{ storage: "blob" | "local"; photos: Photo[] }>("/api/photos")
        .then((r) => {
          setStorage(r.storage);
          setPhotos(r.photos);
        })
        .catch((e) => toast(e.message)),
    [toast],
  );
  useEffect(() => {
    load();
  }, [load]);

  const uploadOne = async (file: File) => {
    const thumb = await makeThumb(file);
    if (storage === "local") {
      const form = new FormData();
      form.append("file", file);
      if (thumb) form.append("thumb", thumb, "thumb.jpg");
      form.append("author", me);
      await api("/api/photos", { method: "POST", body: form });
      return;
    }
    const { upload } = await import("@vercel/blob/client");
    const opts = { access: "private" as const, handleUploadUrl: "/api/photos/upload" };
    const ext = file.name.split(".").pop() || "jpg";
    const orig = await upload(`photos/${Date.now()}.${ext}`, file, { ...opts, multipart: file.size > 8 * 1024 * 1024 });
    const t = thumb ? await upload(`thumbs/${Date.now()}.jpg`, thumb, opts) : null;
    await api("/api/photos", {
      method: "POST",
      json: { author: me, url: orig.url, thumb_url: t?.url ?? "", filename: file.name, content_type: file.type, size: file.size },
    });
  };

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    if (!me) return pick();
    const list = Array.from(files);
    let fail = 0;
    for (let i = 0; i < list.length; i++) {
      setProgress(`${i + 1}/${list.length} 올리는 중…`);
      try {
        await uploadOne(list[i]);
      } catch (e) {
        console.error(e);
        fail++;
      }
    }
    setProgress("");
    if (fileInput.current) fileInput.current.value = "";
    toast(fail ? `${list.length - fail}장 완료, ${fail}장 실패` : `${list.length}장 올렸어요`);
    load();
  };

  const shown = (photos ?? []).filter((p) => !filter || p.author === filter);

  const toggle = (id: number) =>
    setSelected((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  // 선택한 사진 저장: 휴대폰은 공유 시트(사진 앱에 저장), 안 되면 zip
  const saveSelected = async () => {
    const targets = shown.filter((p) => selected.has(p.id));
    if (!targets.length) return;
    setProgress(`${targets.length}장 준비 중…`);
    try {
      const files = await Promise.all(
        targets.map(async (p) => {
          const b = await fetch(src(p)).then((r) => r.blob());
          return new File([b], p.filename || `photo-${p.id}.jpg`, { type: p.content_type || b.type });
        }),
      );
      if (navigator.canShare?.({ files })) {
        try {
          await navigator.share({ files });
        } catch (e) {
          if ((e as Error).name !== "AbortError") throw e;
        }
      } else {
        const JSZip = (await import("jszip")).default;
        const zip = new JSZip();
        const names = new Set<string>();
        for (const f of files) {
          let name = f.name;
          for (let i = 1; names.has(name); i++) name = `${i}_${f.name}`;
          names.add(name);
          zip.file(name, f);
        }
        const blob = await zip.generateAsync({ type: "blob" });
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `대만여행_사진_${targets.length}장.zip`;
        a.click();
      }
      setSelecting(false);
      setSelected(new Set());
    } catch (e) {
      toast(`저장 실패: ${(e as Error).message}`);
    } finally {
      setProgress("");
    }
  };

  const remove = async (p: Photo) => {
    if (!confirm("이 사진을 모두에게서 삭제할까요?")) return;
    await api(`/api/photos/${p.id}`, { method: "DELETE" });
    setViewer(null);
    load();
  };

  return (
    <div className="pb-24">
      <div className="sticky top-0 z-10 space-y-2 border-b border-gray-200 bg-white p-3">
        <div className="flex gap-2">
          <button onClick={() => fileInput.current?.click()} disabled={!!progress} className="flex-1 rounded-lg bg-blue-600 py-2.5 font-bold text-white disabled:bg-gray-300">
            {progress || "📤 사진 올리기"}
          </button>
          <button
            onClick={() => {
              setSelecting(!selecting);
              setSelected(new Set());
            }}
            className={`rounded-lg border px-4 ${selecting ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-300"}`}
          >
            {selecting ? "취소" : "선택"}
          </button>
        </div>
        <input ref={fileInput} type="file" accept="image/*,video/*" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <div className="flex gap-1.5 overflow-x-auto [scrollbar-width:none]">
          {["", ...MEMBERS.map((m) => m.name)].map((n) => (
            <button key={n || "all"} onClick={() => setFilter(n)} className={`shrink-0 rounded-full px-3 py-1 text-sm ${filter === n ? "bg-gray-900 text-white" : "bg-gray-100"}`}>
              {n || `전체 ${photos?.length ?? ""}`}
            </button>
          ))}
        </div>
      </div>

      {photos && shown.length === 0 && <p className="p-10 text-center text-sm text-gray-400">아직 사진이 없어요. 여행 사진을 모두 올려주세요 📷</p>}

      <div className="grid grid-cols-3 gap-0.5 p-0.5">
        {shown.map((p) => (
          <button key={p.id} onClick={() => (selecting ? toggle(p.id) : setViewer(p))} className="relative aspect-square overflow-hidden bg-gray-200">
            {isVideo(p) ? (
              <div className="flex h-full items-center justify-center text-3xl">🎬</div>
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src(p, true)} alt="" loading="lazy" className="h-full w-full object-cover" />
            )}
            <span className="absolute bottom-0.5 left-1 text-[10px] text-white drop-shadow">{p.author}</span>
            {selecting && (
              <span className={`absolute top-1 right-1 flex size-6 items-center justify-center rounded-full border-2 border-white text-xs font-bold ${selected.has(p.id) ? "bg-blue-600 text-white" : "bg-black/20"}`}>
                {selected.has(p.id) ? "✓" : ""}
              </span>
            )}
          </button>
        ))}
      </div>

      {selecting && (
        <div className="fixed inset-x-0 bottom-[calc(56px+env(safe-area-inset-bottom))] z-20 mx-auto flex max-w-xl gap-2 border-t border-gray-200 bg-white p-3">
          <button onClick={() => setSelected(new Set(shown.map((p) => p.id)))} className="rounded-lg border border-gray-300 px-4 py-2.5">
            전체 선택
          </button>
          <button onClick={saveSelected} disabled={!selected.size || !!progress} className="flex-1 rounded-lg bg-blue-600 py-2.5 font-bold text-white disabled:bg-gray-300">
            {progress || `⬇️ ${selected.size}장 저장`}
          </button>
        </div>
      )}

      {viewer && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
          <div className="flex items-center justify-between p-3 text-sm text-white">
            <span>
              {viewer.author} · {new Date(viewer.created_at).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "numeric", minute: "2-digit" })}
            </span>
            <button onClick={() => setViewer(null)} className="px-2 text-2xl leading-none">
              ✕
            </button>
          </div>
          <div className="flex min-h-0 flex-1 items-center justify-center">
            {isVideo(viewer) ? (
              <video src={src(viewer)} controls playsInline className="max-h-full max-w-full" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src(viewer)} alt="" className="max-h-full max-w-full object-contain" />
            )}
          </div>
          <div className="flex gap-2 p-3">
            <a href={`${src(viewer)}?download=1`} className="flex-1 rounded-lg bg-white py-2.5 text-center font-bold">
              ⬇️ 다운로드
            </a>
            <button onClick={() => remove(viewer)} className="rounded-lg border border-red-400 px-4 text-red-400">
              삭제
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
