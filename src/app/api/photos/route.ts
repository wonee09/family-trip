import { connection } from "next/server";
import { q } from "@/lib/db";
import { saveLocal, STORAGE } from "@/lib/storage";

export async function GET() {
  await connection();
  const photos = await q(
    "SELECT id, author, filename, content_type, size, thumb_url <> '' AS has_thumb, created_at FROM photos ORDER BY id DESC",
  );
  return Response.json({ storage: STORAGE, photos });
}

// local: multipart(file, thumb, author) / blob: JSON(이미 업로드된 url 메타데이터)
export async function POST(req: Request) {
  if ((req.headers.get("content-type") ?? "").includes("multipart/form-data")) {
    const form = await req.formData();
    const file = form.get("file") as File | null;
    const thumb = form.get("thumb") as File | null;
    if (!file) return Response.json({ error: "file 필요" }, { status: 400 });
    const url = await saveLocal(file);
    const thumbUrl = thumb ? await saveLocal(thumb) : "";
    const [row] = await q(
      "INSERT INTO photos (author, storage, url, thumb_url, filename, content_type, size) VALUES ($1,'local',$2,$3,$4,$5,$6) RETURNING id",
      [String(form.get("author") ?? ""), url, thumbUrl, file.name, file.type, file.size],
    );
    return Response.json(row);
  }
  const { author = "", url, thumb_url = "", filename = "", content_type = "", size = 0 } = await req.json();
  if (STORAGE !== "blob" || !url) return Response.json({ error: "잘못된 요청" }, { status: 400 });
  const [row] = await q(
    "INSERT INTO photos (author, storage, url, thumb_url, filename, content_type, size) VALUES ($1,'blob',$2,$3,$4,$5,$6) RETURNING id",
    [author, url, thumb_url, filename, content_type, size],
  );
  return Response.json(row);
}
