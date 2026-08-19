/**
 * blobRenderer.js
 *
 * tammi 결과 화면의 3레이어 블롭 SVG path를 생성하는 순수 함수 모음.
 * 완전히 결정론적 (Math.random, Date 등 시간 기반 요소 전혀 사용 안 함) ->
 * 동일한 traits 객체를 넣으면 항상 동일한 path가 나온다.
 *
 * 레이어 구조 (2026-07 합의):
 *   Layer 1 "surface" (형태, 가장 넓게 드러남) = Big Five 5개 그대로
 *   Layer 2 "middle"  (행동 패턴)             = RIASEC 우세/2위 유형 점수(2개)
 *                                                + decision_style + risk_taking + conflict_style
 *   Layer 3 "deep"    (덜 자각되는 패턴)      = locus_of_control + love_language 우세유형
 *                                                + time_perspective + spending_style
 *                                                + learning_motivation
 *
 * 각 값은 0~100 스케일. RIASEC/love_language처럼 'independent' 타입 트레잇은
 * family 내 상대 비중(%)으로 정규화된 값을 그대로 넣으면 됨
 * (backend/scripts/snapshot_trait_scores.py의 normalize_independent 결과와 동일 스케일).
 *
 * 브라우저(HTML 프로토타입)와 Next.js 양쪽에서 그대로 쓸 수 있도록 프레임워크 의존성 없음.
 * (Next.js로 옮길 때는 이 파일 내용을 .ts로 옮기고 타입만 붙이면 됨)
 */

const LAYER_CONFIG = {
  surface: { baseR: 46, variance: 38, offX: 0, offY: 0, rMul: 1.4 },
  middle:  { baseR: 34, variance: 34, offX: 7, offY: 5, rMul: 1.0 },
  deep:    { baseR: 25, variance: 30, offX: -5, offY: -7, rMul: 0.65 },
};

const CENTER = { x: 110, y: 110 };

/**
 * 5개 값(0~100)으로 닫힌 곡선(Catmull-Rom) SVG path의 점 배열을 만든다.
 * 노이즈/랜덤 요소 없음 - 순수하게 값 -> 좌표 변환만 함.
 */
function fivePointsToPath(values, cfg) {
  if (values.length !== 5) {
    throw new Error(`fivePointsToPath: 정확히 5개 값이 필요합니다 (받은 개수: ${values.length})`);
  }
  const n = 5;
  const points = values.map((v, i) => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const r = (cfg.baseR + (clamp01to100(v) / 100) * cfg.variance) * cfg.rMul;
    return [
      CENTER.x + cfg.offX + r * Math.cos(angle),
      CENTER.y + cfg.offY + r * Math.sin(angle),
    ];
  });
  return catmullRomClosedPath(points, 0.6);
}

function clamp01to100(v) {
  return Math.max(0, Math.min(100, v));
}

/**
 * d3 없이 순수 JS로 구현한 Catmull-Rom -> Bezier 닫힌 곡선 path 생성.
 * (d3.curveCatmullRomClosed와 동일한 결과를 목표로 함, alpha는 0~1)
 */
function catmullRomClosedPath(points, alpha) {
  const p = points;
  const n = p.length;
  const getPoint = (i) => p[(i + n) % n];

  let d = `M ${p[0][0]},${p[0][1]} `;
  for (let i = 0; i < n; i++) {
    const p0 = getPoint(i - 1);
    const p1 = getPoint(i);
    const p2 = getPoint(i + 1);
    const p3 = getPoint(i + 2);

    const c1x = p1[0] + (p2[0] - p0[0]) * (alpha / 6);
    const c1y = p1[1] + (p2[1] - p0[1]) * (alpha / 6);
    const c2x = p2[0] - (p3[0] - p1[0]) * (alpha / 6);
    const c2y = p2[1] - (p3[1] - p1[1]) * (alpha / 6);

    d += `C ${c1x},${c1y} ${c2x},${c2y} ${p2[0]},${p2[1]} `;
  }
  return d + "Z";
}

/**
 * @param {Object} traits
 * @param {Object} traits.bigFive - { openness, conscientiousness, extraversion, agreeableness, stability } 각 0~100
 * @param {Object} traits.middle - { riasecTop1, riasecTop2, decisionStyle, riskTaking, conflictStyle } 각 0~100
 * @param {Object} traits.deep - { locusOfControl, loveLanguageTop, timePerspective, spendingStyle, learningMotivation } 각 0~100
 * @returns {{ surface: string, middle: string, deep: string }} 레이어별 SVG path d 속성값
 */
function generateBlobLayers(traits) {
  const surfaceValues = [
    traits.bigFive.openness,
    traits.bigFive.conscientiousness,
    traits.bigFive.extraversion,
    traits.bigFive.agreeableness,
    traits.bigFive.stability,
  ];
  const middleValues = [
    traits.middle.riasecTop1,
    traits.middle.riasecTop2,
    traits.middle.decisionStyle,
    traits.middle.riskTaking,
    traits.middle.conflictStyle,
  ];
  const deepValues = [
    traits.deep.locusOfControl,
    traits.deep.loveLanguageTop,
    traits.deep.timePerspective,
    traits.deep.spendingStyle,
    traits.deep.learningMotivation,
  ];

  return {
    surface: fivePointsToPath(surfaceValues, LAYER_CONFIG.surface),
    middle: fivePointsToPath(middleValues, LAYER_CONFIG.middle),
    deep: fivePointsToPath(deepValues, LAYER_CONFIG.deep),
  };
}

// 브라우저(<script> 태그)와 Node(require) 양쪽에서 쓸 수 있게 노출
if (typeof module !== "undefined" && module.exports) {
  module.exports = { generateBlobLayers, fivePointsToPath };
} else {
  window.tammiBlobRenderer = { generateBlobLayers, fivePointsToPath };
}