# 우리가족 여행도우미 (대만)

Next.js 16 + PostgreSQL + OpenAI. 기능은 [docs/기능명세서.md](docs/기능명세서.md) 참고.

## 로컬 실행
1. `.env`에 `OPENAI_API_KEY` 입력
2. `createdb family_trip && npm run db:setup` (스키마 + 초기 일정)
3. `npm run dev` → http://localhost:3000

- 일정을 초기값으로 되돌리기: `npm run db:setup -- --reset-itinerary`
- 같은 와이파이의 폰에서 보기: `http://<맥 IP>:3000` (카톡 공유 시트는 https 배포 후 동작, 그 전엔 복사 방식)

## DB
- 표는 모두 `family_trip` 스키마에 생성 (기존 DB를 같이 써도 안전). 첫 접속 때 자동 생성·초기 일정 입력
- 외부 DB(Render 등)는 `DATABASE_URL`에 **External Database URL**을 넣으면 SSL로 자동 연결
