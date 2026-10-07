import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

// APP_PASSCODE가 설정돼 있으면 가족 비밀번호를 입력해야 접속 가능
export async function proxy(req: NextRequest) {
  const passcode = process.env.APP_PASSCODE;
  if (!passcode) return NextResponse.next();
  if (req.cookies.get(AUTH_COOKIE)?.value === (await passcodeToken(passcode))) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) return Response.json({ error: "로그인이 필요해요" }, { status: 401 });
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|api/login|_next/|favicon|icon|manifest).*)"],
};
