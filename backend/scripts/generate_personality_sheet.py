"""
generate_personality_sheet.py

특정 사용자(user_id)의 최신 트레잇 점수(trait_score_history)를 바탕으로,
다른 AI(ChatGPT, Claude 등)에게 그대로 복사-붙여넣기 할 수 있는
"인격 요약 시트"를 생성한다.

용도 (b): 사용자가 이 텍스트를 복사해서 외부 AI 대화창에 직접 붙여넣는 용도.
내부 API 자동 연동이나 서비스 간 자동 공유가 아니다.

규칙:
- Taste 계열(family='Taste')은 이 시트에서 완전히 제외한다 (별도 추천 서비스용).
- confidence가 있는 트레잇은 가능한 한 모두 포함한다 (정보량 최대화, 임의 생략 금지).
- 숫자 대신 해석된 문장으로 표현한다.
- confidence가 낮은 트레잇은 "데이터 적음, 참고용" 플래그를 붙여 포함한다 (제외하지 않음).
- 마지막에 "이 사람과 대화할 때 참고할 점" 섹션으로 실용적 지침을 준다.

실행 예:
    python generate_personality_sheet.py --user-id abc123

필요 환경변수 (backend/.env): ANTHROPIC_API_KEY, DATABASE_URL
"""

import argparse
import json
import os
from collections import defaultdict
from pathlib import Path

import anthropic
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR.parent / ".env")

# 이 값보다 confidence가 낮으면 시트에 "데이터 적음, 참고용" 플래그를 붙인다.
LOW_CONFIDENCE_THRESHOLD = 0.5


def fetch_latest_trait_snapshot(user_id):
    """
    trait_score_history에서 사용자별 각 trait의 '가장 최근 snapshot_date' 행만 가져온다.
    Taste family는 여기서 아예 제외한다.
    """
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        """
        SELECT DISTINCT ON (tsh.trait_id)
               t.id, t.family, t.key, t.type, t.name,
               t.pole_left_label, t.pole_right_label,
               tsh.score, tsh.confidence, tsh.answered_weight, tsh.snapshot_date
        FROM trait_score_history tsh
        JOIN traits t ON t.id = tsh.trait_id
        WHERE tsh.user_id = %s
          AND t.family != 'Taste'
        ORDER BY tsh.trait_id, tsh.snapshot_date DESC;
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows


def build_trait_vector(rows):
    """
    DB row -> 프롬프트에 넣을 trait_vector 리스트로 변환.
    bipolar: score(0~100, pole_left 쪽 비율)를 기준으로 우세한 쪽 라벨을 pole로 표기.
    independent (RIASEC, love_language 등): family 내 전체 유형을 다 포함한다
    (top2로 자르지 않음 - 정보 최대화 원칙).
    """
    independent_by_family = defaultdict(list)
    bipolar_list = []

    for (trait_id, family, key, ttype, name, pole_left_label, pole_right_label,
         score, confidence, answered_weight, snapshot_date) in rows:
        score = float(score)
        confidence = float(confidence)

        if ttype == "bipolar":
            dominant_label = pole_left_label if score >= 50 else pole_right_label
            bipolar_list.append({
                "trait": name,
                "family": family,
                "pole": dominant_label,
                "strength_pct": round(score if score >= 50 else 100 - score),
                "confidence": round(confidence, 2),
            })
        else:
            independent_by_family[family].append({
                "trait": name,
                "family": family,
                "score": score,
                "confidence": round(confidence, 2),
            })

    independent_list = []
    for family, items in independent_by_family.items():
        items_sorted = sorted(items, key=lambda x: x["score"], reverse=True)
        independent_list.extend(items_sorted)  # 전체 포함 (top2 제한 없음)

    return bipolar_list + independent_list


def build_prompt(trait_vector):
    trait_vector_json = json.dumps(trait_vector, ensure_ascii=False, indent=2)

    return f"""당신은 심리측정 데이터를 바탕으로, 한 사람의 성향을 다른 AI가 즉시
이해하고 활용할 수 있는 "인격 요약 시트"를 작성하는 전문가입니다.

[입력 데이터]
아래는 한 사용자의 트레잇 점수입니다. bipolar 트레잇은 (트레잇명, 우세한 극,
강도%, 신뢰도), independent 트레잇(RIASEC/애정표현방식 등)은 (트레잇명, family
내 상대 점수, 신뢰도) 형태입니다. 신뢰도(confidence)는 0~1 사이 값입니다.

{trait_vector_json}

[작성 규칙]
1. 트레잇을 하나씩 기계적으로 나열하지 마세요. 전체 조합을 함께 보고, 이
   사람만의 고유한 패턴(트레잇 간 상호작용에서 드러나는 특이점)을 찾아내며
   설명하세요.
2. 숫자나 트레잇 영문 키를 그대로 쓰지 마세요. 반드시 해석된 자연어 문장으로
   표현하세요.
3. 입력으로 주어진 트레잇은 가능한 한 모두 반영하세요. 정보를 줄이기 위해
   임의로 트레잇을 생략하지 마세요. 다만 서로 관련 있는 트레잇끼리는
   묶어서 하나의 문장/문단으로 자연스럽게 풀어써도 됩니다 (기계적 나열이
   아니라 자연스러운 서술이 목표입니다). 어떤 트레잇이 더 중요한지는
   마지막 "대화할 때 참고할 점" 섹션에서 우선순위로 드러내면 됩니다.
4. confidence가 {LOW_CONFIDENCE_THRESHOLD} 미만인 트레잇을 포함할 경우,
   해당 문장 끝에 "(데이터 적음, 참고용)"이라고 명시하세요.
5. 반드시 아래 섹션 구조를 지키세요:

■ 성격
(Big Five 기반)

■ 성향 특이점
(트레잇 조합에서 나온, 이 사람만의 고유 패턴)

■ 일하는 방식 / 의사결정
(RIASEC, decision_style, risk_taking 등 기반)

■ 관계/소통
(conflict_style, love_language, communication_tone 등 기반)

■ 이 사람과 대화할 때 참고할 점
(위 내용을 바탕으로 AI가 실제로 응대 방식을 바꿀 수 있는 실용적 지침.
 명령형/제안형으로 bullet)

6. 존댓말이나 격식 없이, 담백하고 명확한 설명체로 쓰세요.
7. 반드시 한국어로 작성하세요.

이제 위 데이터를 바탕으로 시트를 작성하세요. 다른 설명이나 인사말 없이
시트 본문만 출력하세요."""


def generate_sheet(user_id):
    rows = fetch_latest_trait_snapshot(user_id)
    if not rows:
        print(f"user_id={user_id}에 대한 트레잇 스냅샷 데이터가 없어요. "
              f"snapshot_trait_scores.py를 먼저 실행했는지 확인해주세요.")
        return None

    trait_vector = build_trait_vector(rows)
    if not trait_vector:
        print("Taste 데이터를 제외하고 나면 시트를 만들 트레잇이 없어요.")
        return None

    prompt = build_prompt(trait_vector)

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=3000,
        messages=[{"role": "user", "content": prompt}],
    )
    sheet_text = resp.content[0].text
    if resp.stop_reason == "max_tokens":
        print("[경고] 출력이 max_tokens 한도에 걸려 중간에 잘렸을 수 있어요.")
    print(sheet_text)
    return sheet_text


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True, help="시트를 생성할 사용자 ID")
    args = parser.parse_args()
    generate_sheet(args.user_id)