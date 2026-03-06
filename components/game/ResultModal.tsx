// components/game/ResultModal.tsx
import React from "react";
import { Player } from "../../hooks/useGameLogic";
import { Card } from "../../data/themes";

interface ResultModalProps {
  showModal: boolean;
  modalAnimationClass: string;
  isBattle: boolean;
  battleLoser: number | null;
  isSelfDestructGlobal: boolean;
  getPlayerName: (p: Player | undefined) => string;
  players: Player[];
  sharedTotal: number;
  activeTarget: number;
  unit: string;
  fmt: (v: number) => string;
  battleWinnerIdx: number | null;
  isMulti: boolean;
  allMultiBust: boolean;
  soloResult: 'win' | 'lose' | 'bust' | 'perfect' | null;
  total: number;
  dealerTotal: number;
  themeColor: string;
  hand: Card[];
  isPerfect: boolean;
  handleRetry: () => void;
  handleBackToTitle: () => void;
}

export default function ResultModal({
  showModal, modalAnimationClass, isBattle, battleLoser, isSelfDestructGlobal,
  getPlayerName, players, sharedTotal, activeTarget, unit, fmt, battleWinnerIdx,
  isMulti, allMultiBust, soloResult, total, dealerTotal, themeColor, hand, isPerfect,
  handleRetry, handleBackToTitle
}: ResultModalProps) {
  
  if (!showModal) return null; // モーダル非表示の時は何も描画しない！

  // 枠線の色を状況に応じて決定するロジック
  const borderColor = isBattle 
    ? (battleLoser !== null ? '#e63946' : '#888') 
    : isMulti 
      ? (allMultiBust ? '#ff4444' : players[0]?.color) 
      : (soloResult === 'bust' ? '#ff4444' : themeColor);

  const targetHand = isMulti ? players[0]?.hand ?? [] : hand;
  const hasVideo = targetHand.some(c => c.url);

  return (
    <div className="modal-bg active">
      <div className={`modal ${modalAnimationClass}`} style={{ borderColor }}>
        
        {isBattle && (
          <>
            <div className="result-emoji">{battleLoser !== null ? '💥' : '🤝'}</div>
            <div className="result-title">
              {battleLoser !== null 
                ? (() => {
                    if (isSelfDestructGlobal) {
                      return (
                        <>
                          <span style={{ fontSize: '16px', color: '#ff4444', display: 'block', marginBottom: '4px' }}>
                            {getPlayerName(players[battleLoser])} が1枚目でドカン！💥
                          </span>
                          <span style={{ color: '#888' }}>勝者なし！（自爆）</span>
                          <div style={{ fontSize: '12px', color: '#888', marginTop: '4px', fontWeight: 'normal' }}>
                            （誰もカードを引いていないためノーコンテストです）
                          </div>
                        </>
                      );
                    }
                    return (
                      <>
                        <span style={{ fontSize: '16px', color: '#ff4444', display: 'block', marginBottom: '4px' }}>
                          {getPlayerName(players[battleLoser])} がドカン！💥
                        </span>
                        <span style={{ color: players.length === 2 ? players[battleLoser === 0 ? 1 : 0]?.color : '#e67e22' }}>
                          {players.length === 2 ? `${getPlayerName(players[battleLoser === 0 ? 1 : 0])} の勝ち！` : '生存者の勝ち！'}
                        </span>
                      </>
                    );
                  })()
                : '引き分け！'
              }
            </div>
            <div className="result-detail">
              最終合計: <span style={{color: '#ff4444', fontWeight: 900}}>{fmt(sharedTotal)}{unit}</span><br/>💣 リミット: {activeTarget.toLocaleString()}{unit}
            </div>
            <div className="result-ranking">
              {players.map((p, i) => {
                const isLoserP = battleLoser === i;
                const isWinnerP = i === battleWinnerIdx;
                const rankPos = isSelfDestructGlobal ? (isLoserP ? '💥' : '😶') : (isWinnerP ? '🏆' : isLoserP ? '💥' : '👏');
                
                return (
                  <div className="rank-row" key={i}>
                    <div className="rank-pos">{rankPos}</div>
                    <div className="rank-name" style={{ color: p.color }}>{p.emoji} {getPlayerName(p)}</div>
                    <div className="rank-val mono" style={{ color: isLoserP ? '#ff4444' : '#333' }}>選択数: {fmt(p.total)}{unit}</div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {!isMulti && !isBattle && (
          <>
            <div className="result-emoji">{soloResult === 'perfect' ? '🎰' : soloResult === 'win' ? '🎉' : soloResult === 'bust' ? '💥' : '😢'}</div>
            <div className="result-title" style={{ color: soloResult === 'perfect' || soloResult === 'win' ? themeColor : soloResult === 'bust' ? '#ff4444' : '#666' }}>
              {soloResult === 'perfect' ? 'PERFECT!!' : soloResult === 'win' ? 'YOU WIN!' : soloResult === 'bust' ? 'BUST!' : 'YOU LOSE...'}
            </div>
            <div className="result-detail">あなた: {total.toLocaleString()}{unit} {dealerTotal > 0 && ` ／ ディーラー: ${dealerTotal.toLocaleString()}${unit}`}<br/>目標: {activeTarget.toLocaleString()}{unit}</div>
            {(soloResult === 'win' || soloResult === 'perfect') && <div className="result-diff" style={{ color: themeColor }}>差: {Math.abs(total - activeTarget).toLocaleString()}{unit} {soloResult === 'perfect' && '🎯 ボーナス!'}</div>}
          </>
        )}

        <div className="amazon-section">
          <div className="amazon-title">{hasVideo ? "🎧 今回引いた動画を観る" : "🛒 今回引いたカードをAmazonで探す"}</div>
          <div className="amazon-cards">
            {targetHand.slice(0, 3).map((c, i) => (
              <a key={i} href={c.url ? c.url : `https://www.amazon.co.jp/s?k=${encodeURIComponent(c.name)}&tag=ash44-22`} target="_blank" rel="noopener noreferrer" className="amazon-link" style={c.url ? { color: '#cc0000', borderColor: '#ffcccc' } : {}}>
                {c.url ? `▶️ ${c.name} ${c.hint}` : `🔍 ${c.name}`}
              </a>
            ))}
          </div>
        </div>

        <div className="modal-btns">
          <button className="retry-btn" style={isBattle ? { background: '#e63946' } : !isPerfect ? { background: themeColor } : { background: '#222', border: '1px solid #fff' }} onClick={handleRetry}>
            {isBattle ? '⚔️ もう1戦' : 'もう1回'}
          </button>
          <button className="change-btn" onClick={handleBackToTitle}>終了して戻る</button>
        </div>
      </div>
    </div>
  );
}