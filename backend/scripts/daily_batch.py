"""
daily_batch.py

traits_seed.json에 있는 모든 특성을 순회하면서 각각 소량씩 문항을 생성하고,
끝나면 한 번에 DB로 로드한다. GitHub Actions 같은 자동 스케줄러에서 이 파일
하나만 실행하면 "다양한 카테고리에 걸쳐 골고루" 문항이 계속 쌓인다.

로컬에서 직접 테스트:
    python daily_batch.py --per-trait 3

GitHub Actions에서는 workflow yaml이 이 스크립트를 그대로 호출한다.
"""

import argparse

from generate_questions import generate, load_traits
from load_bank_to_db import load_to_db


def run_daily_batch(per_trait=3):
    traits, _ = load_traits()
    print(f"총 {len(traits)}개 특성에 대해 각 {per_trait}개씩 생성을 시작해요.")

    for t in traits:
        try:
            generate(t["key"], per_trait, format_type="mixed")
        except SystemExit as e:
            print(f"  [{t['key']}] 생성 실패, 건너뜀: {e}")
        except Exception as e:
            print(f"  [{t['key']}] 예상치 못한 오류, 건너뜀: {e}")

    print("전체 생성 완료, DB로 로드할게요.")
    load_to_db()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--per-trait", type=int, default=3, help="특성 하나당 생성할 문항 수")
    args = parser.parse_args()
    run_daily_batch(args.per_trait)