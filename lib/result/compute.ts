import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  TraitMap,
  Deltas,
  MbtiResult,
  UnlockState,
  BlobTraits,
} from './types';

const DEFAULT_SCORE_BIPOLAR = 50;
const DEFAULT_SCORE_INDEPENDENT = 0;
const DEFAULT_CONF = 0;

const CONSCIENTIOUSNESS_WEIGHT = 0.6;
const DECISION_STYLE_WEIGHT = 0.4;

export const UNLOCK_THRESHOLDS = {
  surface: 2,
  middle: 2,
  deep: 2,
  taste: 1,
  mbti: 3,
};

export const SECTION_KEYS = {
  surface: ['bigfive_openness', 'bigfive_conscientiousness', 'bigfive_extraversion', 'bigfive_agreeableness', 'bigfive_stability'],
  middle: ['riasec_realistic', 'riasec_investigative', 'riasec_artistic', 'riasec_social', 'riasec_enterprising', 'riasec_conventional', 'decision_style', 'risk_taking', 'conflict_style'],
  deep: ['locus_of_control', 'love_language_words', 'love_language_time', 'love_language_gifts', 'love_language_service', 'love_language_touch', 'time_perspective', 'spending_style', 'learning_motivation'],
  taste: ['taste_flavor', 'taste_dining', 'taste_travel_env'],
  mbti: ['bigfive_extraversion', 'info_style', 'judgment_basis', 'bigfive_conscientiousness', 'decision_style'],
  riasec: ['riasec_realistic', 'riasec_investigative', 'riasec_artistic', 'riasec_social', 'riasec_enterprising', 'riasec_conventional'],
  loveLang: ['love_language_words', 'love_language_time', 'love_language_gifts', 'love_language_service', 'love_language_touch'],
};

export async function loadTraitData(db: SupabaseClient, userId: string): Promise<TraitMap | null> {
  const { data: traits, error: tErr } = await db
    .from('traits')
    .select('id, key, family, type, name, pole_left_label, pole_right_label');

  if (tErr || !traits) {
    console.error('traits 조회 실패', tErr);
    return null;
  }

  const { data: history, error: hErr } = await db
    .from('trait_score_history')
    .select('trait_id, score, confidence, snapshot_date')
    .eq('user_id', userId)
    .order('snapshot_date', { ascending: false });

  if (hErr) {
    console.error('trait_score_history 조회 실패', hErr);
    return null;
  }

  // trait_id별 가장 최신 값만 취함
  const latestByTraitId: Record<string, any> = {};
  (history || []).forEach((row: any) => {
    if (!(row.trait_id in latestByTraitId)) latestByTraitId[row.trait_id] = row;
  });

  // trait_id별 전체 히스토리를 날짜 오름차순 정리 (델타 계산용)
  const historyByTraitId: Record<string, { date: string; score: number }[]> = {};
  (history || []).forEach((row: any) => {
    if (!historyByTraitId[row.trait_id]) historyByTraitId[row.trait_id] = [];
    historyByTraitId[row.trait_id].push({ date: row.snapshot_date, score: Number(row.score) });
  });
  Object.values(historyByTraitId).forEach((arr) =>
    arr.sort((a, b) => a.date.localeCompare(b.date))
  );

  const byKey: TraitMap = {};
  traits.forEach((t: any) => {
    const row = latestByTraitId[t.id];
    const defaultScore = t.type === 'independent' ? DEFAULT_SCORE_INDEPENDENT : DEFAULT_SCORE_BIPOLAR;
    byKey[t.key] = {
      family: t.family,
      type: t.type,
      name: t.name,
      pole_left_label: t.pole_left_label,
      pole_right_label: t.pole_right_label,
      score: row ? Number(row.score) : defaultScore,
      confidence: row ? Number(row.confidence) : DEFAULT_CONF,
      answered: !!row,
      history: historyByTraitId[t.id] || [],
    };
  });

  return byKey;
}

