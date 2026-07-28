-- ============================================================
-- trait_score_history: 사용자별 트레잇 점수의 일별 스냅샷
--
-- 목적:
--  1) 하루 답변 후 이전 값 대비 +/- 델타 표시
--  2) 주간/월간/연간 변화 통계/트렌드 뷰
--  3) confidence(신뢰도) 값 저장 -> progressive unlock, 블롭 애니메이션(글로우) 등에 사용
--
-- score 컬럼 규칙:
--  - bipolar 트레잇: pct_left 값 그대로 저장 (0~100)
--  - independent 트레잇 (RIASEC 등): raw_score를 0~100으로 정규화해서 저장
--    (정규화 방법은 scoring 확장 스크립트에서 처리, 여기선 스키마만 정의)
-- ============================================================

CREATE TABLE trait_score_history (
  id              SERIAL PRIMARY KEY,
  user_id         TEXT NOT NULL,
  trait_id        INT NOT NULL REFERENCES traits(id),
  snapshot_date   DATE NOT NULL DEFAULT CURRENT_DATE,
  score           NUMERIC(5,2) NOT NULL CHECK (score >= 0 AND score <= 100),
  confidence      NUMERIC(4,3) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  answered_weight NUMERIC(6,2) NOT NULL,  -- 이 시점까지 이 트레잇에 누적된 응답 가중치 합
  created_at      TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, trait_id, snapshot_date)  -- 하루 여러 번 답해도 그날의 최종값만 upsert
);

CREATE INDEX idx_tsh_user_trait_date ON trait_score_history(user_id, trait_id, snapshot_date);

-- 참고: 현재 tammi는 Supabase Auth 로그인 없이 localStorage의 익명 UUID(crypto.randomUUID())를
-- user_id로 그대로 씀 (responses, shared_codes 테이블과 동일 패턴). auth.uid() 기반 RLS는
-- 적용 불가하므로 이 테이블도 다른 테이블과 동일하게 RLS 미적용 상태로 둠.
-- 나중에 실제 로그인(Supabase Auth)을 붙이는 시점에 responses/trait_score_history/shared_codes
-- 전체를 한 번에 auth.uid() 기반 정책으로 마이그레이션하는 게 맞음.