"""
recommend.py

특정 사용자(user_id)가 지금까지 답한 문항(responses)을 바탕으로 특성 점수를
계산하고, 그 중 취향(Taste) 축 + 두드러진 성향 축을 뽑아서 개인화된 추천
문구를 생성한다.

성격 특성("당신은 OO한 편이에요")과 취향 데이터("이런 거 좋아하실 것 같아요")는
결이 다르므로, 프롬프트에서도 명확히 구분해서 다룬다.

실행 예:
    python recommend.py --user-id abc123

필요 환경변수 (backend/.env): ANTHROPIC_API_KEY, DATABASE_URL
"""

import argparse
import os
from pathlib import Path

import anthropic
import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR.parent / ".env")


def fetch_user_scores(user_id):
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute(
        """
        SELECT t.id, t.family, t.key, t.type, t.name,
               t.pole_left, t.pole_right, t.pole_left_label, t.pole_right_label,
               qtl.pole, qtl.weight
        FROM responses r
        JOIN question_trait_links qtl
          ON qtl.question_id = r.question_id AND qtl.option_key = r.chosen_option
        JOIN traits t ON t.id = qtl.trait_id
        WHERE r.user_id = %s;
        """,
        (user_id,),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()

    bipolar = {}
    independent = {}
    for (trait_id, family, key, ttype, name, pole_left, pole_right,
         pole_left_label, pole_right_label, pole, weight) in rows:
        if ttype == "bipolar":
            agg = bipolar.setdefault(key, {
                "name": name, "family": family, "score": 0.0, "weight_sum": 0.0,
                "pole_left": pole_left, "pole_right": pole_right,
                "pole_left_label": pole_left_label, "pole_right_label": pole_right_label,
            })
            direction = 1 if pole == pole_left else -1
            agg["score"] += direction * float(weight)
            agg["weight_sum"] += float(weight)
        else:
            agg = independent.setdefault(key, {"name": name, "family": family, "score": 0.0})
            agg["score"] += float(weight)

    return bipolar, independent


def summarize_for_prompt(bipolar, independent):
    taste_lines = []
    personality_lines = []

    for key, a in bipolar.items():
        if a["weight_sum"] == 0:
            continue
        pct_left = round((a["score"] / a["weight_sum"] + 1) / 2 * 100)
        dominant_label = a["pole_left_label"] if pct_left >= 50 else a["pole_right_label"]
        line = f"- {a['name']}: {dominant_label} 쪽에 가까움"
        if a["family"] == "Taste":
            taste_lines.append(line)
        else:
            personality_lines.append(line)

    for key, a in independent.items():
        line = f"- {a['name']}: 누적 점수 {a['score']:.1f}"
        if a["family"] == "Taste":
            taste_lines.append(line)
        else:
            personality_lines.append(line)

    return taste_lines, personality_lines


def build_recommend_prompt(taste_lines, personality_lines):
    return f"""너는 캐주얼한 자기발견 앱 "탐미"의 추천 문구 작성자야.
아래는 한 사용자가 지금까지 답한 문항으로 계산된 데이터야.

취향 데이터 (순수 선호, 심리 특성 아님):
{chr(10).join(taste_lines) if taste_lines else "(아직 데이터 부족)"}

성향 데이터 (성격 특성, 참고용):
{chr(10).join(personality_lines) if personality_lines else "(아직 데이터 부족)"}

이 데이터를 바탕으로 2~3문장짜리 개인화된 추천 문구를 만들어줘. 규칙:
- 취향 데이터는 "~좋아하실 것 같아요" 식의 추천으로, 성향 데이터는 "~한 편이에요" 식의 서술로 구분해서 자연스럽게 녹여낼 것
- 실제 메뉴/장소/활동 같은 구체적인 추천을 1개 이상 포함할 것 (막연한 조언 금지)
- 단정하지 않기, 우열 표현 금지, 임상 용어 금지
- 마지막 줄에 "이건 참고용 취향/성향 리포트예요"라는 문구 추가
"""


def recommend(user_id):
    bipolar, independent = fetch_user_scores(user_id)
    if not bipolar and not independent:
        print(f"user_id={user_id}에 대한 응답 데이터가 없어요. 아직 문항에 답한 기록이 없는 것 같아요.")
        return

    taste_lines, personality_lines = summarize_for_prompt(bipolar, independent)
    prompt = build_recommend_prompt(taste_lines, personality_lines)

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])
    resp = client.messages.create(
        model="claude-sonnet-4-6",
        max_tokens=500,
        messages=[{"role": "user", "content": prompt}],
    )
    print(resp.content[0].text)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True, help="추천을 생성할 사용자 ID")
    args = parser.parse_args()
    recommend(args.user_id)