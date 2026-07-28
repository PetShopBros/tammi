"""
dump_love_language_questions.py
기존 love_language(구버전, 단일축) 문항들을 UTF-8 텍스트 파일로 덤프한다.
"""

from pathlib import Path
import os

import psycopg2
from dotenv import load_dotenv

BASE_DIR = Path(__file__).parent
load_dotenv(BASE_DIR.parent / ".env")

OUT_PATH = BASE_DIR / "love_language_questions_dump.txt"


def run():
    conn = psycopg2.connect(os.environ["DATABASE_URL"])
    cur = conn.cursor()
    cur.execute("""
        SELECT q.id, q.format_type, q.prompt_text, q.options, l.option_key, l.weight
        FROM questions q
        JOIN question_trait_links l ON l.question_id = q.id
        JOIN traits t ON t.id = l.trait_id
        WHERE t.key = 'love_language'
        ORDER BY q.id, l.option_key;
    """)
    rows = cur.fetchall()
    cur.close()
    conn.close()

    with open(OUT_PATH, "w", encoding="utf-8") as f:
        current_qid = None
        for qid, format_type, prompt_text, options, option_key, weight in rows:
            if qid != current_qid:
                f.write(f"\n--- 문항 {qid} ({format_type}) ---\n")
                f.write(f"질문: {prompt_text}\n")
                f.write(f"옵션: {options}\n")
                current_qid = qid
            f.write(f"  링크: option={option_key}, weight={weight}\n")

    print(f"완료: {OUT_PATH} ({len(rows)}개 링크 행)")


if __name__ == "__main__":
    run()
