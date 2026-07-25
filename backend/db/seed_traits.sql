-- traits_seed.json 기반 초기 특성 데이터 삽입
-- schema.sql 실행 후, 이 파일을 Supabase SQL Editor에서 그대로 실행하면 됨

INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('BigFive', 'bigfive_openness', 'bipolar', '개방성', 'stable', 'adventure', '안정형', '모험형');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('BigFive', 'bigfive_conscientiousness', 'bipolar', '성실성', 'planner', 'spontaneous', '계획형', '즉흥형');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('BigFive', 'bigfive_extraversion', 'bipolar', '외향성', 'relationship', 'independence', '관계형', '독립형');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('BigFive', 'bigfive_agreeableness', 'bipolar', '친화성', 'logic', 'emotion', '이성형', '감성형');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('BigFive', 'bigfive_stability', 'bipolar', '정서안정성', 'steady', 'reactive', '안정적인 편', '기복 있는 편');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('RIASEC', 'riasec_realistic', 'independent', '현장형(R)', NULL, NULL, NULL, NULL);
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('RIASEC', 'riasec_investigative', 'independent', '탐구형(I)', NULL, NULL, NULL, NULL);
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('RIASEC', 'riasec_artistic', 'independent', '예술형(A)', NULL, NULL, NULL, NULL);
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('RIASEC', 'riasec_social', 'independent', '사회형(S)', NULL, NULL, NULL, NULL);
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('RIASEC', 'riasec_enterprising', 'independent', '진취형(E)', NULL, NULL, NULL, NULL);
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('RIASEC', 'riasec_conventional', 'independent', '관습형(C)', NULL, NULL, NULL, NULL);
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('DecisionMaking', 'decision_style', 'bipolar', '의사결정스타일', 'quick', 'deliberate', '직관적 결정', '신중한 결정');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('DecisionMaking', 'risk_taking', 'bipolar', '위험감수성향', 'safe', 'risky', '안전 추구', '위험 감수');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Cognition', 'locus_of_control', 'bipolar', '통제소재', 'internal', 'external', '내적 통제', '외적 통제');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Relationship', 'conflict_style', 'bipolar', '갈등대응스타일', 'direct', 'avoidant', '직면형', '회피형');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Relationship', 'communication_tone', 'bipolar', '커뮤니케이션톤', 'blunt', 'tactful', '직설적', '완곡한');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Relationship', 'love_language', 'independent', '애정표현방식', NULL, NULL, NULL, NULL);
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Lifestyle', 'time_perspective', 'bipolar', '시간관', 'past', 'future', '과거지향', '미래지향');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Lifestyle', 'spending_style', 'bipolar', '소비성향', 'planned', 'impulsive', '계획소비', '충동소비');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Learning', 'learning_motivation', 'bipolar', '학업동기유형', 'intrinsic', 'extrinsic', '내적동기', '외적동기');
INSERT INTO traits (family, key, type, name, pole_left, pole_right, pole_left_label, pole_right_label) VALUES ('Learning', 'study_pattern', 'bipolar', '공부방식', 'cram', 'steady', '몰아서', '나눠서');