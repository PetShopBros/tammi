import type { SupabaseClient } from '@supabase/supabase-js';
import { BIGFIVE_AXIS_MAP } from './constants';
import type { DeckItem } from './types';

type PrimaryLink = {
  pole: string;
  weight: number;
  isBigFive: boolean;
  axis: string | null;
};

export async function fetchQuestionsFromDB(db: SupabaseClient): Promise<DeckItem[] | null> {
  const { data: questions, error: qErr } = await db
    .from('questions')
    .select('id, options')
    .eq('format_type', 'ab_dual')
    .limit(300);

  if (qErr || !questions || questions.length === 0) {
    console.warn('DB 臾명빆 議고쉶 ?ㅽ뙣, 濡쒖뺄 fallback ?ъ슜', qErr);
    return null;
  }

  const questionIds = questions.map((q) => q.id);
  const { data: links, error: lErr } = await db
    .from('question_trait_links')
    .select('question_id, option_key, pole, weight, traits(key, family)')
    .in('question_id', questionIds);

  if (lErr || !links) {
    console.warn('trait ?곌껐 議고쉶 ?ㅽ뙣, 濡쒖뺄 fallback ?ъ슜', lErr);
    return null;
  }

  // ?듭뀡 ?섎굹???щ윭 ?뱀꽦??嫄몃젮?덉쓣 ???덉쑝誘濡? weight媛 媛???믪?(二??뱀꽦) 留곹겕瑜???쒕줈 ?쇰뒗??
  const primaryLinkByQuestionOption: Record<string, PrimaryLink> = {};
  links.forEach((l: any) => {
    const key = `${l.question_id}:${l.option_key}`;
    const existing = primaryLinkByQuestionOption[key];
    if (!existing || l.weight > existing.weight) {
      primaryLinkByQuestionOption[key] = {
        pole: l.pole,
        weight: l.weight,
        isBigFive: l.traits?.family === 'BigFive',
        axis: l.traits?.family === 'BigFive' ? BIGFIVE_AXIS_MAP[l.traits.key] : null,
      };
    }
  });

  const deckItems: DeckItem[] = [];
  questions.forEach((q: any) => {
    const linkA = primaryLinkByQuestionOption[`${q.id}:a`];
    const linkB = primaryLinkByQuestionOption[`${q.id}:b`];
    const optA = q.options.find((o: any) => o.key === 'a');
    const optB = q.options.find((o: any) => o.key === 'b');
    if (!linkA || !linkB || !optA || !optB) return;

    deckItems.push({
      questionId: q.id,
      axis: linkA.axis,
      top: { pole: linkA.isBigFive ? linkA.pole : null, text: optA.text, optionKey: 'a' },
      bottom: { pole: linkB.isBigFive ? linkB.pole : null, text: optB.text, optionKey: 'b' },
    });
  });

  return deckItems.length > 0 ? deckItems : null;
}

export async function saveResponseToDB(
  db: SupabaseClient,
  userId: string,
  questionId: number | null,
  optionKey: string
) {
  if (!questionId) return;
  try {
    await db.from('responses').insert({
      user_id: userId,
      question_id: questionId,
      chosen_option: optionKey,
    });
  } catch (e) {
    console.warn('?묐떟 ????ㅽ뙣 (?ㅽ듃?뚰겕 臾몄젣?????덉쓬)', e);
  }
}
