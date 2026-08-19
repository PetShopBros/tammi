import type { DeckItem, Tallies } from './types';
import { AXES } from './constants';

export function getAnonUserId(): string {
  if (typeof window === 'undefined') return '';
  let id = localStorage.getItem('tammi_anon_user_id');
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem('tammi_anon_user_id', id);
  }
  return id;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function makeEmptyTallies(): Tallies {
  const tallies: Tallies = { total: 0 };
  AXES.forEach((a) => {
    tallies[a.left] = 0;
    tallies[a.right] = 0;
  });
  return tallies;
}

export function loadLocalTallies(): Tallies {
  const tallies = makeEmptyTallies();
  if (typeof window === 'undefined') return tallies;
  try {
    const saved = localStorage.getItem('tammi_profile_tallies');
    if (saved) {
      return Object.assign(tallies, JSON.parse(saved));
    }
  } catch {
    // no saved data yet
  }
  return tallies;
}

export function saveLocalTallies(tallies: Tallies) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('tammi_profile_tallies', JSON.stringify(tallies));
  } catch (e) {
    console.error('save failed', e);
  }
}

export type { DeckItem };
