# 결과 해석 레퍼런스

각 특성(trait)의 점수를 실제 사용자에게 보여줄 문구로 바꿀 때 참조하는 문서.
`scoring.py`가 계산한 `pct_left`/`pct_right`(bipolar) 또는 `raw_score`
(independent)를 이 문서의 톤으로 텍스트화한다.

## 카피라이팅 원칙 (전 특성 공통)

1. **단정하지 않기** — "당신은 OO입니다"가 아니라 "OO 편이에요" 처럼 경향으로 표현
2. **우열 없음** — 어느 쪽이든 장단점이 같이 있다는 걸 항상 같이 보여줌 (한쪽만 좋게 쓰지 않기)
3. **percentage는 참고용** — "72% 모험형"보다 "모험을 즐기는 편이에요, 다만 계획도 꽤 챙기는 편"처럼
   정도를 말로 풀어서 표현 (딱 떨어지는 숫자가 과학적으로 보이지만 실제로는 근사치이므로 과신 유도 금지)
4. **임상 용어 금지** — "장애", "증상", "진단" 등의 단어는 어떤 특성에도 쓰지 않음
5. **모든 결과 화면 하단에 공통 문구**:
   > "이 결과는 참고용 성향 분석이며, 심리 진단이 아니에요."

---

## Big Five (표준 심리측정 모델)

### 개방성 (bigfive_openness)
- **안정형(stable)**: 익숙한 것에서 편안함을 느끼고, 검증된 방식을 선호하는 편
- **모험형(adventure)**: 새로운 경험과 변화에 끌리고, 낯선 상황을 즐기는 편
- 근거: Big Five Openness to Experience

### 성실성 (bigfive_conscientiousness)
- **계획형(planner)**: 미리 준비하고 체계적으로 움직이는 걸 편하게 느낌
- **즉흥형(spontaneous)**: 그때그때 상황에 맞춰 유연하게 대응하는 걸 선호
- 근거: Big Five Conscientiousness

### 외향성 (bigfive_extraversion)
- **관계형(relationship)**: 사람들과 함께할 때 에너지를 얻는 편
- **독립형(independence)**: 혼자만의 시간에서 에너지를 회복하는 편
- 근거: Big Five Extraversion

### 친화성 (bigfive_agreeableness)
- **이성형(logic)**: 상황을 논리와 사실 위주로 판단하는 편
- **감성형(emotion)**: 상황을 감정과 분위기 위주로 판단하는 편
- 근거: Big Five Agreeableness (사고-감정 판단 축에 가깝게 캐주얼화)

### 정서안정성 (bigfive_stability)
- **안정적인 편(steady)**: 예상 밖의 일이 생겨도 비교적 담담하게 넘기는 편
- **기복 있는 편(reactive)**: 상황에 따라 감정이 크게 오르내리는 편
- 근거: Big Five Neuroticism (임상 용어 없이 일상 표현으로 순화)
- **주의**: 이 축은 우울/불안 스크리닝이 아님. "감정을 다루는 평소 습관" 정도로만 다룰 것

---

## RIASEC (Holland 직업흥미이론, 독립형 — 6개 유형 각각 별도 점수)

| 유형 | 결과 문구 |
|---|---|
| 현장형(R) | 손으로 만들고 몸으로 직접 해보는 활동에서 즐거움을 느껴요 |
| 탐구형(I) | 궁금한 걸 파고들고 분석하는 과정 자체를 좋아해요 |
| 예술형(A) | 정해진 틀보다 자유로운 표현과 창작에서 즐거움을 느껴요 |
| 사회형(S) | 사람을 돕고 함께 성장하는 일에서 보람을 느껴요 |
| 진취형(E) | 앞장서서 이끌고 설득하는 역할이 잘 맞는 편이에요 |
| 관습형(C) | 체계와 규칙 안에서 정확하게 처리하는 걸 편하게 느껴요 |

- 근거: Holland's RIASEC (직업흥미이론)
- 독립형이므로 6개 점수를 다 보여주고 **상위 2~3개 조합**으로 결과를 구성 (예: "I+A형")

---

## 의사결정/위험/통제소재

### 의사결정스타일 (decision_style)
- **직관적 결정(quick)**: 고민 오래 안 하고 감으로 빠르게 정하는 편
- **신중한 결정(deliberate)**: 정보를 충분히 모으고 여러 번 재본 뒤 정하는 편
- 근거: General Decision Making Style (Scott & Bruce)

### 위험감수성향 (risk_taking)
- **안전 추구(safe)**: 확실한 쪽을 선택하는 걸 선호
- **위험 감수(risky)**: 불확실하더라도 가능성에 거는 걸 선호
- 근거: 행동경제학의 위험 선호도 개념

### 통제소재 (locus_of_control)
- **내적 통제(internal)**: 결과가 자신의 노력과 선택에 달려있다고 보는 편
- **외적 통제(external)**: 결과에 운이나 상황의 영향이 크다고 보는 편
- 근거: Rotter's Locus of Control

