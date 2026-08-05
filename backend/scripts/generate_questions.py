"""
generate_questions.py

카테고리(trait) 레지스트리를 참고해서 Claude API로 캐주얼한 자기발견 문항을
생성하고, 각 문항이 어느 특성(trait)들에 얼마만큼의 가중치로 연결되는지까지
함께 뽑아낸다. 중복 문항은 자동으로 걸러내고 question_bank.json에 누적 저장한다.

핵심 아이디어: 문항 하나 = 카테고리 하나가 아니라, 문항 하나가 여러 특성에
동시에 걸칠 수 있다 (요인적재). 그래서 출력 스키마 자체에 links 배열을 둔다.

실행 예:
    export ANTHROPIC_API_KEY=sk-...
    python generate_questions.py --count 50 --primary bigfive_openness
    python generate_questions.py --count 20 --primary conflict_style --format four_choice

스케줄링 (매일 자동 실행하려면 서버/클라우드에 등록):
    # crontab -e
    0 3 * * * cd /path/to/project && \
        python generate_questions.py --count 100 --primary bigfive_openness >> log.txt 2>&1

    또는 GitHub Actions의 schedule: cron 트리거, 혹은 AWS Lambda + EventBridge,
    Vercel Cron 등 서버리스 스케줄러에 이 스크립트를 얹어도 된다.
    Claude.ai 아티팩트 자체는 브라우저에서만 동작하기 때문에 이 자동 실행은
    반드시 사용자가 소유한 서버/클라우드 환경에서 돌려야 한다.

필요 환경변수: ANTHROPIC_API_KEY
"""

import argparse
import datetime
import difflib
import json
import os
import re
from pathlib import Path

import anthropic
from dotenv import load_dotenv

# backend/.env 파일을 자동으로 읽어서 환경변수로 등록한다.
# (터미널마다 매번 export/$env: 로 키를 다시 칠 필요 없이,
#  backend/.env 안에 ANTHROPIC_API_KEY=sk-ant-... 한 줄만 적어두면 됨)
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

BASE_DIR = Path(__file__).parent
BANK_PATH = BASE_DIR / "question_bank.json"
TRAITS_PATH = BASE_DIR / "traits_seed.json"

# 이 축들은 절대 만들지 않는다 (임상/진단성 스크리닝 금지 안전장치)
FORBIDDEN_KEYWORDS = [
    "우울", "불안", "자살", "자해", "폭식", "거식", "공황",
    "depression", "anxiety", "suicide", "self-harm", "panic disorder",
]


def load_json(path, default):
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    return default


def save_bank(bank):
    BANK_PATH.write_text(json.dumps(bank, ensure_ascii=False, indent=2), encoding="utf-8")


def load_traits():
    traits = load_json(TRAITS_PATH, [])
    by_key = {t["key"]: t for t in traits}
    return traits, by_key


def similarity(a, b):
    return difflib.SequenceMatcher(None, a, b).ratio()


def is_duplicate(new_text, existing_texts, threshold=0.72):
    return any(similarity(new_text, t) >= threshold for t in existing_texts)


def contains_forbidden(text):
    return any(kw in text for kw in FORBIDDEN_KEYWORDS)


def build_trait_menu(traits):
    lines = []
    for t in traits:
        if t["type"] == "bipolar":
            lines.append(
                f'- {t["key"]} ({t["name"]}): pole 값은 반드시 "{t["pole_left"]}"(={t["pole_left_label"]}) '
                f'또는 "{t["pole_right"]}"(={t["pole_right_label"]}) 둘 중 하나의 영문 key로만 쓸 것. 한글 라벨을 pole에 넣지 말 것.'
            )
        else:
            lines.append(f'- {t["key"]} ({t["name"]}): 독립형 특성, pole은 null로 두고 weight만 부여')
    return "\n".join(lines)


def _example(primary_trait, extra=""):
    """각 포맷 예시에서 공통으로 쓰는 주 특성 표기를 만들어준다."""
    if primary_trait["type"] == "bipolar":
        return primary_trait["pole_left_label"], primary_trait["pole_right_label"]
    return primary_trait["name"], None


