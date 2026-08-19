'use client';

import { useEffect, useRef, useState } from 'react';
import Nav from '@/components/Nav';
import styles from './Result.module.css';
import { createClient } from '@/lib/supabase/client';
import {
  loadTraitData,
  computeDeltas,
  computeMbti,
  computeUnlockState,
  buildBlobTraits,
  countAnswered,
  SECTION_KEYS,
  UNLOCK_THRESHOLDS,
} from '@/lib/result/compute';
import type { TraitMap, TraitData, Deltas, MbtiResult, UnlockState } from '@/lib/result/types';
import { getAnonUserId } from '@/lib/deck/utils';

// ---- 서브 컴포넌트 ----

function ProgressGauge({ have, need }: { have: number; need: number }) {
  return (
    <div className={styles.progressGauge}>
      {Array.from({ length: need }).map((_, i) => (
        <span
          key={i}
          className={`${styles.progressDot} ${i < have ? styles.progressDotFilled : ''}`}
        />
      ))}
    </div>
  );
}

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return <span className={styles.deltaNone}>-</span>;
  const sign = delta > 0 ? '+' : '';
  const cls = delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : styles.deltaFlat;
  return <span className={cls}>{sign}{delta}</span>;
}

function BarRow({ label, trait }: { label: string; trait: TraitData }) {
  const { score, confidence, history } = trait;
  const lowConf = confidence < 0.3;
  const d: Deltas = computeDeltas(history);

  return (
    <>
      <div className={styles.barRow}>
        <div className={styles.barLabel}>{label}</div>
        <div className={styles.barTrack}>
          <div className={styles.barFill} style={{ width: `${Math.round(score)}%` }} />
        </div>
        <div className={`${styles.barVal} ${lowConf ? styles.barValLowConf : ''}`}>
          {Math.round(score)}{lowConf ? '·낮음' : ''}
        </div>
      </div>
      <div className={styles.deltaRow}>
        <span className={styles.deltaLabel}>지난기록</span>
        <DeltaBadge delta={d.previous?.delta ?? null} />
        <span className={styles.deltaLabel}>주간</span>
        <DeltaBadge delta={d.week?.delta ?? null} />
        <span className={styles.deltaLabel}>월간</span>
        <DeltaBadge delta={d.month?.delta ?? null} />
        <span className={styles.deltaLabel}>연간</span>
        <DeltaBadge delta={d.year?.delta ?? null} />
      </div>
    </>
  );
}

function Gauge({ label, val }: { label: string; val: number }) {
  return (
    <>
      <div className={styles.gaugeLabel}>{label}</div>
      <div className={styles.gaugeTrack}>
        <div className={styles.gaugeDot} style={{ left: `${Math.round(val)}%` }} />
      </div>
    </>
  );
}

function LockableCard({
  title, sub, children, isUnlocked, haveCount, needCount, extraClass,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
  isUnlocked: boolean;
  haveCount: number;
  needCount: number;
  extraClass?: string;
}) {
  return (
    <div className={`${styles.card} ${extraClass || ''} ${isUnlocked ? '' : styles.cardLocked}`}>
      <div className={isUnlocked ? styles.lockedInner : styles.lockedInnerBlurred}>
        <div className={styles.cardTitle}>{title}</div>
        <div className={styles.cardSub}>{sub}</div>
        {children}
      </div>
      {!isUnlocked && (
        <div className={styles.lockOverlay}>
          <ProgressGauge have={haveCount} need={needCount} />
          <div className={styles.lockText}>조금만 더 답하면 볼 수 있어요</div>
        </div>
      )}
    </div>
  );
}

function MbtiCard({ mbti }: { mbti: MbtiResult }) {
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ fontFamily: 'var(--font-space-grotesk)', fontSize: 32, fontWeight: 700, color: 'var(--plum)' }}>
          {mbti.type}
        </div>
        <div style={{ fontSize: 10, color: 'var(--muted)', background: 'var(--bg)', padding: '3px 8px', borderRadius: 8 }}>
          타미 추정 · 참고용
        </div>
      </div>
      {mbti.axes.map((a) => {
        const lowConf = a.confidence < 0.3;
        const letter = a.score >= 50 ? a.left : a.right;
        return (
          <div key={a.axis} className={styles.barRow}>
            <div className={styles.barLabel}>{a.axis} ({letter})</div>
            <div className={styles.barTrack}>
              <div className={styles.barFill} style={{ width: `${Math.round(a.score)}%` }} />
            </div>
            <div className={`${styles.barVal} ${lowConf ? styles.barValLowConf : ''}`}>
              {lowConf ? '데이터 적음' : `${Math.round(a.confidence * 100)}%`}
            </div>
          </div>
        );
      })}
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 8, lineHeight: 1.5 }}>
        실제 MBTI 검사가 아니라, 타미가 이미 갖고 있는 성향 데이터를 조합해 추정한 참고용 결과예요.
      </div>
    </>
  );
}

