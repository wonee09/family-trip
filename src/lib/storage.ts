// 사진 저장소: BLOB_READ_WRITE_TOKEN 있으면 Vercel Blob(private), 없으면 로컬 uploads/ 폴더
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { del, get } from "@vercel/blob";

export const STORAGE: "blob" | "local" = process.env.BLOB_READ_WRITE_TOKEN ? "blob" : "local";
const LOCAL_DIR = join(process.cwd(), "uploads");

export async function saveLocal(file: File) {
  await mkdir(LOCAL_DIR, { recursive: true });
  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  await writeFile(join(LOCAL_DIR, name), Buffer.from(await file.arrayBuffer()));
  return name;
}

export async function readStored(storage: string, ref: string): Promise<{ body: BodyInit; type?: string } | null> {
  if (storage === "blob") {
    const res = await get(ref, { access: "private" });
    if (!res || res.statusCode !== 200) return null;
    return { body: res.stream, type: res.blob.contentType };
  }
  if (ref.includes("/") || ref.includes("..")) return null;
  try {
    return { body: new Uint8Array(await readFile(join(LOCAL_DIR, ref))) };
  } catch {
    return null;
  }
}

export async function removeStored(storage: string, refs: string[]) {
  const list = refs.filter(Boolean);
  if (storage === "blob") {
    if (list.length) await del(list);
    return;
  }
  await Promise.all(list.map((r) => unlink(join(LOCAL_DIR, r)).catch(() => {})));
}
