-- ============================================================
-- 자기발견 앱 - 문항/특성(trait) 다대다 연결 스키마
--
-- 핵심 설계: 질문 하나가 여러 카테고리(특성)에 서로 다른 가중치로
-- 동시에 기여할 수 있다. (심리측정학의 "요인적재 factor loading" 개념)
--
-- trait에는 두 종류가 있다:
--  - bipolar: 양극 구조 (예: 외향형 <-> 내향형). 점수는 -1~+1로 누적.
--  - independent: 서로 독립적인 다중 유형 (예: RIASEC 6유형,
--                 에니어그램 9유형). 점수는 유형별로 각각 누적.
-- ============================================================

CREATE TABLE traits (
  id            SERIAL PRIMARY KEY,
  family        TEXT NOT NULL,          -- 'BigFive' | 'RIASEC' | 'ConflictStyle' | ...
  key           TEXT NOT NULL UNIQUE,   -- 'bigfive_extraversion', 'riasec_realistic' ...
  type          TEXT NOT NULL CHECK (type IN ('bipolar','independent')),
  name          TEXT NOT NULL,          -- 화면에 보여줄 이름 (예: '외향성')
  pole_left     TEXT,                   -- bipolar 전용
  pole_right    TEXT,                   -- bipolar 전용
  pole_left_label  TEXT,                -- '외향형'
  pole_right_label TEXT,                -- '내향형'
  clinical_flag BOOLEAN NOT NULL DEFAULT FALSE, -- 임상/진단성 축 여부 (항상 FALSE 유지, 검수용 안전장치)
  created_at    TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE questions (
  id            SERIAL PRIMARY KEY,
  format_type   TEXT NOT NULL,   -- 'ab_dual' | 'four_choice' | 'metaphor' | 'object_choice'
  prompt_text   TEXT,            -- 4지선다/비유형처럼 질문 문구가 따로 있는 경우
  options       JSONB NOT NULL,  -- [{"key":"a","text":"..."}, {"key":"b","text":"..."}, ...]
  category_hint TEXT,            -- 생성 당시 주 카테고리 (사람이 훑어볼 때 참고용, 스코어링엔 안 씀)
  status        TEXT NOT NULL DEFAULT 'active', -- active | retired | flagged
  created_at    TIMESTAMPTZ DEFAULT now()
);

-- 문항 <-> 특성 다대다 연결 테이블 (핵심)
CREATE TABLE question_trait_links (
  id            SERIAL PRIMARY KEY,
  question_id   INT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  option_key    TEXT NOT NULL,   -- 이 옵션을 고르면 (예: 'a')
  trait_id      INT NOT NULL REFERENCES traits(id),
  pole          TEXT,            -- bipolar: 어느 극인지 (pole_left/pole_right 값 중 하나). independent면 NULL.
  weight        NUMERIC(3,2) NOT NULL CHECK (weight >= 0 AND weight <= 1),
  UNIQUE(question_id, option_key, trait_id)
);

CREATE TABLE responses (
  id            SERIAL PRIMARY KEY,
  user_id       TEXT NOT NULL,
  question_id   INT NOT NULL REFERENCES questions(id),
  chosen_option TEXT NOT NULL,
  answered_at   TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, question_id)   -- 같은 문항 재답변 시 최신값으로 갱신하려면 UPSERT 사용
);

CREATE INDEX idx_qtl_question ON question_trait_links(question_id);
CREATE INDEX idx_qtl_trait ON question_trait_links(trait_id);
CREATE INDEX idx_responses_user ON responses(user_id);

-- 안전장치: 임상 플래그가 켜진 축은 애초에 못 만들도록 애플리케이션 레벨에서
-- clinical_flag = FALSE만 insert 허용. (우울/불안/자해/식이장애 스크리닝 축 생성 금지)
