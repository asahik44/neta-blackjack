// data/types.ts
export type GameMode = "normal" | "battle";

export type ThemeKey = "manga" | "movies" | "countries" | "anime" | "history" | "chains";

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