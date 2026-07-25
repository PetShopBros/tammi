"""
scoring.py

사용자의 응답(responses)과 문항-특성 연결(question_trait_links)을 받아서
각 특성(trait)별 점수를 계산한다.

- bipolar 특성: -1.0 ~ +1.0 사이 값을 pole_left/pole_right 비율(%)로 환산
- independent 특성 (RIASEC, 애정표현방식 등): 누적 가중치 합만 계산
  (다른 유형과 경쟁하지 않고 각자 독립적으로 쌓임)

실제 서비스에서는 이 로직을 question_bank.json + traits_seed.json을 읽어와서
question_id -> links 매핑을 만든 뒤, DB의 responses 테이블과 조인해서 쓰면 된다.
"""

from collections import defaultdict


def compute_scores(responses, question_links_by_id, traits_by_id):
    """
    responses: [{"question_id": int, "chosen_option": "a"}, ...]
    question_links_by_id: {question_id: [{"trait_id":..,"option_key":..,"pole":..,"weight":..}, ...]}
    traits_by_id: {trait_id: {"type":"bipolar"|"independent", "pole_left":.., "pole_right":..,
                                "pole_left_label":.., "pole_right_label":.., "name":..}}

    반환:
    {
      trait_id: {
        "name": str,
        "type": "bipolar" | "independent",
        # bipolar인 경우:
        "pct_left": int, "pct_right": int, "left_label": str, "right_label": str,
        # independent인 경우:
        "raw_score": float,
        "answered_weight": float
      }
    }
    """
    bipolar_agg = defaultdict(lambda: {"score": 0.0, "weight_sum": 0.0})
    independent_agg = defaultdict(lambda: {"score": 0.0, "weight_sum": 0.0})

    for r in responses:
        qid = r["question_id"]
        chosen = r["chosen_option"]
        for link in question_links_by_id.get(qid, []):
            if link["option_key"] != chosen:
                continue
            trait = traits_by_id[link["trait_id"]]
            weight = link["weight"]
            if trait["type"] == "bipolar":
                direction = 1 if link["pole"] == trait["pole_left"] else -1
                agg = bipolar_agg[link["trait_id"]]
                agg["score"] += direction * weight
                agg["weight_sum"] += weight
            else:
                agg = independent_agg[link["trait_id"]]
                agg["score"] += weight
                agg["weight_sum"] += weight

    results = {}

    for trait_id, agg in bipolar_agg.items():
        if agg["weight_sum"] == 0:
            continue
        trait = traits_by_id[trait_id]
        normalized = agg["score"] / agg["weight_sum"]          # -1..1
        pct_left = round((normalized + 1) / 2 * 100)
        results[trait_id] = {
            "name": trait["name"],
            "type": "bipolar",
            "pct_left": pct_left,
            "pct_right": 100 - pct_left,
            "left_label": trait["pole_left_label"],
            "right_label": trait["pole_right_label"],
        }

    for trait_id, agg in independent_agg.items():
        trait = traits_by_id[trait_id]
        results[trait_id] = {
            "name": trait["name"],
            "type": "independent",
            "raw_score": round(agg["score"], 2),
            "answered_weight": round(agg["weight_sum"], 2),
        }

    return results


if __name__ == "__main__":
    # 사용 예시 (더미 데이터)
    traits_by_id = {
        1: {"type": "bipolar", "pole_left": "stable", "pole_right": "adventure",
            "pole_left_label": "안정형", "pole_right_label": "모험형", "name": "개방성"},
        2: {"type": "independent", "name": "현장형(R)"},
    }
    question_links_by_id = {
        101: [
            {"trait_id": 1, "option_key": "a", "pole": "stable", "weight": 0.9},
            {"trait_id": 1, "option_key": "b", "pole": "adventure", "weight": 0.9},
        ],
        102: [
            {"trait_id": 2, "option_key": "a", "pole": None, "weight": 0.6},
        ],
    }
    responses = [
        {"question_id": 101, "chosen_option": "b"},
        {"question_id": 102, "chosen_option": "a"},
    ]
    print(compute_scores(responses, question_links_by_id, traits_by_id))