FORMAT_GUIDES = {
    "ab_dual": {
        "desc": "둘 중 하나를 고르는 가장 기본적인 형식. 두 문장이 서로 배타적이어야 함.",
        "example": lambda pt: {
            "format_type": "ab_dual",
            "prompt_text": None,
            "options": [{"key": "a", "text": "늘 가던 맛집 가기"}, {"key": "b", "text": "처음 보는 음식 도전하기"}],
            "links": [
                {"trait_key": pt["key"], "option_key": "a", "pole": pt.get("pole_left"), "weight": 0.9},
                {"trait_key": pt["key"], "option_key": "b", "pole": pt.get("pole_right"), "weight": 0.9},
            ],
        },
    },
    "four_choice": {
        "desc": (
            "같은 축 안에서 정도(강도) 차이를 4단계로 표현하는 형식. "
            "옵션 4개가 한쪽 극에서 반대쪽 극으로 점점 이동하는 그라데이션이어야 하고, "
            "각 옵션의 weight를 강도에 맞게 다르게 준다 (예: 1.0 / 0.4 / 0.4 / 1.0 처럼 양끝은 강하게, 중간은 약하게)."
        ),
        "example": lambda pt: {
            "format_type": "four_choice",
            "prompt_text": "약속 시간에 나는 보통?",
            "options": [
                {"key": "a", "text": "10분 일찍 도착"},
                {"key": "b", "text": "딱 맞춰 도착"},
                {"key": "c", "text": "5분 정도 늦음"},
                {"key": "d", "text": "늦었는데 안 미안함"},
            ],
            "links": [
                {"trait_key": pt["key"], "option_key": "a", "pole": pt.get("pole_left"), "weight": 1.0},
                {"trait_key": pt["key"], "option_key": "b", "pole": pt.get("pole_left"), "weight": 0.4},
                {"trait_key": pt["key"], "option_key": "c", "pole": pt.get("pole_right"), "weight": 0.4},
                {"trait_key": pt["key"], "option_key": "d", "pole": pt.get("pole_right"), "weight": 1.0},
            ],
        },
    },
    "metaphor": {
        "desc": (
            "자신이나 자신의 하루/기분을 무언가에 빗대어 고르는 형식 (날씨, 악기, 신호등 등). "
            "보기는 3~4개, 서로 다른 특성이나 같은 특성의 다른 방향에 연결될 수 있음."
        ),
        "example": lambda pt: {
            "format_type": "metaphor",
            "prompt_text": "내가 악기라면?",
            "options": [
                {"key": "a", "text": "드럼 (리듬을 주도함)"},
                {"key": "b", "text": "피아노 (정교하고 섬세함)"},
                {"key": "c", "text": "기타 (자유로운 편)"},
                {"key": "d", "text": "첼로 (묵직하고 차분함)"},
            ],
            "links": [
                {"trait_key": pt["key"], "option_key": "a", "pole": pt.get("pole_left"), "weight": 0.6},
                {"trait_key": pt["key"], "option_key": "d", "pole": pt.get("pole_right"), "weight": 0.6},
            ],
        },
    },
    "object_choice": {
        "desc": (
            "구체적인 실물/장소/브랜드성 대상 중에서 고르는 형식 (여행지, 선물, 메뉴 등). "
            "보기는 3~4개, 각 보기가 서로 다른 특성이나 독립형 특성(예: 애정표현방식)의 하위 유형에 연결될 수 있음."
        ),
        "example": lambda pt: {
            "format_type": "object_choice",
            "prompt_text": "선물 받는다면 더 끌리는 건?",
            "options": [
                {"key": "a", "text": "손편지"},
                {"key": "b", "text": "함께 보내는 시간"},
                {"key": "c", "text": "실용적인 물건"},
                {"key": "d", "text": "깜짝 이벤트"},
            ],
            "links": [
                {"trait_key": pt["key"], "option_key": "b", "pole": pt.get("pole_left"), "weight": 0.5},
                {"trait_key": pt["key"], "option_key": "c", "pole": pt.get("pole_right"), "weight": 0.3},
            ],
        },
    },
}


