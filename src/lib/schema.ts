// DB 스키마 (앱 첫 실행 시 자동 적용, CREATE IF NOT EXISTS라 여러 번 실행해도 안전)
export const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS days (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS itinerary_items (
  id SERIAL PRIMARY KEY,
  day_id INT NOT NULL REFERENCES days(id) ON DELETE CASCADE,
  time TEXT NOT NULL DEFAULT '',
  title_ko TEXT NOT NULL,
  title_zh TEXT NOT NULL DEFAULT '',
  address_zh TEXT NOT NULL DEFAULT '',
  map_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT 'etc',
  reserved BOOLEAN NOT NULL DEFAULT FALSE,
  note TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS phrases (
  id SERIAL PRIMARY KEY,
  category TEXT NOT NULL DEFAULT 'custom',
  item_id INT REFERENCES itinerary_items(id) ON DELETE CASCADE,
  ko TEXT NOT NULL,
  zh TEXT NOT NULL,
  pron TEXT NOT NULL DEFAULT '',
  favorite BOOLEAN NOT NULL DEFAULT FALSE,
  created_by TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  room TEXT NOT NULL DEFAULT 'family',
  role TEXT NOT NULL,          -- user | assistant
  author TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS messages_room_id ON messages(room, id);

CREATE TABLE IF NOT EXISTS notes (
  id SERIAL PRIMARY KEY,
  author TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS photos (
  id SERIAL PRIMARY KEY,
  author TEXT NOT NULL DEFAULT '',
  storage TEXT NOT NULL,       -- local | blob
  url TEXT NOT NULL,
  thumb_url TEXT NOT NULL DEFAULT '',
  filename TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  size INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS zh_pron TEXT NOT NULL DEFAULT '';
ALTER TABLE itinerary_items ADD COLUMN IF NOT EXISTS menu JSONB;
`;
