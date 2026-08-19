import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const NAVER_CLIENT_SECRET = process.env.NAVER_CLIENT_SECRET!;
const NAVER_REDIRECT_URI = process.env.NAVER_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');

  // ── CSRF state 검증 (sajubti에서 누락됐던 보안 버그 수정) ──
  const storedState = request.cookies.get('naver_oauth_state')?.value;
  if (!state || !storedState || state !== storedState) {
    console.error('Naver OAuth: state 불일치 (CSRF 의심)');
    return NextResponse.redirect(`${origin}/login?error=state_mismatch`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  // ── 네이버 액세스 토큰 교환 ──
  const tokenRes = await fetch('https://nid.naver.com/oauth2.0/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: NAVER_CLIENT_ID,
      client_secret: NAVER_CLIENT_SECRET,
      code,
      state,
    }),
  });

  const tokenData = await tokenRes.json();
  if (!tokenData.access_token) {
    console.error('Naver 토큰 교환 실패:', tokenData);
    return NextResponse.redirect(`${origin}/login?error=token_failed`);
  }

  // ── 네이버 사용자 정보 조회 ──
  const profileRes = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${tokenData.access_token}` },
  });
  const profileData = await profileRes.json();
  const naverUser = profileData.response;

  if (!naverUser?.id) {
    console.error('Naver 사용자 정보 조회 실패:', profileData);
    return NextResponse.redirect(`${origin}/login?error=profile_failed`);
  }

  const email = naverUser.email || `naver_${naverUser.id}@tammi.naver`;
  const nickname = naverUser.nickname || naverUser.name || '탐미 유저';

  // ── Supabase에 shadow user 생성 또는 로그인 ──
  const supabase = await createClient();

  // 기존 유저 로그인 시도
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    // 예측 불가한 임시 비밀번호 (sajubti의 `naver_${id}_sajubti` 패턴 버그 수정)
    password: `naver_${naverUser.id}_${process.env.NAVER_PASSWORD_SECRET || 'tammi_secret'}`,
  });

  if (signInError) {
    // 계정 없으면 신규 생성
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password: `naver_${naverUser.id}_${process.env.NAVER_PASSWORD_SECRET || 'tammi_secret'}`,
      options: {
        data: {
          full_name: nickname,
          avatar_url: naverUser.profile_image || '',
          provider: 'naver',
        },
      },
    });

    if (signUpError) {
      console.error('Naver 회원가입 실패:', signUpError);
      return NextResponse.redirect(`${origin}/login?error=signup_failed`);
    }
  }

  // state 쿠키 삭제 후 홈으로 리다이렉트
  const response = NextResponse.redirect(`${origin}/`);
  response.cookies.delete('naver_oauth_state');
  return response;
}