// data/themes.ts
import { ThemeKey, Theme, Card, GameMode } from "./types";
import { chainsTheme } from "./chains";
import { mangaTheme } from "./manga";
import { countriesTheme } from "./countries";
import { animeTheme } from "./anime";
import { moviesTheme } from "./movies";
import { historyTheme } from "./history";
import { primesTheme } from "./primes";
import { tokumeiTheme } from "./tokumei";


// 全てのテーマを1つにまとめる
export const THEMES: Record<ThemeKey, Theme> = {
  manga: mangaTheme,
  anime: animeTheme,
  movies: moviesTheme,
  history: historyTheme,
  chains: chainsTheme,
  countries: countriesTheme,
  primes: primesTheme,
  tokumei: tokumeiTheme,
};

export type { ThemeKey, Theme, Card, GameMode };