def build_prompt(primary_trait, traits, existing_examples, count, format_type):
    trait_menu = build_trait_menu(traits)

    if format_type == "mixed":
        format_block = "\n\n".join(
            f'### {key}\n{guide["desc"]}\n예시:\n{json.dumps(guide["example"](primary_trait), ensure_ascii=False, indent=2)}'
            for key, guide in FORMAT_GUIDES.items()
        )
        format_instruction = (
            "아래 4가지 형식을 자유롭게 섞어서 만들어 (한 형식에 쏠리지 않게 고르게 섞을 것):\n\n" + format_block
        )
    else:
        guide = FORMAT_GUIDES[format_type]
        format_instruction = (
            f"다음 형식(`{format_type}`)으로만 만들어:\n{guide['desc']}\n예시:\n"
            f"{json.dumps(guide['example'](primary_trait), ensure_ascii=False, indent=2)}"
        )

    return f"""너는 캐주얼한 자기발견 앱의 문항 설계자야. 아래 형식에 맞는 문항을 {count}개 만들어줘.
결과는 JSON 배열만 출력하고, 다른 설명이나 코드블록 표시는 하지 마.

주 특성(primary trait): {primary_trait['key']} ({primary_trait['name']})
{"양극: " + primary_trait['pole_left_label'] + " vs " + primary_trait['pole_right_label'] if primary_trait['type']=='bipolar' else "독립형 특성"}

문항은 반드시 다음 조건을 지켜야 해:
- 아주 캐주얼하고 일상적인 소재 (여행, 음식, 친구, 루틴, 물건, 상황 비유 등)
- 의학적 진단, 우울/불안/자해/식이장애 등 임상 선별 뉘앙스는 절대 포함하지 않음
- 각 문항은 주 특성(primary trait)에 강한 가중치(0.7~1.0)로 연결되어야 하고,
  추가로 아래 특성 목록 중 자연스럽게 걸치는 게 있으면 0.2~0.5 가중치로 같이 표시해 (없으면 생략 가능)
- ab_dual이 아닌 형식은 options가 3~4개일 수 있고, 그만큼 links도 옵션별로 늘어남
- prompt_text는 ab_dual에서는 보통 null, 나머지 형식에서는 짧은 질문 문구를 채움

{format_instruction}

사용 가능한 특성 목록:
{trait_menu}

이미 있는 문항과 의미가 겹치면 안 됨 (아래는 최근 문항 일부):
{json.dumps(existing_examples[-15:], ensure_ascii=False)}

출력은 위 예시들과 같은 구조를 가진 객체들의 JSON 배열만.
"""


def flatten_texts(question):
    texts = [opt["text"] for opt in question["options"]]
    if question.get("prompt_text"):
        texts.append(question["prompt_text"])
    return texts


def load_existing_texts_from_db():
    """DB에 이미 저장된 문항 텍스트 전체를 가져온다.
    로컬 question_bank.json이 초기화되는 환경(GitHub Actions 등)에서도
    과거 전체 기록과 비교해서 중복을 막기 위함."""
    database_url = os.environ.get("DATABASE_URL")
    if not database_url:
        return []
    try:
        import psycopg2
        conn = psycopg2.connect(database_url)
        cur = conn.cursor()
        cur.execute("SELECT prompt_text, options FROM questions;")
        texts = []
        for prompt_text, options in cur.fetchall():
            if prompt_text:
                texts.append(prompt_text)
            for opt in options:
                texts.append(opt["text"])
        cur.close()
        conn.close()
        return texts
    except Exception as e:
        print(f"  (DB 기존 문항 조회 실패, 로컬 데이터만 사용: {e})", flush=True)
        return []


