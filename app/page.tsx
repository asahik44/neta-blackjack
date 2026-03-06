"use client";

import { useState, Suspense } from "react";
import { THEMES, ThemeKey, GameMode } from "@/data/themes";
import Game from "@/components/Game";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Lobby from "@/components/Lobby";

function HomeContent() {
  const [numPlayers, setNumPlayers] = useState<number>(1);
  const [gameMode, setGameMode] = useState<GameMode>("normal");
  const [activeTheme, setActiveTheme] = useState<ThemeKey | null>(null);
  const [multiplier, setMultiplier] = useState<number>(1);
  const [fieldSize, setFieldSize] = useState<number>(30);
  const [mode, setMode] = useState<"offline" | "online">("offline");
  
  const router = useRouter(); 
  const searchParams = useSearchParams();
  const roomId = searchParams.get("room");

  if (roomId) {
    return <Lobby roomId={roomId} />;
  }

  const handleStartGame = async (themeKey: ThemeKey) => {
    if (mode === "online") {
      const newRoomId = Math.random().toString(36).substring(2, 6).toUpperCase();
      const { error } = await supabase.from("rooms").insert([{ 
        id: newRoomId, theme_key: themeKey, status: "waiting", multiplier: multiplier, field_size: fieldSize 
      }]);
      if (error) { alert("部屋の作成に失敗しました: " + error.message); return; }
      router.push(`/?room=${newRoomId}`);
    } else {
      setActiveTheme(themeKey);
    }
  };

  if (activeTheme) {
    return <Game themeKey={activeTheme} numPlayers={numPlayers} gameMode={gameMode} multiplier={multiplier} fieldSize={fieldSize} onBack={() => setActiveTheme(null)} />;
  }

  return (
    <main>
      <div id="title">
        <div className="logo">🃏</div>
        <h1>ネタ・ブラックジャック</h1>
        <p className="sub">─ 知識 × 予想 × 駆け引き ─</p>
        <p className="desc">並んだカードの<span>名前だけ</span>を見て選べ！<br />数値は選んでからのお楽しみ！<br />合計を目標にピッタリ寄せろ💥</p>

        <div className="section-label">PLAY STYLE</div>
        <div className="mode-select" style={{ marginBottom: '24px' }}>
          <label style={{ flex: 1, display: 'flex' }}>
            <input type="radio" name="mode" value="offline" checked={mode === "offline"} onChange={() => setMode("offline")} style={{ display: 'none' }} />
            <span className="mode-label" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', ...(mode === "offline" ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb' } : { color: '#888', borderColor: '#e2e8f0', background: '#fff' }) }}>
              📱 1台で遊ぶ
            </span>
          </label>
          <label style={{ flex: 1, display: 'flex' }}>
            <input type="radio" name="mode" value="online" checked={mode === "online"} onChange={() => setMode("online")} style={{ display: 'none' }} />
            <span className="mode-label" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', ...(mode === "online" ? { color: '#2196F3', borderColor: '#2196F3', background: '#e3f2fd' } : { color: '#888', borderColor: '#e2e8f0', background: '#fff' }) }}>
              🌐 通信対戦
            </span>
          </label>
        </div>

        {mode === "offline" ? (
          <>
            <div className="section-label">GAME RULE</div>
            <div className="mode-select">
              <label style={{ flex: 1, display: 'flex' }}>
                <input type="radio" name="gmode" value="normal" checked={gameMode === "normal"} onChange={() => setGameMode("normal")} style={{ display: 'none' }} />
                <span className="mode-label" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', ...(gameMode === "normal" ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb' } : { color: '#888', borderColor: '#e2e8f0', background: '#fff' }) }}>
                  🎯 通常モード
                </span>
              </label>
              <label style={{ flex: 1, display: 'flex' }}>
                <input type="radio" name="gmode" value="battle" checked={gameMode === "battle"} onChange={() => setGameMode("battle")} style={{ display: 'none' }} />
                <span className="mode-label" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', ...(gameMode === "battle" ? { color: '#e63946', borderColor: '#e63946', background: '#fff0f0' } : { color: '#888', borderColor: '#e2e8f0', background: '#fff' }) }}>
                  ⚔️ バトルモード
                </span>
              </label>
            </div>

            {gameMode === "battle" && (
              <div className="battle-desc">
                <span className="battle-icon">💣</span>
                共通の目標値（LIMIT）に向かって交互にカードを引く！<br />
                限界を超えて<span className="battle-lose">バーストさせた（踏んだ）人の負け！</span><br />
                恐怖のチキンレースを生き残れ🔥
              </div>
            )}

            <div className="section-label">PLAYERS</div>
            <div className="mode-select">
              {[1, 2, 3].map((num) => (
                <label key={num} style={{ flex: 1, display: 'flex' }}>
                  <input type="radio" name="pmode" value={num} checked={numPlayers === num} onChange={() => setNumPlayers(num)} style={{ display: 'none' }} />
                  <span className="mode-label" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', ...(numPlayers === num ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb' } : { color: '#888', borderColor: '#e2e8f0', background: '#fff' }) }}>
                    {num === 1 ? (gameMode === "battle" ? '🤖 CPU戦' : '🎯 1人') : `👥 ${num}人`}
                  </span>
                </label>
              ))}
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', fontSize: '13px', color: '#555', marginBottom: '24px', padding: '16px', background: '#e3f2fd', borderRadius: '12px', border: '1px solid #bbdefb' }}>
            🌐 通信対戦は自動的に<strong>「バトルモード」</strong>になります。<br/>
            テーマを選んで部屋を作り、友達にURLを共有しましょう！<br/>
            最大5人までプレイできます。
          </div>
        )}

        {/* ★ カスタムルール：白枠固定（nowrap）とパディングを調整してタップしやすく均等化！ */}
        <div className="section-label">CUSTOM RULES</div>
        <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '12px', marginBottom: '24px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>🎯 目標値の倍率</div>
          <div className="mode-select" style={{ marginBottom: '16px', gap: '8px' }}>
            {[0.5, 1, 2, 3].map((mult) => (
              <label key={mult} style={{ flex: 1, display: 'flex' }}>
                <input type="radio" name="mult" value={mult} checked={multiplier === mult} onChange={() => setMultiplier(mult)} style={{ display: 'none' }} />
                <span className="mode-label" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 2px', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 'bold', ...(multiplier === mult ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb' } : { color: '#888', borderColor: '#e2e8f0', background: '#fff' }) }}>
                  {mult === 0.5 ? '半分' : mult === 1 ? '標準' : `x${mult}`}
                </span>
              </label>
            ))}
          </div>

          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#555', marginBottom: '8px' }}>🃏 並べるカード枚数</div>
          <div className="mode-select" style={{ gap: '8px' }}>
            {[20, 30, 50, 100].map((size) => (
              <label key={size} style={{ flex: 1, display: 'flex' }}>
                <input type="radio" name="fsize" value={size} checked={fieldSize === size} onChange={() => setFieldSize(size)} style={{ display: 'none' }} />
                <span className="mode-label" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '12px 2px', whiteSpace: 'nowrap', fontSize: '14px', fontWeight: 'bold', ...(fieldSize === size ? { color: '#e67e22', borderColor: '#e67e22', background: '#fff5eb' } : { color: '#888', borderColor: '#e2e8f0', background: '#fff' }) }}>
                  {size}枚
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="section-label">SELECT THEME</div>
        <div id="theme-buttons">
          {(Object.keys(THEMES) as ThemeKey[]).map((key) => {
            const t = THEMES[key];
            const target = t.target;
            return (
              <button key={key} className="theme-btn" style={{ borderColor: `${t.color}44` }} onClick={() => handleStartGame(key)}>
                <span className="emoji">{t.emoji}</span>
                <div>
                  <div>{t.name}</div>
                  <div className="info">{mode === "online" || gameMode === "battle" ? `💣 ${target.toLocaleString()}${t.unit}を超えたら負け｜${fieldSize}枚から選択` : `目標: ${target.toLocaleString()}${t.unit}｜${fieldSize}枚から選択`}</div>
                </div>
              </button>
            );
          })}
        </div>
        
        <div style={{ textAlign: 'center', marginTop: '32px', marginBottom: '16px' }}>
          <a href="https://ofuse.me/asahik44" target="_blank" rel="noopener noreferrer" style={{ display: 'inline-block', background: '#0077ff', color: '#fff', padding: '12px 32px', borderRadius: '30px', fontWeight: 'bold', textDecoration: 'none', boxShadow: '0 4px 12px rgba(0, 119, 255, 0.3)' }}>
            ☕️ 開発者をOFUSEで応援する
          </a>
        </div>

        <div style={{ marginTop: '24px', fontSize: '11px', color: '#888', textAlign: 'center', lineHeight: '1.6', padding: '0 16px' }}>
          <p style={{ marginBottom: '16px', fontWeight: 'bold' }}>※カードの数値（巻数や店舗数など）はデータ作成時のものです。<br />最新の情報とズレていたり、たまーに間違いがあるかもしれませんが、許してつかあさい</p>
          効果音：<a href="https://otologic.jp" target="_blank" rel="noopener noreferrer" style={{ color: '#888', textDecoration: 'underline' }}>OtoLogic</a><br /><br />
          ※当サイトは、Amazonアソシエイト・プログラムの参加者です。
        </div>
      </div>
    </main>
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div style={{ padding: "40px", textAlign: "center", fontWeight: "bold" }}>通信準備中...🌐</div>}>
      <HomeContent />
    </Suspense>
  );
}