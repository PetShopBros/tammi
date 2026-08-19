'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { Suspense } from 'react';
import styles from './Login.module.css';
import { createClient } from '@/lib/supabase/client';

const ERROR_MESSAGES: Record<string, string> = {
  oauth_failed: '로그인에 실패했어요. 다시 시도해주세요.',
  state_mismatch: '보안 오류가 발생했어요. 다시 시도해주세요.',
  no_code: '인증 코드를 받지 못했어요. 다시 시도해주세요.',
  token_failed: '토큰 교환에 실패했어요. 다시 시도해주세요.',
  profile_failed: '사용자 정보를 가져오지 못했어요.',
  signup_failed: '회원가입에 실패했어요. 다시 시도해주세요.',
};

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorKey = searchParams.get('error');
  const supabase = createClient();

  async function handleKakao() {
    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  async function handleApple() {
    await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  }

  function handleNaver() {
    window.location.href = '/auth/naver';
  }

  function handleSkip() {
    router.push('/');
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.logo}>tammi</div>
        <div className={styles.tagline}>매일 조금씩, 나를 탐구하다</div>

        {errorKey && ERROR_MESSAGES[errorKey] && (
          <div className={styles.errorMsg}>{ERROR_MESSAGES[errorKey]}</div>
        )}

        <div className={styles.divider}>소셜 계정으로 시작하기</div>

        <div className={styles.btnList}>
          <button className={`${styles.btn} ${styles.btnKakao}`} onClick={handleKakao}>
            <span className={styles.btnIcon}>💬</span>
            카카오로 계속하기
          </button>

          <button className={`${styles.btn} ${styles.btnNaver}`} onClick={handleNaver}>
            <span className={styles.btnIcon} style={{ fontFamily: 'sans-serif', fontSize: 14 }}>N</span>
            네이버로 계속하기
          </button>

          <button className={`${styles.btn} ${styles.btnGoogle}`} onClick={handleGoogle}>
            <span className={styles.btnIcon}>
              <svg width="18" height="18" viewBox="0 0 18 18">
                <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"/>
                <path fill="#FBBC05" d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"/>
                <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.166 6.656 3.58 9 3.58z"/>
              </svg>
            </span>
            Google로 계속하기
          </button>

          <button className={`${styles.btn} ${styles.btnApple}`} onClick={handleApple}>
            <span className={styles.btnIcon}>
              <svg width="16" height="18" viewBox="0 0 16 18" fill="white">
                <path d="M13.27 9.54c-.02-2.17 1.78-3.22 1.86-3.27-1.01-1.48-2.59-1.68-3.15-1.7-1.34-.14-2.62.79-3.3.79-.68 0-1.73-.77-2.84-.75-1.46.02-2.81.85-3.56 2.16C.77 9.3 1.83 13.17 3.38 15.3c.77 1.1 1.68 2.33 2.87 2.28 1.16-.05 1.59-.74 2.99-.74 1.4 0 1.79.74 3.01.71 1.24-.02 2.03-1.12 2.79-2.23.88-1.28 1.24-2.52 1.26-2.58-.03-.01-2.41-.92-2.43-3.2zM11.1 3.14c.64-.77 1.07-1.85.95-2.92-.92.04-2.03.61-2.69 1.37-.59.68-1.1 1.77-.96 2.81 1.02.08 2.06-.52 2.7-1.26z"/>
              </svg>
            </span>
            Apple로 계속하기
          </button>
        </div>

        <div className={styles.skip}>
          <span onClick={handleSkip} role="button">로그인 없이 시작하기</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  );
}