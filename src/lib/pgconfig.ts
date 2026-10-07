import type { PoolConfig } from "pg";

// 모든 표는 family_trip 스키마에 만든다 (이미 쓰던 DB의 다른 표와 섞이지 않게)
export const DB_SCHEMA = "family_trip";

/** DATABASE_URL → pg 설정. 로컬이 아니면 SSL 사용 (Render·Neon 등 외부 DB) */
export function pgConfig(url = process.env.DATABASE_URL ?? ""): PoolConfig {
  let connectionString = url;
  let local = true;
  try {
    const u = new URL(url);
    local = ["localhost", "127.0.0.1", "::1", ""].includes(u.hostname);
    // sslmode는 아래 ssl 옵션으로 대신 처리 (pg 버전별 해석 차이 방지)
    u.searchParams.delete("sslmode");
    connectionString = u.toString();
  } catch {}
  return {
    connectionString,
    ssl: local ? undefined : { rejectUnauthorized: false },
    options: `-c search_path=${DB_SCHEMA}`,
  };
}