def generate(primary_key, count, format_type="mixed", max_attempts=10):
    traits, by_key = load_traits()
    if primary_key not in by_key:
        raise SystemExit(f"알 수 없는 trait key: {primary_key} (traits_seed.json 확인)")
    if format_type != "mixed" and format_type not in FORMAT_GUIDES:
        raise SystemExit(f"알 수 없는 format: {format_type} (선택: {', '.join(FORMAT_GUIDES)}, mixed)")
    primary_trait = by_key[primary_key]

    bank = load_json(BANK_PATH, [])
    existing_texts = []
    for q in bank:
        existing_texts.extend(flatten_texts(q))
    existing_texts.extend(load_existing_texts_from_db())

    client = anthropic.Anthropic(api_key=os.environ["ANTHROPIC_API_KEY"])

    accepted = []
    attempts = 0
    while len(accepted) < count and attempts < max_attempts:
        attempts += 1
        need = count - len(accepted)
        # 한 번의 API 콜에서 너무 많은 문항을 요청하면 응답이 max_tokens를 넘어
        # JSON이 중간에 잘리는 문제가 있어, 한 콜당 요청량을 최대 10개로 제한한다.
        batch_size = min(need + 5, 10)
        print(f"[{attempts}/{max_attempts}] API 요청 중... (이번 배치: {batch_size}개, 남은 목표: {need}개)", flush=True)
        prompt = build_prompt(primary_trait, traits, existing_texts, batch_size, format_type)
        resp = client.messages.create(
            model="claude-sonnet-4-6",
            max_tokens=8000,
            messages=[{"role": "user", "content": prompt}],
        )
        print("  -> 응답 받음, 파싱 중...", flush=True)
        raw = resp.content[0].text.strip()
        raw = re.sub(r"^```json|```$", "", raw, flags=re.MULTILINE).strip()
        try:
            candidates = json.loads(raw)
        except json.JSONDecodeError as e:
            debug_path = BASE_DIR / "last_failed_response.txt"
            debug_path.write_text(raw, encoding="utf-8")
            print(f"  -> JSON 파싱 실패 ({e}). 원본을 {debug_path.name}에 저장함", flush=True)
            continue

        for c in candidates:
            texts = flatten_texts(c)
            if any(contains_forbidden(t) for t in texts):
                continue  # 금지 키워드 감지 시 통째로 스킵
            if any(is_duplicate(t, existing_texts) for t in texts):
                continue
            # trait_key / option_key / pole 유효성 검증
            # (pole이 한글 라벨로 잘못 들어온 경우는 그 링크만 버리고,
            #  주 특성 링크 자체가 깨진 경우엔 문항 전체를 버린다)
            option_keys = {opt["key"] for opt in c.get("options", [])}
            filtered_links = []
            primary_ok = False
            for link in c.get("links", []):
                trait_key = link.get("trait_key")
                if trait_key not in by_key:
                    continue
                if link.get("option_key") not in option_keys:
                    continue
                trait = by_key[trait_key]
                if trait["type"] == "bipolar":
                    if link.get("pole") not in (trait.get("pole_left"), trait.get("pole_right")):
                        continue  # 한글 라벨 등 잘못된 pole 값 -> 이 링크만 버림
                filtered_links.append(link)
                if trait_key == primary_key:
                    primary_ok = True
            if not primary_ok:
                continue  # 주 특성 링크가 없으면 문항 전체 스킵
            c["links"] = filtered_links

            c["id"] = len(bank) + len(accepted) + 1
            c["category_hint"] = primary_trait["name"]
            c["created_at"] = datetime.datetime.now(datetime.UTC).isoformat()
            accepted.append(c)
            existing_texts.extend(texts)
            if len(accepted) >= count:
                break

    bank.extend(accepted)
    save_bank(bank)
    print(f"[{primary_trait['name']}] 신규 {len(accepted)}개 저장 (전체 {len(bank)}개)")
    return accepted


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--primary", required=True, help="traits_seed.json 안의 key (예: bigfive_openness)")
    parser.add_argument("--count", type=int, default=50)
    parser.add_argument(
        "--format",
        default="mixed",
        choices=["mixed", *FORMAT_GUIDES.keys()],
        help="문항 형식 (기본 mixed = 4가지 형식을 섞어서 생성)",
    )
    args = parser.parse_args()
    generate(args.primary, args.count, args.format)