"""
load_bank_to_db.py

scripts/question_bank.json에 쌓인 문항들을 Supabase(Postgres) DB에 밀어넣는다.
questions 테이블에 문항을 넣고, links 배열을 question_trait_links 테이블에 넣는다.
trait_key -> trait_id 매핑은 DB의 traits 테이블에서 조회한다 (schema.sql + seed_traits.sql이
이미 실행되어 traits 테이블이 채워져 있어야 함).

실행 예:
    python load_bank_to_db.py

필요 환경변수 (backend/.env):
    DATABASE_URL=postgresql://postgres:비밀번호@db.xxxxx.supabase.co:5432/postgres
    (Supabase 대시보드 -> Project Settings -> Database -> Connection string에서 복사)
"""

import json
import os
from pathlib import Path

import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
BANK_PATH = BASE_DIR / "question_bank.json"

load_dotenv(BASE_DIR.parent / ".env")


def load_bank():
    if not BANK_PATH.exists():
        raise SystemExit(f"{BANK_PATH} 이(가) 없어요. generate_questions.py를 먼저 실행해서 문항을 만들어주세요.")
    return json.loads(BANK_PATH.read_text(encoding="utf-8"))


def get_trait_id_map(cur):
    cur.execute("SELECT id, key FROM traits;")
    return {key: trait_id for trait_id, key in cur.fetchall()}


def load_to_db():
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        raise SystemExit("DATABASE_URL이 .env에 없어요. Supabase Connection string을 backend/.env에 추가해주세요.")

    bank = load_bank()
    print(f"question_bank.json에서 {len(bank)}개 문항을 읽었어요.")

    conn = psycopg2.connect(database_url)
    cur = conn.cursor()

    trait_id_map = get_trait_id_map(cur)
    if not trait_id_map:
        raise SystemExit("traits 테이블이 비어있어요. seed_traits.sql을 Supabase SQL Editor에서 먼저 실행해주세요.")

    inserted_questions = 0
    inserted_links = 0
    skipped = 0

    for q in bank:
        missing_traits = [
            link["trait_key"] for link in q.get("links", []) if link["trait_key"] not in trait_id_map
        ]
        if missing_traits:
            print(f"  건너뜀 (DB에 없는 trait_key: {missing_traits}): {q['options'][0]['text'][:20]}...")
            skipped += 1
            continue

        cur.execute(
            """
            INSERT INTO questions (format_type, prompt_text, options, category_hint)
            VALUES (%s, %s, %s, %s)
            RETURNING id;
            """,
            (
                q["format_type"],
                q.get("prompt_text"),
                json.dumps(q["options"], ensure_ascii=False),
                q.get("category_hint"),
            ),
        )
        question_id = cur.fetchone()[0]
        inserted_questions += 1

        for link in q.get("links", []):
            cur.execute(
                """
                INSERT INTO question_trait_links (question_id, option_key, trait_id, pole, weight)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (question_id, option_key, trait_id) DO NOTHING;
                """,
                (
                    question_id,
                    link["option_key"],
                    trait_id_map[link["trait_key"]],
                    link.get("pole"),
                    link["weight"],
                ),
            )
            inserted_links += 1

    conn.commit()
    cur.close()
    conn.close()

    print(f"완료: 문항 {inserted_questions}개, 연결 {inserted_links}개 삽입 (건너뜀 {skipped}개)")


if __name__ == "__main__":
    load_to_db()