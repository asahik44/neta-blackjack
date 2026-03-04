"use client";

import { useState } from "react";
import { THEMES, ThemeKey } from "@/data/themes";
import Game from "@/components/Game"; // ★さっき作った部品を読み込む

export default function Home() {
  const [numPlayers, setNumPlayers] = useState<number>(1);
  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null); // ★現在選ばれているテーマを記憶する

  // テーマを選んだら、activeThemeにセットする（画面が切り替わる）
  const handleStartGame = (key: ThemeKey) => {
    setActiveTheme(key);
  };

  // activeTheme に何か入っていたら、ゲーム画面を表示する！
  if (activeTheme) {
    return (
      <Game 
        themeKey={activeTheme} 
        numPlayers={numPlayers} 
        onBack={() => setActiveTheme(null)} // 戻るボタンが押されたら空っぽにする
      />
    );
  }

  // 選ばれていない時は、タイトル画面を表示する
  return (
    <main>
      <div id="title">
        <div className="logo">🃏</div>
        <h1>ネタ・ブラックジャック</h1>
        <p className="sub">─ 知識 × 予想 × 駆け引き ─</p>
        <p className="desc">並んだカードの<span>名前だけ</span>を見て選べ！<br />数値は選んでからのお楽しみ！<br />合計を目標にピッタリ寄せろ💥</p>

        <div className="section-label">PLAYERS</div>
        <div className="mode-select">
          {[1, 2, 3].map((num) => (
            <label key={num}>
              <input 
                type="radio" 
                name="pmode" 
                value={num} 
                checked={numPlayers === num}
                onChange={() => setNumPlayers(num)}
              />
              <span className="mode-label" style={numPlayers === num ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb' } : {}}>
                {num === 1 ? '🎯 1人' : `👥 ${num}人`}
              </span>
            </label>
          ))}
        </div>

        <div className="section-label">SELECT THEME</div>
        <div id="theme-buttons">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const t = THEMES[key];
            return (
              <button 
                key={key} 
                className="theme-btn" 
                style={{ borderColor: `${t.color}44` }}
                onClick={() => handleStartGame(key)}
              >
                <span className="emoji">{t.emoji}</span>
                <div>
                  <div>{t.name}</div>
                  <div className="info">目標: {t.target.toLocaleString()}{t.unit}｜28枚から選択</div>
                </div>
              </button>
            );
          })}
        </div>

        <div className="howto">
          <div className="label">HOW TO PLAY</div>
          <div className="body">
            <span className="num">①</span> 場に28枚のカードが並ぶ（名前とヒントだけ見える）<br />
            <span className="num">②</span> カードを選ぶと数値が判明！合計に加算される<br />
            <span className="num">③</span> 目標の数字に近づいたら「ストップ」<br />
            <span className="num">④</span> 目標を超えたらバースト💥 ディーラーより近ければ勝ち！
          </div>
        </div>

        {/* ★ ここにOtoLogicのクレジットを追加しました */}
        <div style={{ marginTop: '24px', fontSize: '11px', color: '#888', textAlign: 'center' }}>
          効果音：<a href="https://otologic.jp" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>OtoLogic</a>
        </div>

      </div>
    </main>
  );
}