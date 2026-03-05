// data/themes.ts
import { ThemeKey, Theme, Card, GameMode } from "./types";
import { chainsTheme } from "./chains";
import { mangaTheme } from "./manga";
import { countriesTheme } from "./countries";
import { animeTheme } from "./anime";
import { moviesTheme } from "./movies";

// 全てのテーマを1つにまとめる
export const THEMES: Record<ThemeKey, Theme> = {
  chains: chainsTheme,
  manga: mangaTheme,
  countries: countriesTheme,
  anime: animeTheme,
  movies: moviesTheme,
};

export type { ThemeKey, Theme, Card, GameMode };