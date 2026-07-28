"""
snapshot_trait_scores.py

모든 유저의 현재 시점 트레잇 점수(0~100)와 confidence를 계산해서
trait_score_history 테이블에 오늘 날짜로 upsert한다.

- bipolar 트레잇: scoring.compute_scores의 pct_left를 그대로 score로 저장
- independent 트레잇 (RIASEC 등): 같은 family 내에서 유형별 raw_score의 상대 비중(%)으로 정규화
  예: RIASEC 6개 raw_score 합이 20이고 예술형(A)이 8이면 -> A의 score = 40
- confidence: answered_weight를 TARGET_WEIGHT로 나눈 값(1.0 상한).
  TARGET_WEIGHT는 잠정치이며, 실제 문항 수/가중치 분포 데이터가 쌓이면 트레잇별로 조정 예정.

daily_batch.py(문항 생성)와는 별개의 배치이며, GitHub Actions에 매일 스케줄로 추가하면 됨.

필요 환경변수 (backend/.env): DATABASE_URL (load_bank_to_db.py와 동일)

로컬 테스트:
    python snapshot_trait_scores.py
    python snapshot_trait_scores.py --user-id <특정 user_id만 갱신>
"""

import argparse
from collections import defaultdict
from pathlib import Path

import psycopg2
from dotenv import load_dotenv
import os

from scoring import compute_scores

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR.parent / ".env")

TARGET_WEIGHT = 5.0  # 잠정치: 이 정도 가중치가 쌓이면 confidence = 1.0으로 취급


def get_conn():
    return psycopg2.connect(os.environ["DATABASE_URL"])


def load_traits(cur):
    cur.execute("""
        SELECT id, family, key, type, name, pole_left, pole_right,
               pole_left_label, pole_right_label
        FROM traits;
    """)
    traits_by_id = {}
    family_by_trait_id = {}
    for row in cur.fetchall():
        tid, family, key, ttype, name, pole_left, pole_right, pl_label, pr_label = row
        traits_by_id[tid] = {
            "type": ttype, "name": name,
            "pole_left": pole_left, "pole_right": pole_right,
            "pole_left_label": pl_label, "pole_right_label": pr_label,
        }
        family_by_trait_id[tid] = family
    return traits_by_id, family_by_trait_id


def load_links(cur):
    cur.execute("""
        SELECT question_id, option_key, trait_id, pole, weight
        FROM question_trait_links;
    """)
    links_by_qid = defaultdict(list)
    for qid, option_key, trait_id, pole, weight in cur.fetchall():
        links_by_qid[qid].append({
            "option_key": option_key, "trait_id": trait_id,
            "pole": pole, "weight": float(weight),
        })
    return links_by_qid


def load_user_ids(cur, only_user_id=None):
    if only_user_id:
        return [only_user_id]
    cur.execute("SELECT DISTINCT user_id FROM responses;")
    return [row[0] for row in cur.fetchall()]


def load_responses_for_user(cur, user_id):
    cur.execute(
        "SELECT question_id, chosen_option FROM responses WHERE user_id = %s;",
        (user_id,),
    )
    return [{"question_id": qid, "chosen_option": opt} for qid, opt in cur.fetchall()]


def normalize_independent(results, family_by_trait_id):
    """같은 family의 independent 트레잇끼리 raw_score 상대 비중(%)으로 정규화."""
    family_totals = defaultdict(float)
    for trait_id, r in results.items():
        if r["type"] == "independent":
            family_totals[family_by_trait_id[trait_id]] += max(r["raw_score"], 0)

    normalized_scores = {}
    for trait_id, r in results.items():
        if r["type"] == "independent":
            total = family_totals[family_by_trait_id[trait_id]]
            score = (max(r["raw_score"], 0) / total * 100) if total > 0 else 0
            normalized_scores[trait_id] = round(score, 2)
    return normalized_scores


def run(only_user_id=None):
    conn = get_conn()
    cur = conn.cursor()

    traits_by_id, family_by_trait_id = load_traits(cur)
    links_by_qid = load_links(cur)
    user_ids = load_user_ids(cur, only_user_id)

    print(f"{len(user_ids)}명의 유저 스냅샷을 계산할게요.")

    upsert_sql = """
        INSERT INTO trait_score_history (user_id, trait_id, snapshot_date, score, confidence, answered_weight)
        VALUES (%s, %s, CURRENT_DATE, %s, %s, %s)
        ON CONFLICT (user_id, trait_id, snapshot_date)
        DO UPDATE SET score = EXCLUDED.score,
                      confidence = EXCLUDED.confidence,
                      answered_weight = EXCLUDED.answered_weight;
    """

    for user_id in user_ids:
        responses = load_responses_for_user(cur, user_id)
        if not responses:
            continue

        results = compute_scores(responses, links_by_qid, traits_by_id)
        independent_scores = normalize_independent(results, family_by_trait_id)

        rows = []
        for trait_id, r in results.items():
            answered_weight = r["answered_weight"] if r["type"] == "bipolar" else r["answered_weight"]
            confidence = min(1.0, answered_weight / TARGET_WEIGHT)
            score = r["pct_left"] if r["type"] == "bipolar" else independent_scores[trait_id]
            rows.append((user_id, trait_id, round(score, 2), round(confidence, 3), answered_weight))

        cur.executemany(upsert_sql, rows)
        conn.commit()
        print(f"  [{user_id}] {len(rows)}개 트레잇 스냅샷 저장")

    cur.close()
    conn.close()
    print("전체 스냅샷 저장 완료.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--user-id", type=str, default=None, help="특정 user_id만 갱신 (테스트용)")
    args = parser.parse_args()
    run(args.user_id)