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
  description: "知識 × 予想 × 駆け引き！カードの名前だけを見て選び、目標数値にピッタリ寄せろ💥 1台でも、オンラインでも遊べる新感覚チキンレース！",
  openGraph: {
    title: "ネタ・ブラックジャック",
    description: "知識 × 予想 × 駆け引き！カードの名前だけを見て選び、目標数値にピッタリ寄せろ💥",
    type: "website",
    locale: "ja_JP",
    siteName: "ネタ・ブラックジャック",
  },
  twitter: {
    card: "summary_large_image",
    title: "ネタ・ブラックジャック",
    description: "知識 × 予想 × 駆け引き！カードの名前だけを見て選び、目標数値にピッタリ寄せろ💥",
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
