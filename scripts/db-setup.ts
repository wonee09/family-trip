// 스키마 생성 + (비어 있으면) 초기 일정 넣기
// 사용: npm run db:setup        (이미 데이터 있으면 일정은 건드리지 않음)
//      npm run db:setup -- --reset-itinerary   (일정만 초기값으로 덮어쓰기)
import { join } from "node:path";
import { Client } from "pg";
import { pgConfig } from "../src/lib/pgconfig";
import { SCHEMA_SQL } from "../src/lib/schema";
import { SEED_DAYS } from "../src/lib/seed";

process.loadEnvFile?.(join(__dirname, "..", ".env"));

async function main() {
  const client = new Client(pgConfig());
  await client.connect();
  await client.query(SCHEMA_SQL);

  const reset = process.argv.includes("--reset-itinerary");
  const { rows } = await client.query("SELECT count(*)::int AS n FROM days");
  if (rows[0].n > 0 && !reset) {
    console.log("일정 데이터가 이미 있어서 시드는 건너뜁니다.");
  } else {
    await client.query("BEGIN");
    await client.query("DELETE FROM days");
    for (const day of SEED_DAYS) {
      const d = await client.query("INSERT INTO days (date, title) VALUES ($1, $2) RETURNING id", [day.date, day.title]);
      for (const it of day.items) {
        await client.query(
          `INSERT INTO itinerary_items (day_id, time, title_ko, title_zh, address_zh, map_url, category, reserved, note, zh_pron)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
          [d.rows[0].id, it.time, it.title_ko, it.title_zh ?? "", it.address_zh ?? "", it.map_url ?? "", it.category, it.reserved ?? false, it.note ?? "", it.zh_pron ?? ""],
        );
      }
    }
    await client.query("COMMIT");
    console.log(`일정 ${SEED_DAYS.length}일치 입력 완료`);
  }
  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