export function computeDeltas(history: { date: string; score: number }[]): Deltas {
  if (!history || history.length < 2) {
    return { previous: null, week: null, month: null, year: null };
  }

  const latest = history[history.length - 1];
  const latestDate = new Date(latest.date);

  function findClosestBefore(cutoffDate: Date) {
    let candidate = null;
    for (let i = history.length - 2; i >= 0; i--) {
      if (new Date(history[i].date) <= cutoffDate) {
        candidate = history[i];
        break;
      }
    }
    return candidate;
  }

  function deltaFrom(ref: { date: string; score: number } | null) {
    if (!ref) return null;
    return { delta: Math.round(latest.score - ref.score), refDate: ref.date };
  }

  const weekCutoff = new Date(latestDate);
  weekCutoff.setDate(weekCutoff.getDate() - 7);
  const monthCutoff = new Date(latestDate);
  monthCutoff.setDate(monthCutoff.getDate() - 30);
  const yearCutoff = new Date(latestDate);
  yearCutoff.setDate(yearCutoff.getDate() - 365);

  return {
    previous: deltaFrom(history[history.length - 2]),
    week: deltaFrom(findClosestBefore(weekCutoff)),
    month: deltaFrom(findClosestBefore(monthCutoff)),
    year: deltaFrom(findClosestBefore(yearCutoff)),
  };
}

export function computeMbti(byKey: TraitMap): MbtiResult {
  const ei = byKey.bigfive_extraversion;
  const ns = byKey.info_style;
  const tf = byKey.judgment_basis;
  const consc = byKey.bigfive_conscientiousness;
  const dec = byKey.decision_style;

  const jpScore =
    CONSCIENTIOUSNESS_WEIGHT * consc.score + DECISION_STYLE_WEIGHT * (100 - dec.score);
  const jpConf = Math.min(consc.confidence, dec.confidence);

  const axes: import('./types').MbtiAxis[] = [
    { axis: 'E/I', score: ei.score, confidence: ei.confidence, left: 'E', right: 'I' },
    { axis: 'N/S', score: ns.score, confidence: ns.confidence, left: 'N', right: 'S' },
    { axis: 'T/F', score: tf.score, confidence: tf.confidence, left: 'T', right: 'F' },
    { axis: 'J/P', score: jpScore, confidence: jpConf, left: 'J', right: 'P' },
  ];

  let type = '';
  axes.forEach((a) => { type += a.score >= 50 ? a.left : a.right; });
  const overallConfidence = Math.min(...axes.map((a) => a.confidence));

  return { type, overallConfidence, axes };
}

export function topTwo(byKey: TraitMap, keys: string[]): [{ key: string; score: number }, { key: string; score: number }] {
  const sorted = keys
    .map((k) => ({ key: k, score: byKey[k] ? byKey[k].score : 0 }))
    .sort((a, b) => b.score - a.score);
  return [sorted[0], sorted[1]];
}

export function countAnswered(byKey: TraitMap, keys: string[]): number {
  return keys.filter((k) => byKey[k] && byKey[k].answered).length;
}

export function computeUnlockState(byKey: TraitMap): UnlockState {
  return {
    surface: countAnswered(byKey, SECTION_KEYS.surface) >= UNLOCK_THRESHOLDS.surface,
    middle: countAnswered(byKey, SECTION_KEYS.middle) >= UNLOCK_THRESHOLDS.middle,
    deep: countAnswered(byKey, SECTION_KEYS.deep) >= UNLOCK_THRESHOLDS.deep,
    taste: countAnswered(byKey, SECTION_KEYS.taste) >= UNLOCK_THRESHOLDS.taste,
    mbti: countAnswered(byKey, SECTION_KEYS.mbti) >= UNLOCK_THRESHOLDS.mbti,
  };
}

export function buildBlobTraits(byKey: TraitMap): BlobTraits {
  const [riasecTop1, riasecTop2] = topTwo(byKey, SECTION_KEYS.riasec);
  const [loveLangTop] = topTwo(byKey, SECTION_KEYS.loveLang);

  return {
    bigFive: {
      openness: byKey.bigfive_openness.score,
      conscientiousness: byKey.bigfive_conscientiousness.score,
      extraversion: byKey.bigfive_extraversion.score,
      agreeableness: byKey.bigfive_agreeableness.score,
      stability: byKey.bigfive_stability.score,
    },
    middle: {
      riasecTop1: riasecTop1.score,
      riasecTop2: riasecTop2.score,
      decisionStyle: byKey.decision_style.score,
      riskTaking: byKey.risk_taking.score,
      conflictStyle: byKey.conflict_style.score,
    },
    deep: {
      locusOfControl: byKey.locus_of_control.score,
      loveLanguageTop: loveLangTop.score,
      timePerspective: byKey.time_perspective.score,
      spendingStyle: byKey.spending_style.score,
      learningMotivation: byKey.learning_motivation.score,
    },
  };
}