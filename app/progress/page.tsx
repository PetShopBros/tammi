'use client';

import { useEffect, useRef, useState } from 'react';
import Nav from '@/components/Nav';
import styles from './Progress.module.css';
import { createClient } from '@/lib/supabase/client';
import { getAnonUserId } from '@/lib/deck/utils';

// ---- 상수 ----

const GOAL_KEY = 'tammi_daily_goal';

const CHAPTERS = [
  { family: 'BigFive', label: '성향 기초', total: 5 },
  { family: 'RIASEC', label: '관심 유형', total: 6 },
  { family: 'DecisionMaking', label: '의사결정', total: 2 },
  { family: 'Cognition', label: '인지 성향', total: 1 },
  { family: 'Relationship', label: '관계 스타일', total: 7 },
  { family: 'Lifestyle', label: '라이프스타일', total: 2 },
  { family: 'Learning', label: '학습 성향', total: 2 },
  { family: 'Taste', label: '취향', total: 3 },
];

const HEAT_COLORS = ['', '#f6d9c8', '#efb28a', '#e77f5e', '#e1566b'];

// ---- 유틸 ----

function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function computeDailyCounts(responses: { answered_at: string }[]): Record<string, number> {
  const counts: Record<string, number> = {};
  responses.forEach((r) => {
    const key = toLocalDateKey(new Date(r.answered_at));
    counts[key] = (counts[key] || 0) + 1;
  });
  return counts;
}

function computeStreak(dailyCounts: Record<string, number>): number {
  let streak = 0;
  const cursor = new Date();
  if (!dailyCounts[toLocalDateKey(cursor)]) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dailyCounts[toLocalDateKey(cursor)]) {
    streak++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function heatBucket(count: number): number {
  if (count >= 8) return 4;
  if (count >= 5) return 3;
  if (count >= 2) return 2;
  if (count >= 1) return 1;
  return 0;
}

function getDailyGoal(): number {
  if (typeof window === 'undefined') return 5;
  const saved = localStorage.getItem(GOAL_KEY);
  return saved ? Number(saved) : 5;
}

function saveDailyGoal(n: number) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(GOAL_KEY, String(n));
}

// ---- 타입 ----

type ProgressData = {
  totalResponses: number;
  dailyCounts: Record<string, number>;
  streak: number;
  todayCount: number;
  answeredTraitIds: Set<number>;
  familyByTraitId: Record<number, string>;
};

// ---- 서브 컴포넌트 ----

function HeatmapGrid({ dailyCounts }: { dailyCounts: Record<string, number> }) {
  const today = new Date();
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - (83 - i));
    const key = toLocalDateKey(d);
    return { key, count: dailyCounts[key] || 0 };
  });

  return (
    <>
      <div className={styles.heatmapGrid}>
        {days.map((d) => {
          const bucket = heatBucket(d.count);
          return (
            <div
              key={d.key}
              className={styles.heatCell}
              title={`${d.key}: ${d.count}개`}
              style={{
                opacity: bucket === 0 ? 0.5 : 1,
                background: bucket === 0 ? 'var(--bg)' : HEAT_COLORS[bucket],
              }}
            />
          );
        })}
      </div>
      <div className={styles.heatLegend}>
        적음
        {[1, 2, 3, 4].map((b) => (
          <div
            key={b}
            className={styles.heatLegendCell}
            style={{ background: HEAT_COLORS[b] }}
          />
        ))}
        많음
      </div>
    </>
  );
}

function ChapterProgress({
  answeredTraitIds,
  familyByTraitId,
}: {
  answeredTraitIds: Set<number>;
  familyByTraitId: Record<number, string>;
}) {
  const familyAnsweredCount: Record<string, number> = {};
  Object.entries(familyByTraitId).forEach(([traitId, family]) => {
    if (answeredTraitIds.has(Number(traitId))) {
      familyAnsweredCount[family] = (familyAnsweredCount[family] || 0) + 1;
    }
  });

  return (
    <>
      {CHAPTERS.map((ch) => {
        const have = familyAnsweredCount[ch.family] || 0;
        const pct = Math.round((have / ch.total) * 100);
        return (
          <div key={ch.family} className={styles.chapterRow}>
            <div className={styles.chapterTop}>
              <span className={styles.chapterName}>{ch.label}</span>
              <span className={styles.chapterFrac}>{have}/{ch.total}</span>
            </div>
            <div className={styles.chapterTrack}>
              <div className={styles.chapterFill} style={{ width: `${pct}%` }} />
            </div>
          </div>
        );
      })}
    </>
  );
}

