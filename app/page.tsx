"use client";

import { useState } from "react";
import { THEMES, ThemeKey, GameMode } from "@/data/themes";
import Game from "@/components/Game";

export default function Home() {
  const [numPlayers, setNumPlayers] = useState<number>(1);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null);

  const handleStartGame = (key: ThemeKey) => {
    setActiveTheme(key);
  };

  if (activeTheme) {
    return (
      <Game 
        themeKey={activeTheme} 
        numPlayers={numPlayers} // ★ バトルモードでも強制的に2人にせず、選んだ人数を渡す！
        gameMode={gameMode}
        onBack={() => setActiveTheme(null)}
      />
    );
  }

  const isBattle = gameMode === "battle";

  return (
    <main>
      <div id="title">
        <div className="logo">🃏</div>
        <h1>ネタ・ブラックジャック</h1>
        <p className="sub">─ 知識 × 予想 × 駆け引き ─</p>
        <p className="desc">並んだカードの<span>名前だけ</span>を見て選べ！<br />数値は選んでからのお楽しみ！<br />合計を目標にピッタリ寄せろ💥</p>

        <div className="section-label">GAME MODE</div>
        <div className="mode-select">
          <label>
            <input 
              type="radio" 
              name="gmode" 
              value="normal" 
              checked={gameMode === "normal"}
              onChange={() => setGameMode("normal")}
            />
            <span className="mode-label" style={gameMode === "normal" ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb' } : {}}>
              🎯 通常モード
            </span>
          </label>
          <label>
            <input 
              type="radio" 
              name="gmode" 
              value="battle" 
              checked={gameMode === "battle"}
              onChange={() => setGameMode("battle")}
            />
            <span className="mode-label" style={gameMode === "battle" ? { color: '#e63946', borderColor: '#e63946', background: '#fff0f0' } : {}}>
              ⚔️ バトルモード
            </span>
          </label>
        </div>

        {isBattle && (
          <div className="battle-desc">
            <span className="battle-icon">💣</span>
            共通の目標値（LIMIT）に向かって交互にカードを引く！<br />
            限界を超えて<span className="battle-lose">バーストさせた（踏んだ）人の負け！</span><br />
            恐怖のチキンレースを生き残れ🔥
          </div>
        )}

        {/* ★ バトルモードでも人数を選べるように制限を解除！ */}
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
                {num === 1 ? (isBattle ? '🤖 vs CPU' : '🎯 1人') : `👥 ${num}人`}
              </span>
            </label>
          ))}
        </div>

        <div className="section-label">SELECT THEME</div>
        <div id="theme-buttons">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const t = THEMES[key];
            const target = isBattle ? t.battleTarget : t.target;
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
                  <div className="info">
                    {isBattle 
                      ? `💣 ${target.toLocaleString()}${t.unit}を超えたら負け｜30枚から選択`
                      : `目標: ${target.toLocaleString()}${t.unit}｜30枚から選択`
                    }
                  </div>
                </div>
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: '24px', fontSize: '11px', color: '#888', textAlign: 'center' }}>
          効果音：<a href="https://otologic.jp" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>OtoLogic</a>
        </div>
      </div>
    </main>
  );
}