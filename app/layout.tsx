import type { Metadata } from "next";
import { Space_Grotesk, Noto_Sans_KR } from "next/font/google";
import "./globals.css";

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const notoSansKR = Noto_Sans_KR({
  variable: "--font-noto-sans-kr",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

export const metadata: Metadata = {
  title: "tammi",
  description: "매일 조금씩, 나를 탐구하다",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ko" className={`${spaceGrotesk.variable} ${notoSansKR.variable}`}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          background: "var(--bg)",
          color: "var(--ink)",
        }}
      >
        {children}
      </body>
    </html>
  );
}