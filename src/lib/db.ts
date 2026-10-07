import { Pool, type QueryResultRow } from "pg";
import { pgConfig } from "./pgconfig";
import { SCHEMA_SQL } from "./schema";
import { SEED_DAYS } from "./seed";

const globalForPg = globalThis as unknown as { pgPool?: Pool };

export const pool =
  globalForPg.pgPool ??
  new Pool({ ...pgConfig(), max: 5 });

if (process.env.NODE_ENV !== "production") globalForPg.pgPool = pool;

// 새 DB(배포 환경)면 테이블 생성 + 초기 일정 입력
let ready: Promise<void> | null = null;
async function setup() {
  await pool.query(SCHEMA_SQL);
  const { rows } = await pool.query("SELECT count(*)::int AS n FROM days");
  if (rows[0].n > 0) return;
  for (const day of SEED_DAYS) {
    const d = await pool.query("INSERT INTO days (date, title) VALUES ($1, $2) ON CONFLICT (date) DO NOTHING RETURNING id", [day.date, day.title]);
    if (!d.rows[0]) continue;
    for (const it of day.items) {
      await pool.query(
        `INSERT INTO itinerary_items (day_id, time, title_ko, title_zh, address_zh, map_url, category, reserved, note, zh_pron)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [d.rows[0].id, it.time, it.title_ko, it.title_zh ?? "", it.address_zh ?? "", it.map_url ?? "", it.category, it.reserved ?? false, it.note ?? "", it.zh_pron ?? ""],
      );
    }
  }
}

export async function q<T extends QueryResultRow = QueryResultRow>(text: string, params: unknown[] = []) {
  ready ??= setup().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  const res = await pool.query<T>(text, params);
  return res.rows;
}

export type Day = { id: number; date: string; title: string };
export type Item = {
  id: number;
  day_id: number;
  time: string;
  title_ko: string;
  title_zh: string;
  address_zh: string;
  map_url: string;
  category: string;
  reserved: boolean;
  note: string;
  zh_pron: string;
  has_menu?: boolean;
};

export type MenuDish = { ko: string; zh: string; pron: string; price: string; desc: string };
export type Menu = { summary: string; signature: MenuDish[]; others: MenuDish[]; tips: string; sources: string[]; updated_at?: string };

export async function getItinerary() {
  const days = await q<Day>("SELECT id, to_char(date, 'YYYY-MM-DD') AS date, title FROM days ORDER BY date");
  const items = await q<Item>(
    "SELECT id, day_id, time, title_ko, title_zh, zh_pron, address_zh, map_url, category, reserved, note, menu IS NOT NULL AS has_menu FROM itinerary_items ORDER BY time, id",
  );
  return days.map((d) => ({ ...d, items: items.filter((i) => i.day_id === d.id) }));
}

export const ITEM_FIELDS = ["time", "title_ko", "title_zh", "zh_pron", "address_zh", "map_url", "category", "reserved", "note"] as const;

export async function addItem(date: string, fields: Partial<Item>) {
  let [day] = await q<Day>("SELECT id FROM days WHERE date = $1", [date]);
  if (!day) [day] = await q<Day>("INSERT INTO days (date) VALUES ($1) RETURNING id", [date]);
  const [row] = await q<Item>(
    `INSERT INTO itinerary_items (day_id, time, title_ko, title_zh, address_zh, map_url, category, reserved, note, zh_pron)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
    [day.id, fields.time ?? "", fields.title_ko ?? "", fields.title_zh ?? "", fields.address_zh ?? "", fields.map_url ?? "", fields.category ?? "etc", fields.reserved ?? false, fields.note ?? "", fields.zh_pron ?? ""],
  );
  return row;
}

export async function updateItem(id: number, fields: Partial<Item> & { date?: string }) {
  const sets: string[] = [];
  const vals: unknown[] = [];
  for (const k of ITEM_FIELDS) {
    if (fields[k] !== undefined) {
      vals.push(fields[k]);
      sets.push(`${k} = $${vals.length}`);
    }
  }
  if (fields.date) {
    let [day] = await q<Day>("SELECT id FROM days WHERE date = $1", [fields.date]);
    if (!day) [day] = await q<Day>("INSERT INTO days (date) VALUES ($1) RETURNING id", [fields.date]);
    vals.push(day.id);
    sets.push(`day_id = $${vals.length}`);
  }
  if (!sets.length) return null;
  vals.push(id);
  const [row] = await q<Item>(`UPDATE itinerary_items SET ${sets.join(", ")} WHERE id = $${vals.length} RETURNING *`, vals);
  return row ?? null;
}

export async function deleteItem(id: number) {
  const rows = await q("DELETE FROM itinerary_items WHERE id = $1 RETURNING id", [id]);
  return rows.length > 0;
}
