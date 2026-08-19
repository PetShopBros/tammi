import { NextRequest, NextResponse } from 'next/server';

const NAVER_CLIENT_ID = process.env.NAVER_CLIENT_ID!;
const NAVER_REDIRECT_URI = process.env.NAVER_REDIRECT_URI!;

export async function GET(request: NextRequest) {
  // CSRF 방지용 state 생성 (sajubti에서 hardcoded 'state'였던 버그 수정)
  const state = crypto.randomUUID();

  const naverAuthUrl = new URL('https://nid.naver.com/oauth2.0/authorize');
  naverAuthUrl.searchParams.set('response_type', 'code');
  naverAuthUrl.searchParams.set('client_id', NAVER_CLIENT_ID);
  naverAuthUrl.searchParams.set('redirect_uri', NAVER_REDIRECT_URI);
  naverAuthUrl.searchParams.set('state', state);

  const response = NextResponse.redirect(naverAuthUrl.toString());

  // state를 쿠키에 저장해서 callback에서 검증
  response.cookies.set('naver_oauth_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 10, // 10분
    path: '/',
  });

  return response;
}