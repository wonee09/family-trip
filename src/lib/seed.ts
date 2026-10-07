// 초기 일정 데이터 (npm run db:setup 때 DB로 들어감)
export type SeedItem = {
  time: string;
  title_ko: string;
  title_zh?: string;
  zh_pron?: string; // title_zh 한글 발음
  address_zh?: string;
  map_url?: string;
  category: string;
  reserved?: boolean;
  note?: string;
};

export const SEED_DAYS: { date: string; title: string; items: SeedItem[] }[] = [
  {
    date: "2026-10-08",
    title: "도착 · 고궁박물관 · 훠궈",
    items: [
      { time: "09:05", title_ko: "인천 T1 출발 (제주항공 7C6101)", category: "flight", reserved: true, note: "지윤 제외 4명. 10:55 타오위안 T1 도착" },
      { time: "11:50", title_ko: "공항 → 호텔 (9인승 밴 또는 택시 2대)", title_zh: "桃園機場 → 台北花園大酒店", zh_pron: "타오위안 지창 → 타이베이 화위안 다지우뎬", category: "transport", note: "밴 약 TWD 1,600, 40~50분 (tripool / KKday 예약). 대안: 택시 2대 대당 1,100~1,300" },
      { time: "12:45", title_ko: "타이베이 가든호텔 짐 맡기기", title_zh: "台北花園大酒店", zh_pron: "타이베이 화위안 다지우뎬", address_zh: "台北市中正區中華路二段1號", category: "hotel", reserved: true, note: "MRT 샤오난먼역 2번 출구. 체크인 15시" },
      { time: "13:00", title_ko: "점심: Red Alley Bistro (대만 가정식)", address_zh: "台北市萬華區漢中街171巷3號", map_url: "https://maps.app.goo.gl/hsjURoyS3jjagCCL7", category: "restaurant", note: "지희 추천. 평일이라 예약 없어도 될 듯. 호텔에서 가까움" },
      { time: "13:45", title_ko: "택시로 고궁박물관 이동 (약 30~40분)", title_zh: "國立故宮博物院", zh_pron: "궈리 꾸궁 보우위안", address_zh: "台北市士林區至善路二段221號", category: "transport", note: "5명이라 택시 2대 또는 우버XL" },
      { time: "14:30~16:30", title_ko: "국립고궁박물관 관람", title_zh: "國立故宮博物院", zh_pron: "궈리 꾸궁 보우위안", address_zh: "台北市士林區至善路二段221號", category: "attraction", note: "취옥백채·육형석 등 대표 유물은 3층 위주. 한국어 오디오가이드 확인" },
      { time: "17:00", title_ko: "호텔 체크인 · 휴식", title_zh: "台北花園大酒店", zh_pron: "타이베이 화위안 다지우뎬", address_zh: "台北市中正區中華路二段1號", category: "hotel", note: "20:30 저녁 전까지 휴식" },
      { time: "18:00", title_ko: "지윤 타오위안공항 도착", title_zh: "桃園國際機場", zh_pron: "타오위안 궈지 지창", category: "flight", note: "공항MRT로 타이베이역까지 약 40분 → 식당 합류" },
      { time: "20:30", title_ko: "저녁: 지아펀 쿠부 궈우 신생점 (훠궈)", title_zh: "加分昆布鍋物 新生店", zh_pron: "쟈펀 쿤부 궈우 신셩뎬", address_zh: "台北市中山區新生北路一段90號", map_url: "https://maps.app.goo.gl/XKLVZm8Sq2bVxTmZ9", category: "restaurant", reserved: true, note: "예약자 서지희 (SEO JIHUI)" },
    ],
  },
  {
    date: "2026-10-09",
    title: "예스폭지 · 101 야경",
    items: [
      { time: "08:30~17:30", title_ko: "예스폭지 택시투어 (예류·스펀·폭포·지우펀)", title_zh: "野柳・十分・十分瀑布・九份 包車", zh_pron: "예류 · 스펀 · 스펀 푸부 · 지우펀 바오처", category: "attraction", reserved: true, note: "예약자 서지희. 스펀 천등 날리기, 지우펀 저녁 전 복귀" },
      { time: "20:00", title_ko: "타이베이 101 89층 전망대 야경", title_zh: "台北101觀景台 89樓", zh_pron: "타이베이 이링이 관징타이 바스지우 러우", address_zh: "台北市信義區信義路五段7號", category: "attraction", reserved: true, note: "예약자 서지희" },
    ],
  },
  {
    date: "2026-10-10",
    title: "디화제 → 단수이 (쌍십절)",
    items: [
      { time: "09:00", title_ko: "호텔 출발", category: "transport", note: "국경일(쌍십절) — 총통부 주변 통제·혼잡 가능. 호텔이 총통부 근처라 이동 여유 있게" },
      { time: "09:30", title_ko: "디화제 산책 (옛 건물·건과일·차)", title_zh: "迪化街", zh_pron: "디화졔", category: "attraction" },
      { time: "10:30", title_ko: "용러시장", title_zh: "永樂市場", zh_pron: "융러 스창", category: "shop", note: "토요일 06:00~16:00" },
      { time: "11:30", title_ko: "점심 후보: 도소월 디화점 (단자면)", title_zh: "度小月 迪化店", zh_pron: "뚜샤오웨 디화뎬", address_zh: "台北市大同區迪化街一段112號", map_url: "https://maps.app.goo.gl/toh5LSEVbjd7ByJt5", category: "restaurant" },
      { time: "11:30", title_ko: "점심 후보: 江牛樓", title_zh: "江牛樓", zh_pron: "장니우러우", address_zh: "台北市大同區民樂街6號", map_url: "https://maps.app.goo.gl/d2eGuRxLZEfPpbrx8", category: "restaurant" },
      { time: "13:00", title_ko: "MRT로 단수이 이동 (약 40~50분)", title_zh: "捷運 淡水站", zh_pron: "졔윈 딴쉐이 짠", category: "transport" },
      { time: "14:00", title_ko: "단수이 라오제 · 강변 산책 (간식)", title_zh: "淡水老街", zh_pron: "딴쉐이 라오졔", category: "attraction", note: "대왕오징어, 아게이(阿給), 철판계란" },
      { time: "16:00", title_ko: "페리 → 어부인마두", title_zh: "淡水渡船頭 → 漁人碼頭", zh_pron: "딴쉐이 뚜촨터우 → 위런 마터우", category: "transport", note: "선착장 E/F에서 현장구매 약 NT$60, 15~20분. 붐비면 버스/택시" },
      { time: "17:00", title_ko: "어부인마두 · 연인의 다리 일몰 (17:32)", title_zh: "淡水漁人碼頭 情人橋", zh_pron: "딴쉐이 위런 마터우 칭런챠오", category: "attraction" },
      { time: "19:00", title_ko: "타이베이 복귀 · 저녁", category: "transport" },
    ],
  },
  {
    date: "2026-10-11",
    title: "귀국",
    items: [
      { time: "08:30", title_ko: "체크아웃 → 공항 이동", title_zh: "台北花園大酒店 → 桃園機場第一航廈", zh_pron: "타이베이 화위안 다지우뎬 → 타오위안 지창 디이 항샤", category: "transport", note: "출발 2시간 전 공항 도착 목표" },
      { time: "11:55", title_ko: "타오위안 T1 출발 (제주항공 7C6102)", title_zh: "桃園國際機場 第一航廈", zh_pron: "타오위안 궈지 지창 디이 항샤", category: "flight", reserved: true, note: "15:35 인천 T1 도착" },
    ],
  },
];
