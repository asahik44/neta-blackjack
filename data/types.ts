// data/types.ts

// ★ これを追加
export type GameMode = "normal" | "battle";

export type ThemeKey = "chains" | "manga" | "countries" | "anime" | "movies";

export interface Card {
  name: string;
  value: number;
  hint: string;
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