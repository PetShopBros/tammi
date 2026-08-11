"""
test_deepseek.py

DeepSeek로 문항 생성 품질을 테스트하는 스크립트.
기존 generate_questions.py의 build_prompt()를 그대로 재사용해서
"같은 프롬프트, 다른 모델" 비교가 가능하게 한다.
question_bank.json에는 저장하지 않고 화면에만 출력한다 (순수 비교용).

실행:
    python test_deepseek.py --primary bigfive_openness --count 5
"""
import argparse
import json
import os
import re
from pathlib import Path

from dotenv import load_dotenv
from openai import OpenAI

from generate_questions import load_traits, load_json, BANK_PATH, flatten_texts, build_prompt

load_dotenv(Path(__file__).resolve().parent.parent / ".env")

client = OpenAI(
    api_key=os.environ["DEEPSEEK_API_KEY"],
    base_url="https://api.deepseek.com",
)


def test_generate(primary_key, count=5, format_type="mixed"):
    traits, by_key = load_traits()
    primary_trait = by_key[primary_key]

    bank = load_json(BANK_PATH, [])
    existing_texts = []
    for q in bank:
        existing_texts.extend(flatten_texts(q))

    prompt = build_prompt(primary_trait, traits, existing_texts, count, format_type)

    resp = client.chat.completions.create(
        model="deepseek-v4-flash",
        max_tokens=4000,
        messages=[{"role": "user", "content": prompt}],
        extra_body={"thinking": {"type": "disabled"}},
    )

    # 디버그: 응답 구조 전체를 먼저 확인
    print("=== 응답 객체 디버그 ===")
    print(f"finish_reason: {resp.choices[0].finish_reason}")
    print(f"usage: {resp.usage}")
    message = resp.choices[0].message
    print(f"content: {message.content!r}")
    if hasattr(message, "reasoning_content"):
        print(f"reasoning_content 길이: {len(message.reasoning_content or '')}")
    print()

    raw = (message.content or "").strip()
    raw = re.sub(r"^```json|```$", "", raw, flags=re.MULTILINE).strip()

    print("=== DeepSeek 원본 응답 ===")
    print(raw)
    print()

    try:
        candidates = json.loads(raw)
        print(f"=== 파싱 성공: {len(candidates)}개 문항 ===")
        for i, c in enumerate(candidates, 1):
            print(f"\n[{i}] {c.get('prompt_text') or '(prompt_text 없음)'}")
            for opt in c.get("options", []):
                print(f"   - {opt['text']}")
    except json.JSONDecodeError as e:
        print(f"=== 파싱 실패: {e} ===")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", default="bigfive_openness")
    parser.add_argument("--count", type=int, default=5)
    parser.add_argument("--format", default="mixed")
    args = parser.parse_args()
    test_generate(args.primary, args.count, args.format)