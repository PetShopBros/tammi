"""
calculate_mbti.py

trait_score_history에 저장된 최신 트레잇 점수를 조합해서
"타미 MBTI 유형 유추" 4글자 유형과 축별 confidence를 계산한다.

주의: 이건 정식 MBTI(Myers-Briggs Type Indicator) 검사가 아니라
tammi 자체 트레잇 데이터로 추정한 "타미 MBTI 유형 유추"이며,
원본 검사 문항/채점 방식과는 무관하다. (docs/interpretation_reference.md 참고)

로컬 테스트:
    python calculate_mbti.py --user-id <user_id>
"""

import argparse
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
import os

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR.parent / ".env")

# J/P 조합 가중치 (conscientiousness가 정식 Big Five 축이라 더 높은 비중)
CONSCIENTIOUSNESS_WEIGHT = 0.6
DECISION_STYLE_WEIGHT = 0.4


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def load_trait_ids(cur):
    cur.execute("""
        SELECT key, id FROM traits
        WHERE key IN ('bigfive_extraversion', 'bigfive_conscientiousness',
                      'decision_style', 'judgment_basis', 'info_style');
    """)
    return {key: tid for key, tid in cur.fetchall()}


def load_latest_scores(cur, user_id, trait_ids):
    """trait_id별 가장 최근 snapshot_date의 score, confidence를 가져온다."""
    placeholders = ",".join(["%s"] * len(trait_ids))
    cur.execute(f"""
        SELECT DISTINCT ON (trait_id) trait_id, score, confidence
        FROM trait_score_history
        WHERE user_id = %s AND trait_id IN ({placeholders})
        ORDER BY trait_id, snapshot_date DESC;
    """, (user_id, *trait_ids))
    return {tid: {"score": float(score), "confidence": float(conf)} for tid, score, conf in cur.fetchall()}


def calculate_mbti(user_id):
    conn = get_conn()
    cur = conn.cursor()

    key_to_id = load_trait_ids(cur)
    trait_ids = list(key_to_id.values())
    scores = load_latest_scores(cur, user_id, trait_ids)

    cur.close()
    conn.close()

    missing = [k for k in key_to_id if key_to_id[k] not in scores]
    if missing:
        print(f"경고: 아직 응답 데이터 없는 트레잇 있음: {missing}")

    def get(key, default_score=50.0, default_conf=0.0):
        tid = key_to_id.get(key)
        if tid is None or tid not in scores:
            return default_score, default_conf
        s = scores[tid]
        return s["score"], s["confidence"]

    ei_score, ei_conf = get("bigfive_extraversion")
    ns_score, ns_conf = get("info_style")
    tf_score, tf_conf = get("judgment_basis")
    consc_score, consc_conf = get("bigfive_conscientiousness")
    dec_score, dec_conf = get("decision_style")

    # decision_style은 pole_left=quick(즉흥)이 P방향이라 뒤집어서
    # conscientiousness(pole_left=planner=J)와 같은 방향으로 맞춘다.
    jp_score = (CONSCIENTIOUSNESS_WEIGHT * consc_score
                + DECISION_STYLE_WEIGHT * (100 - dec_score))
    jp_conf = min(consc_conf, dec_conf)

    axes = {
        "E/I": {"score": ei_score, "confidence": ei_conf, "left": "E", "right": "I"},
        "N/S": {"score": ns_score, "confidence": ns_conf, "left": "N", "right": "S"},
        "T/F": {"score": tf_score, "confidence": tf_conf, "left": "T", "right": "F"},
        "J/P": {"score": jp_score, "confidence": jp_conf, "left": "J", "right": "P"},
    }

    mbti_type = ""
    axis_details = []
    for axis_name, a in axes.items():
        letter = a["left"] if a["score"] >= 50 else a["right"]
        mbti_type += letter
        axis_details.append({
            "axis": axis_name,
            "letter": letter,
            "score": round(a["score"], 1),
            "confidence": round(a["confidence"], 3),
        })

    overall_confidence = min(a["confidence"] for a in axes.values())

    return {
        "user_id": user_id,
        "mbti_type": mbti_type,
        "overall_confidence": round(overall_confidence, 3),
        "axes": axis_details,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", required=True, help="결과를 계산할 user_id")
    args = parser.parse_args()

    result = calculate_mbti(args.user_id)
    print(f"\n타미 MBTI 유형 유추: {result['mbti_type']}")
    print(f"전체 confidence: {result['overall_confidence']}")
    print("\n축별 상세:")
    for a in result["axes"]:
        conf_note = " (데이터 적음, 참고용)" if a["confidence"] < 0.3 else ""
        print(f"  {a['axis']}: {a['letter']} (score={a['score']}, confidence={a['confidence']}){conf_note}")