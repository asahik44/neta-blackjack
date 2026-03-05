// data/types.ts
export type GameMode = "normal" | "battle";

export type ThemeKey = "manga" | "movies" | "countries" | "anime" | "history" | "primes"| "chains";

export interface Card {
  name: string;
  value: number;
  hint: string;
  url?: string; //勝敗結果でURLがあればそちらのリンク、なければAmazonのリンクが作るられる
}

export interface Theme {
  name: string;
  target: number;
  battleTarget: number; // ★ これを追加（バトルモードでのバースト限界値）
  unit: string;
  emoji: string;
  color: string;
  bg: string;
  cards: Card[];
}