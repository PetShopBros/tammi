# tammi
매일 조금씩, 나를 탐구하다 (Discover yourself, a little every day)

듀오링고 구조를 참고한, 매일 캐주얼한 A/B 카드에 답하며 자기 자신에 대한
데이터(성격·직업흥미·의사결정스타일 등)를 쌓아가는 앱 프로젝트.

## 폴더 구조

```
tammi/
├── backend/
│   ├── db/
│   │   └── schema.sql          # DB 스키마 (questions, traits, question_trait_links, responses)
│   ├── scripts/
│   │   ├── traits_seed.json    # 특성(카테고리) 레지스트리 초기 데이터
│   │   ├── generate_questions.py  # 문항 자동 생성 배치 스크립트
│   │   └── scoring.py          # 응답 -> 특성별 점수 계산 로직
│   ├── requirements.txt
│   └── .env.example
├── docs/
│   └── architecture.md         # 지금까지 논의한 설계 결정 요약
└── prototypes/
    ├── tammi_card_deck.html     # 탭 한번 A/B 카드 + 별자리(성단맵) 프로필 데모
    └── tammi_journal_v1.html    # 초기 버전 (매일 질문 텍스트 저널형, 참고용)
```

## 시작하기 (백엔드)

```bash
cd backend
python -m venv venv
source venv/bin/activate   # Windows는 venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # 실제 ANTHROPIC_API_KEY 입력
```

### DB 만들기 (PostgreSQL 기준)

```bash
psql -U youruser -d yourdb -f db/schema.sql
```

### 문항 생성해보기

```bash
export ANTHROPIC_API_KEY=sk-ant-...
cd scripts
python generate_questions.py --primary bigfive_openness --count 20
```

실행하면 `scripts/question_bank.json`에 신규 문항이 쌓여요. 같은 폴더에서
`traits_seed.json`의 다른 key(`bigfive_conscientiousness`, `riasec_social` 등)로
바꿔가며 반복 실행하면 카테고리별로 문항이 늘어나요.

## 다음 단계 (미완료)

- [ ] four_choice / metaphor / object_choice 형식별 프롬프트 스펙 추가
- [ ] 실제 DB(Postgres 등)에 question_bank.json을 insert하는 로더 스크립트
- [ ] 자동 스케줄링 등록 (cron / GitHub Actions / 서버리스 cron)
- [ ] 프론트엔드(카드 UI)에서 백엔드 API로 문항 받아오도록 연결
- [ ] 친구 비교 기능을 실제 계정 시스템과 연결