// ---- 메인 페이지 ----

export default function ProgressPage() {
  const db = useRef(createClient());
  const userId = useRef<string>('');

  const [data, setData] = useState<ProgressData | null>(null);
  const [goal, setGoal] = useState(5);
  const [goalInput, setGoalInput] = useState('5');
  const [error, setError] = useState(false);

  useEffect(() => {
    userId.current = getAnonUserId();
    const savedGoal = getDailyGoal();
    setGoal(savedGoal);
    setGoalInput(String(savedGoal));
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadData() {
    const { data: traits, error: tErr } = await db.current
      .from('traits')
      .select('id, family');
    if (tErr || !traits) { setError(true); return; }

    const { data: history, error: hErr } = await db.current
      .from('trait_score_history')
      .select('trait_id')
      .eq('user_id', userId.current);
    if (hErr) { setError(true); return; }

    const answeredTraitIds = new Set<number>((history || []).map((r: any) => r.trait_id));
    const familyByTraitId: Record<number, string> = {};
    traits.forEach((t: any) => { familyByTraitId[t.id] = t.family; });

    const { data: responses, error: rErr } = await db.current
      .from('responses')
      .select('answered_at')
      .eq('user_id', userId.current)
      .order('answered_at', { ascending: true });
    if (rErr) { setError(true); return; }

    const dailyCounts = computeDailyCounts(responses || []);
    const streak = computeStreak(dailyCounts);
    const todayCount = dailyCounts[toLocalDateKey(new Date())] || 0;

    setData({
      totalResponses: (responses || []).length,
      dailyCounts,
      streak,
      todayCount,
      answeredTraitIds,
      familyByTraitId,
    });
  }

  function handleGoalSave() {
    const val = Math.max(1, Math.min(100, Number(goalInput) || 5));
    saveDailyGoal(val);
    setGoal(val);
    setGoalInput(String(val));
  }

  if (error) {
    return (
      <div className={styles.wrap}>
        <Nav />
        <div className={styles.loading}>데이터를 불러오지 못했어요.</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={styles.wrap}>
        <Nav />
        <div className={styles.loading}>불러오는 중...</div>
      </div>
    );
  }

  const goalPct = Math.min(100, Math.round((data.todayCount / goal) * 100));

  return (
    <div className={styles.wrap}>
      <Nav />

      <div className={styles.header}>
        <h1 className={styles.title}>일간 진행도</h1>
        <p className={styles.subtitle}>총 {data.totalResponses}개 응답</p>
      </div>

      {/* 연속 출석 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>연속 출석</div>
        <div className={styles.streakRow}>
          <div className={styles.streakFlame}>{data.streak > 0 ? '🔥' : '💤'}</div>
          <div>
            <div className={styles.streakNum}>{data.streak}일째</div>
            <div className={styles.streakLabel}>
              {data.streak > 0 ? '오늘도 이어가볼까요?' : '오늘 답하고 스트릭을 시작해보세요'}
            </div>
          </div>
        </div>
      </div>

      {/* 오늘의 목표 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>오늘의 목표</div>
        <div className={styles.goalText}>
          오늘 <b>{data.todayCount}</b> / {goal}문항 ({goalPct}%)
        </div>
        <div className={styles.chapterTrack} style={{ width: 180, marginTop: 8 }}>
          <div className={styles.chapterFill} style={{ width: `${goalPct}%` }} />
        </div>
        <div className={styles.goalEditRow}>
          <input
            type="number"
            min={1}
            max={100}
            value={goalInput}
            onChange={(e) => setGoalInput(e.target.value)}
          />
          <button onClick={handleGoalSave}>목표 저장</button>
        </div>
      </div>

      {/* 최근 12주 히트맵 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>최근 12주</div>
        <HeatmapGrid dailyCounts={data.dailyCounts} />
      </div>

      {/* 챕터별 진행률 */}
      <div className={styles.card}>
        <div className={styles.cardTitle}>챕터별 진행률</div>
        <ChapterProgress
          answeredTraitIds={data.answeredTraitIds}
          familyByTraitId={data.familyByTraitId}
        />
      </div>
    </div>
  );
}