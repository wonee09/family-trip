import { cookies } from "next/headers";
import { AUTH_COOKIE, passcodeToken } from "@/lib/auth";

export async function POST(req: Request) {
  const { passcode } = await req.json();
  const expected = process.env.APP_PASSCODE;
  if (expected && passcode !== expected) return Response.json({ error: "비밀번호가 달라요" }, { status: 401 });
  if (expected) {
    (await cookies()).set(AUTH_COOKIE, await passcodeToken(expected), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 60,
      path: "/",
    });
  }
  return Response.json({ ok: true });
}