// ---- 메인 페이지 ----

export default function ResultPage() {
  const db = useRef(createClient());
  const userId = useRef<string>('');

  const [byKey, setByKey] = useState<TraitMap | null>(null);
  const [unlocked, setUnlocked] = useState<UnlockState | null>(null);
  const [error, setError] = useState(false);

  const svgSurface = useRef<SVGPathElement>(null);
  const svgMiddle = useRef<SVGPathElement>(null);
  const svgDeep = useRef<SVGPathElement>(null);

  useEffect(() => {
    userId.current = getAnonUserId();

    async function init() {
      const data = await loadTraitData(db.current, userId.current);
      if (!data) { setError(true); return; }

      setByKey(data);
      setUnlocked(computeUnlockState(data));

      // blobRenderer.js 중복 로드 방지
      if (document.querySelector('script[src="/lib/blobRenderer.js"]')) {
        try {
          const renderer = (window as any).tammiBlobRenderer;
          if (renderer) {
            const blobTraits = buildBlobTraits(data);
            const layers = renderer.generateBlobLayers(blobTraits);
            if (svgSurface.current) svgSurface.current.setAttribute('d', layers.surface);
            if (svgMiddle.current) svgMiddle.current.setAttribute('d', layers.middle);
            if (svgDeep.current) svgDeep.current.setAttribute('d', layers.deep);
          }
        } catch (e) { console.warn('blobRenderer 오류', e); }
        return;
      }
      const script = document.createElement('script');
      script.src = '/lib/blobRenderer.js';
      script.onload = () => {
        try {
          const renderer = (window as any).tammiBlobRenderer;
          if (!renderer) return;
          const blobTraits = buildBlobTraits(data);
          const layers = renderer.generateBlobLayers(blobTraits);
          if (svgSurface.current) svgSurface.current.setAttribute('d', layers.surface);
          if (svgMiddle.current) svgMiddle.current.setAttribute('d', layers.middle);
          if (svgDeep.current) svgDeep.current.setAttribute('d', layers.deep);
        } catch (e) {
          console.warn('blobRenderer 오류', e);
        }
      };
      document.body.appendChild(script);
    }

    init();
  }, []);

  const answeredCount = byKey
    ? Object.values(byKey).filter((t) => t.answered).length
    : 0;

  if (error) {
    return (
      <div className={styles.wrap}>
        <Nav />
        <div className={styles.empty}>데이터를 불러오지 못했어요. 콘솔을 확인해주세요.</div>
      </div>
    );
  }

  if (!byKey || !unlocked) {
    return (
      <div className={styles.wrap}>
        <Nav />
        <div className={styles.loading}>불러오는 중...</div>
      </div>
    );
  }

  const surfaceHave = countAnswered(byKey, SECTION_KEYS.surface);
  const middleHave = countAnswered(byKey, SECTION_KEYS.middle);
  const deepHave = countAnswered(byKey, SECTION_KEYS.deep);
  const tasteHave = countAnswered(byKey, SECTION_KEYS.taste);
  const mbtiHave = countAnswered(byKey, SECTION_KEYS.mbti);

  const mbti = computeMbti(byKey);

  const surfaceLocked = !unlocked.surface;
  const middleLocked = !unlocked.middle;
  const deepLocked = !unlocked.deep;

  return (
    <div className={styles.wrap}>
      <Nav />

      <div className={styles.header}>
        <h1 className={styles.title}>나의 탐미 리포트</h1>
        <p className={styles.subtitle}>{answeredCount}개 특성 응답 반영됨</p>
      </div>

      {/* 블롭 SVG */}
      <div className={styles.blobWrap}>
        <svg width="220" height="220" viewBox="0 0 220 220" role="img" aria-label="3레이어 블롭 결과 이미지">
          <defs>
            <linearGradient id="gL1" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#E1566B" />
              <stop offset="100%" stopColor="#E2963C" />
            </linearGradient>
            <linearGradient id="gL2" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#4B3869" />
              <stop offset="100%" stopColor="#7B5FE0" />
            </linearGradient>
            <linearGradient id="gL3" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3FB6E8" />
              <stop offset="100%" stopColor="#3FE0C8" />
            </linearGradient>
          </defs>
          <path
            ref={svgSurface}
            fill="url(#gL1)"
            opacity={0.75}
            style={{ mixBlendMode: 'multiply' }}
            className={surfaceLocked ? styles.layerLocked : ''}
          />
          <path
            ref={svgMiddle}
            fill="url(#gL2)"
            opacity={0.7}
            style={{ mixBlendMode: 'multiply' }}
            className={middleLocked ? styles.layerLocked : ''}
          />
          <path
            ref={svgDeep}
            fill="url(#gL3)"
            opacity={0.55}
            style={{ mixBlendMode: 'multiply' }}
            className={deepLocked ? styles.layerLocked : ''}
          />
        </svg>
        {surfaceLocked && (
          <div className={styles.blobLockOverlay}>
            <ProgressGauge have={surfaceHave} need={UNLOCK_THRESHOLDS.surface} />
            <div className={styles.blobLockText}>조금만 더 답하면 나만의 형태가 보여요</div>
          </div>
        )}
      </div>

      {/* Big Five */}
      <LockableCard
        title="성향 분석 (Big Five)"
        sub="응답이 쌓일수록 정확해져요"
        isUnlocked={unlocked.surface}
        haveCount={surfaceHave}
        needCount={UNLOCK_THRESHOLDS.surface}
      >
        <BarRow label="개방성" trait={byKey.bigfive_openness} />
        <BarRow label="성실성" trait={byKey.bigfive_conscientiousness} />
        <BarRow label="외향성" trait={byKey.bigfive_extraversion} />
        <BarRow label="친화성" trait={byKey.bigfive_agreeableness} />
        <BarRow label="정서안정성" trait={byKey.bigfive_stability} />
      </LockableCard>

      {/* RIASEC */}
      <LockableCard
        title="관심 유형 (RIASEC)"
        sub="가족 내 상대 비중(%) 기준"
        isUnlocked={unlocked.middle}
        haveCount={middleHave}
        needCount={UNLOCK_THRESHOLDS.middle}
      >
        <BarRow label="현실형 R" trait={byKey.riasec_realistic} />
        <BarRow label="탐구형 I" trait={byKey.riasec_investigative} />
        <BarRow label="예술형 A" trait={byKey.riasec_artistic} />
        <BarRow label="사회형 S" trait={byKey.riasec_social} />
        <BarRow label="진취형 E" trait={byKey.riasec_enterprising} />
        <BarRow label="관습형 C" trait={byKey.riasec_conventional} />
      </LockableCard>

      {/* 행동 패턴 게이지 */}
      <LockableCard
        title="행동 패턴"
        sub="갈등/시간관/소비/의사결정/위험감수"
        isUnlocked={unlocked.middle && unlocked.deep}
        haveCount={Math.min(middleHave, deepHave)}
        needCount={UNLOCK_THRESHOLDS.middle}
      >
        <Gauge
          label={`${byKey.conflict_style.pole_right_label} ← 갈등 대응 → ${byKey.conflict_style.pole_left_label}`}
          val={byKey.conflict_style.score}
        />
        <Gauge
          label={`${byKey.time_perspective.pole_left_label} ← 시간관 → ${byKey.time_perspective.pole_right_label}`}
          val={byKey.time_perspective.score}
        />
        <Gauge
          label={`${byKey.spending_style.pole_left_label} ← 소비 성향 → ${byKey.spending_style.pole_right_label}`}
          val={byKey.spending_style.score}
        />
        <Gauge
          label={`${byKey.decision_style.pole_left_label} ← 의사결정 → ${byKey.decision_style.pole_right_label}`}
          val={byKey.decision_style.score}
        />
        <Gauge
          label={`${byKey.risk_taking.pole_left_label} ← 위험 감수 → ${byKey.risk_taking.pole_right_label}`}
          val={byKey.risk_taking.score}
        />
      </LockableCard>

      {/* 취향 리포트 */}
      <LockableCard
        title="취향 리포트"
        sub="심리 프레임워크 기반 아님, 추천용 취향 데이터"
        isUnlocked={unlocked.taste}
        haveCount={tasteHave}
        needCount={UNLOCK_THRESHOLDS.taste}
        extraClass={styles.cardTaste}
      >
        <div className={styles.tasteTags}>
          <span className={styles.tasteTag}>
            {byKey.taste_flavor.score >= 50
              ? byKey.taste_flavor.pole_right_label
              : byKey.taste_flavor.pole_left_label}
          </span>
          <span className={styles.tasteTag}>
            {byKey.taste_dining.score >= 50
              ? byKey.taste_dining.pole_right_label
              : byKey.taste_dining.pole_left_label}
          </span>
          <span className={styles.tasteTag}>
            {byKey.taste_travel_env.score >= 50
              ? byKey.taste_travel_env.pole_right_label
              : byKey.taste_travel_env.pole_left_label}
          </span>
        </div>
      </LockableCard>

      {/* 타미 MBTI 유형 유추 */}
      <LockableCard
        title="타미 MBTI 유형 유추"
        sub="기존 성향 데이터로 추정한 참고용 결과"
        isUnlocked={unlocked.mbti}
        haveCount={mbtiHave}
        needCount={UNLOCK_THRESHOLDS.mbti}
      >
        <MbtiCard mbti={mbti} />
      </LockableCard>
    </div>
  );
}