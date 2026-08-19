'use client';

import { useEffect, useRef, useState } from 'react';
import Nav from '@/components/Nav';
import styles from './CardDeck.module.css';
import { createClient } from '@/lib/supabase/client';
import { fetchQuestionsFromDB, saveResponseToDB } from '@/lib/deck/api';
import { FALLBACK_PAIRS } from '@/lib/deck/constants';
import type { DeckItem } from '@/lib/deck/types';
import {
  getAnonUserId,
  loadLocalTallies,
  makeEmptyTallies,
  saveLocalTallies,
  shuffle,
} from '@/lib/deck/utils';

type FlyDirection = 'top' | 'bottom' | null;

export default function CardDeckPage() {
  const db = useRef(createClient());
  const userId = useRef<string>('');

  const [sourcePairs, setSourcePairs] = useState<DeckItem[]>(FALLBACK_PAIRS);
  const [deck, setDeck] = useState<DeckItem[]>([]);
  const deckPtrRef = useRef(0);

  const [current, setCurrent] = useState<DeckItem | null>(null);
  const [tallies, setTallies] = useState(makeEmptyTallies());
  const [entering, setEntering] = useState(true);
  const [flying, setFlying] = useState<FlyDirection>(null);
  const [loaded, setLoaded] = useState(false);

  function drawNextCard(fromDeck: DeckItem[], fromPairs: DeckItem[]): DeckItem {
    let activeDeck = fromDeck;
    if (deckPtrRef.current >= activeDeck.length) {
      activeDeck = shuffle(fromPairs);
      setDeck(activeDeck);
      deckPtrRef.current = 0;
    }
    const item = activeDeck[deckPtrRef.current];
    deckPtrRef.current += 1;
    return item;
  }

  useEffect(() => {
    userId.current = getAnonUserId();

    async function init() {
      const localTallies = loadLocalTallies();
      setTallies(localTallies);

      let pairs = FALLBACK_PAIRS;
      const dbPairs = await fetchQuestionsFromDB(db.current);
      if (dbPairs) {
        pairs = dbPairs;
      }
      setSourcePairs(pairs);

      const initialDeck = shuffle(pairs);
      setDeck(initialDeck);
      deckPtrRef.current = 0;
      setCurrent(drawNextCard(initialDeck, pairs));
      setLoaded(true);
      triggerEnter();
    }

    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function triggerEnter() {
    setEntering(false);
    // 다음 tick에 다시 true로 만들어 popIn 애니메이션을 재실행 (원본의 offsetWidth reflow trick과 동일한 목적)
    requestAnimationFrame(() => setEntering(true));
  }

  function handleChoose(direction: 'top' | 'bottom') {
    if (!current) return;
    const chosen = direction === 'top' ? current.top : current.bottom;

    setTallies((prev) => {
      const next = { ...prev };
      if (chosen.pole) {
        next[chosen.pole] = (next[chosen.pole] || 0) + 1;
      }
      next.total += 1;
      saveLocalTallies(next);
      return next;
    });

    saveResponseToDB(db.current, userId.current, current.questionId, chosen.optionKey);

    setFlying(direction);
    setTimeout(() => {
      setCurrent(drawNextCard(deck, sourcePairs));
      setFlying(null);
      triggerEnter();
    }, 180);
  }

  function handleSkip() {
    setCurrent(drawNextCard(deck, sourcePairs));
    triggerEnter();
  }

  const duelClassName = [
    styles.duel,
    entering ? styles.enter : '',
    flying === 'top' ? styles.flyingTop : '',
    flying === 'bottom' ? styles.flyingBottom : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={styles.wrap}>
      <Nav />

      <header className={styles.header}>
        <h1 className={`${styles.title} font-heading`}>tammi</h1>
        <p className={styles.subtitle}>매일 조금씩, 나를 탐구하다</p>
      </header>

      <div className={styles.counter}>
        총 <b>{tallies.total}</b>번 선택함
      </div>

      <div className={duelClassName}>
        <div
          className={`${styles.opt} ${styles.optTop}`}
          onClick={() => handleChoose('top')}
        >
          <div className={styles.optLabel}>A</div>
          <div className={styles.optText}>{loaded && current ? current.top.text : '불러오는 중…'}</div>
        </div>
        <div
          className={`${styles.opt} ${styles.optBottom}`}
          onClick={() => handleChoose('bottom')}
        >
          <div className={styles.optLabel}>B</div>
          <div className={styles.optText}>{loaded && current ? current.bottom.text : '불러오는 중…'}</div>
        </div>
        <div className={styles.vsBadge}>VS</div>
      </div>

      <div className={styles.skipRow}>
        <button onClick={handleSkip}>패스하고 다음 카드</button>
      </div>
    </div>
  );
}