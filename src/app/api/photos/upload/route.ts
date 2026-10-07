import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";

// Vercel Blob 클라이언트 직접 업로드용 토큰 발급 (서버 용량 제한 4.5MB 우회)
export async function POST(req: Request) {
  const body = (await req.json()) as HandleUploadBody;
  try {
    const json = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async () => ({
        allowedContentTypes: ["image/*", "video/*"],
        maximumSizeInBytes: 200 * 1024 * 1024,
        addRandomSuffix: true,
      }),
    });
    return Response.json(json);
  } catch (e) {
    return Response.json({ error: String(e) }, { status: 400 });
  }
}
