'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/', label: '답하기' },
  { href: '/progress', label: '진행도' },
  { href: '/result', label: '결과' },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <nav style={{ display: 'flex', gap: 8, marginBottom: 18 }}>
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
    </nav>
  );
}