'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const NAV_ITEMS = [
  { href: '/', label: '답하기' },
  { href: '/progress', label: '진행도' },
  { href: '/result', label: '결과' },
];

export default function Nav() {
  const pathname = usePathname();
  // undefined=로딩중, null=비로그인, string=로그인됨
  const [userEmail, setUserEmail] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUserEmail(data.user?.email ?? null);
    });
  }, []);

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUserEmail(null);
  }

  return (
    <nav style={{ display: 'flex', gap: 8, marginBottom: 18, alignItems: 'center' }}>
      {NAV_ITEMS.map((item) => {
        const active = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            style={{
              flex: 1,
              textAlign: 'center',
              padding: '9px 0',
              borderRadius: 10,
              fontSize: 12,
              textDecoration: 'none',
              background: active ? 'var(--plum)' : '#fff',
              color: active ? '#fff' : 'var(--plum)',
              fontWeight: active ? 700 : 400,
            }}
          >
            {item.label}
          </Link>
        );
      })}

      {userEmail === null && (
        <Link
          href="/login"
          style={{
            padding: '9px 10px',
            borderRadius: 10,
            fontSize: 11,
            textDecoration: 'none',
            background: '#fff',
            color: 'var(--coral)',
            fontWeight: 700,
            whiteSpace: 'nowrap',
          }}
        >
          Login
        </Link>
      )}
      {userEmail && (
        <button
          onClick={handleLogout}
          style={{
            padding: '9px 10px',
            borderRadius: 10,
            fontSize: 11,
            border: 'none',
            background: '#fff',
            color: 'var(--muted)',
            fontWeight: 500,
            cursor: 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          Logout
        </button>
      )}
    </nav>
  );
}