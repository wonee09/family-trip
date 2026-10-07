export const AUTH_COOKIE = "ft_auth";

export async function passcodeToken(passcode: string) {
  const data = new TextEncoder().encode(`family-trip:${passcode}`);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash), (b) => b.toString(16).padStart(2, "0")).join("");
}
