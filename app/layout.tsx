import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GoogleAnalytics } from '@next/third-parties/google';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ネタ・ブラックジャック",
  description: "並んだカードの名前だけを見て選べ！知識と予想で目標値にピッタリ寄せる新感覚ブラックジャック！",
  openGraph: {
    title: "ネタ・ブラックジャック",
    description: "並んだカードの名前だけを見て選べ！知識と予想で目標値にピッタリ寄せる新感覚ブラックジャック！",
    siteName: "ネタ・ブラックジャック",
    type: "website",
  },
  twitter: {
    card: "summary_large_image", // 大きい画像を表示する設定
    title: "ネタ・ブラックジャック",
    description: "並んだカードの名前だけを見て選べ！知識と予想で目標値にピッタリ寄せる新感覚ブラックジャック！",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
      <GoogleAnalytics gaId="G-7GV4KEF6N9" />
    </html>
  );
}
