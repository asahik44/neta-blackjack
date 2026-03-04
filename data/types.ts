// data/types.ts
export type ThemeKey = "chains" | "manga" | "countries" | "anime" | "movies";

export interface Card {
  name: string;
  value: number;
  hint: string;
}

export interface Theme {
  name: string;
  target: number;
  unit: string;
  emoji: string;
  color: string;
  bg: string;
  cards: Card[];
}