---

## 관계/커뮤니케이션

### 갈등대응스타일 (conflict_style)
- **직면형(direct)**: 의견이 다르면 바로 이야기해서 풀려고 하는 편
- **회피형(avoidant)**: 일단 시간을 두고 자연스럽게 풀리길 기다리는 편
- 근거: Thomas-Kilmann Conflict Mode Instrument에서 착안 (경쟁/회피 축을 캐주얼화)

### 커뮤니케이션톤 (communication_tone)
- **직설적(blunt)**: 하고 싶은 말을 있는 그대로 표현하는 편
- **완곡한(tactful)**: 상대 입장을 고려해서 부드럽게 표현하는 편
- 근거: DISC 계열 커뮤니케이션 스타일 개념

### 애정표현방식 (love_language, 독립형)
- 5가지 사랑의 언어(Chapman)를 캐주얼화: 말/함께하는 시간/선물/스킨십/행동
- 근거: Gary Chapman의 5 Love Languages (학술적으로는 대중 상담이론에 가까움 — "재미로 보는" 톤 권장)

---

## 복합 지표 (여러 트레잇 조합)

### 타미 MBTI 유형 유추 (calculate_mbti.py)
- **절대 "MBTI 결과"라고 표기하지 않는다.** 항상 "타미 MBTI 유형 유추" 또는 동급의 구분 문구를 사용할 것.
- 실제 MBTI(Myers-Briggs Type Indicator)는 Katharine Briggs와 Isabel Briggs Myers가 만든 저작권 있는 검사로, 자체 문항지와 이분법적(둘 중 하나) 채점 방식을 갖는다. tammi는 이 검사를 사용하거나 재현하지 않으며, Jung의 심리유형론에서 유래한 4가지 선호축 개념만 차용해 이미 tammi가 갖고 있는 연속형(스펙트럼) 트레잇 점수로 자체 추정한다.
- 4축 매핑:
  - **E/I**: bigfive_extraversion 점수 그대로 사용 (score≥50 → E, <50 → I)
  - **N/S**: info_style 점수 그대로 사용 (score≥50 → N, <50 → S)
  - **T/F**: judgment_basis 점수 그대로 사용 (score≥50 → T, <50 → F)
  - **J/P**: bigfive_conscientiousness(60%) + decision_style 역방향(40%) 가중 평균 — `100 - decision_style_score`로 뒤집어서 사용 (decision_style은 pole_left가 즉흥/quick 방향이라 conscientiousness의 planner=J 방향과 반대이기 때문)
- confidence: 4축 각각 원본 트레잇의 confidence를 그대로 노출. 종합 confidence는 4축 중 최솟값. 특정 축 confidence가 낮으면 "데이터 적음, 참고용" 플래그 표시.
- 한계 명시: Big Five와 MBTI 축 간 상관관계는 축마다 강도가 다르며(E/I, J/P는 강함 / N/S는 중간 / T/F는 약함), 이 방식은 원본 MBTI 검사와 결과가 다를 수 있다. 검증된 심리측정 결과가 아니라 tammi 자체 트레잇 데이터 기반의 참고용 추정치임을 사용자에게 명시할 것.

---

## 라이프스타일

### 시간관 (time_perspective)
- **과거지향(past)**: 지난 추억이나 경험에서 의미를 찾는 편
- **미래지향(future)**: 앞으로의 계획과 목표에 더 무게를 두는 편
- 근거: Zimbardo Time Perspective Inventory

### 소비성향 (spending_style)
- **계획소비(planned)**: 예산을 정해두고 그 안에서 소비하는 편
- **충동소비(impulsive)**: 끌리는 순간 바로 소비하는 편
- 근거: 소비자행동론의 계획적/충동적 구매 개념

---

## 학습/동기

### 학업동기유형 (learning_motivation)
- **내적동기(intrinsic)**: 배우는 과정 자체가 재밌어서 하는 편
- **외적동기(extrinsic)**: 목표한 결과(점수, 인정)를 위해 하는 편
- 근거: Self-Determination Theory (Deci & Ryan)

### 공부방식 (study_pattern)
- **몰아서(cram)**: 한 번에 몰아서 처리하는 걸 선호
- **나눠서(steady)**: 매일 조금씩 꾸준히 하는 걸 선호
- 근거: 학습심리학의 분산학습(spaced practice) vs 집중학습(massed practice) 개념

---

## 결과 화면 조합 예시

여러 축을 하나의 요약 카드로 보여줄 때는, 축을 나열하지 말고 **문장으로 엮어서** 표현:

> "새로운 걸 시도하는 데 거부감이 없고(모험형), 결정도 비교적 빠른 편이에요(직관적 결정).
> 다만 감정 기복은 크지 않아서(안정적인 편), 갑작스러운 변화에도 크게 흔들리지 않는 타입이에요."

이렇게 하면 축 4~5개를 한 번에 보여줘도 "성적표" 느낌이 아니라 "나에 대한 짧은 소개글"처럼 읽혀요.