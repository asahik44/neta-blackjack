"use client";

import { useState } from "react";
import { THEMES, ThemeKey, GameMode } from "@/data/themes";
import Game from "@/components/Game";

export default function Home() {
  const [numPlayers, setNumPlayers] = useState<number>(1);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [fieldSize, setFieldSize] = useState<number>(30);

  const handleStartGame = (key: ThemeKey) => {
    setActiveTheme(key);
  };

  if (activeTheme) {
    return (
      <Game 
        themeKey={activeTheme} 
        numPlayers={numPlayers} // ★ バトルモードでも強制的に2人にせず、選んだ人数を渡す！
        gameMode={gameMode}
        multiplier={multiplier} // ★ Gameに渡す
        fieldSize={fieldSize}   // ★ Gameに渡す
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

      <div className="section-label">CUSTOM RULES</div>
        <div style={{ background: '#f8f9fa', padding: '12px', borderRadius: '12px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>🎯 目標値の倍率</div>
          <div className="mode-select" style={{ marginBottom: '16px' }}>
            {[0.5, 1, 2, 3].map((mult) => (
              <label key={mult} style={{ flex: 1 }}>
                <input type="radio" name="mult" value={mult} checked={multiplier === mult} onChange={() => setMultiplier(mult)} />
                <span className="mode-label" style={multiplier === mult ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb', padding: '8px 4px' } : { padding: '8px 4px' }}>
                  {mult === 0.5 ? '半分' : mult === 1 ? '標準' : `x${mult}`}
                </span>
              </label>
            ))}
          </div>

          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>🃏 並べるカード枚数</div>
          <div className="mode-select">
            {[20, 30, 50, 100].map((size) => (
              <label key={size} style={{ flex: 1 }}>
                <input type="radio" name="fsize" value={size} checked={fieldSize === size} onChange={() => setFieldSize(size)} />
                <span className="mode-label" style={fieldSize === size ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb', padding: '8px 4px' } : { padding: '8px 4px' }}>
                  {size === 100 ? 'MAX(100)' : `${size}枚`}
                </span>
              </label>
            ))}
          </div>
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
<div style={{ marginTop: '24px', fontSize: '11px', color: '#888', textAlign: 'center', lineHeight: '1.6', padding: '0 16px' }}>
          <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>
            ※カードの数値（巻数や店舗数など）はデータ作成時のものです。<br />
            最新の情報とズレていたり、たまーに間違いがあるかもしれませんが、<br />
            許してつかあさい
          </p>
          
          効果音：<a href="https://otologic.jp" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>OtoLogic</a>
          <br /><br />
          ※当サイトは、Amazon.co.jpを宣伝しリンクすることによってサイトが紹介料を獲得できる手段を提供することを目的に設定されたアフィリエイトプログラムである、Amazonアソシエイト・プログラムの参加者です。
        </div>
      </div>
    </main>
  );
}