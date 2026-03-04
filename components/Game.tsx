"use client";

import { useState, useEffect } from "react";
import { THEMES, ThemeKey, Card } from "@/data/themes";
import Confetti from "react-confetti"; // ★ 紙吹雪ライブラリを読み込み

interface GameProps {
  themeKey: ThemeKey;
  numPlayers: number;
  onBack: () => void;
}

const FIELD_SIZE = 28;
const PLAYER_COLORS = ["#00BFFF", "#FF6EC7", "#7CFC00"];
const PLAYER_NAMES = ["Player 1", "Player 2", "Player 3"];
const PLAYER_EMOJIS = ["🔵", "🩷", "🟢"];

type Player = { name: string; color: string; emoji: string; hand: Card[]; total: number; stopped: boolean; busted: boolean; diff?: number; };

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function fmt(v: number) { return v >= 1 ? Math.round(v).toLocaleString() : v < 0.01 ? "0" : v.toFixed(1); }

export default function Game({ themeKey, numPlayers, onBack }: GameProps) {
  const t = THEMES[themeKey];
  
  // 画面サイズ（紙吹雪用）
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [field, setField] = useState<Card[]>([]);
  const [round, setRound] = useState(1);
  const [picking, setPicking] = useState(false);
  const [revealedCardName, setRevealedCardName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  const [hand, setHand] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [score, setScore] = useState(0);
  const [soloResult, setSoloResult] = useState<'win' | 'lose' | 'bust' | 'perfect' | null>(null);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [dealerTotal, setDealerTotal] = useState(0);

  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [isMultiDraw, setIsMultiDraw] = useState(false);
  const [allMultiBust, setAllMultiBust] = useState(false);

  // 画面サイズを取得（画面リサイズにも対応）
  useEffect(() => {
    setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    const handleResize = () => setWindowSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    initGame();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round]);

  const initGame = () => {
    const shuffled = shuffleArray(t.cards).slice(0, FIELD_SIZE);
    setField(shuffled);
    setPicking(false);
    setRevealedCardName(null);
    setShowModal(false);

    if (numPlayers === 1) {
      setHand([]); setTotal(0); setSoloResult(null);
      setDealerHand([]); setDealerTotal(0);
    } else {
      const initialPlayers = Array.from({ length: numPlayers }).map((_, i) => ({
        name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], emoji: PLAYER_EMOJIS[i],
        hand: [], total: 0, stopped: false, busted: false
      }));
      setPlayers(initialPlayers);
      setCurrentPlayerIdx(0);
    }
  };

  const pickCard = (card: Card) => {
    if (picking) return;
    setPicking(true);
    setRevealedCardName(card.name);

    setTimeout(() => {
      setField(prev => prev.filter(c => c.name !== card.name));
      setRevealedCardName(null);

      if (numPlayers === 1) handleSoloPick(card);
      else handleMultiPick(card);
    }, 400); 
  };

  const handleSoloPick = (card: Card) => {
    const newTotal = total + card.value;
    setHand(prev => [...prev, card]);
    setTotal(newTotal);

    if (newTotal > t.target) {
      setSoloResult('bust');
      setTimeout(() => setShowModal(true), 500);
    }
    setPicking(false);
  };

  const handleMultiPick = (card: Card) => {
    let nextPlayers = [...players];
    const p = { ...nextPlayers[currentPlayerIdx] };
    p.hand = [...p.hand, card];
    p.total += card.value;
    
    if (p.total > t.target) {
      p.busted = true;
      p.stopped = true;
    }
    nextPlayers[currentPlayerIdx] = p;
    setPlayers(nextPlayers);
    setPicking(false);

    setTimeout(() => advanceTurn(nextPlayers), 300); 
  };

  const advanceTurn = (currentPlayers: Player[]) => {
    const allDone = currentPlayers.every(p => p.stopped || p.busted);
    if (allDone) {
      checkMultiResult(currentPlayers);
      return;
    }
    let next = (currentPlayerIdx + 1) % numPlayers;
    while (currentPlayers[next].stopped || currentPlayers[next].busted) {
      next = (next + 1) % numPlayers;
    }
    setCurrentPlayerIdx(next);
  };

  const doStand = () => {
    if (picking) return;
    if (numPlayers === 1) {
      if (soloResult) return;
      
      const sortedField = [...field].sort((a, b) => b.value - a.value);
      let dTotal = 0;
      let dHand: Card[] = [];
      for (const c of sortedField) {
        if (dTotal + c.value <= t.target) { dHand.push(c); dTotal += c.value; }
        if (dTotal >= total) break;
      }
      if (dTotal < total) {
        for (const c of sortedField) {
          if (!dHand.includes(c) && dTotal + c.value <= t.target) {
            dHand.push(c); dTotal += c.value;
            if (dTotal >= total) break;
          }
        }
      }

      setDealerHand(dHand);
      setDealerTotal(dTotal);

      setTimeout(() => {
        const pDiff = Math.abs(total - t.target);
        const dDiff = Math.abs(dTotal - t.target);
        let res: 'win' | 'lose' | 'perfect' = 'lose';
        
        if (dTotal > t.target) {
          setScore(s => s + Math.max(Math.round((1 - pDiff / t.target) * 1000), 100));
          res = 'win';
        } else if (pDiff <= dDiff) {
          setScore(s => s + Math.max(Math.round((1 - pDiff / t.target) * 1000), 100) + (pDiff === 0 ? 500 : 0));
          res = pDiff === 0 ? 'perfect' : 'win';
        }
        setSoloResult(res);
        setShowModal(true);
      }, 1200);

    } else {
      let nextPlayers = [...players];
      nextPlayers[currentPlayerIdx].stopped = true;
      setPlayers(nextPlayers);
      advanceTurn(nextPlayers);
    }
  };

  const checkMultiResult = (finalPlayers: Player[]) => {
    const ranked = [...finalPlayers].map(p => ({ ...p, diff: Math.abs(p.total - t.target) })).sort((a, b) => {
      if (a.busted && !b.busted) return 1;
      if (!a.busted && b.busted) return -1;
      return a.diff - b.diff;
    });
    
    setAllMultiBust(ranked.every(r => r.busted));
    setIsMultiDraw(!ranked[0].busted && ranked.length > 1 && !ranked[1].busted && ranked[0].diff === ranked[1].diff);
    setPlayers(ranked); 
    setTimeout(() => setShowModal(true), 500);
  };

  const isMulti = numPlayers > 1;
  const isSoloBust = soloResult === 'bust';
  const soloRatio = t.target > 0 ? Math.min((total / t.target) * 100, 100) : 0;
  const showStandBtn = isMulti 
    ? (!players[currentPlayerIdx]?.busted && players[currentPlayerIdx]?.hand.length > 0)
    : (!soloResult && hand.length > 0);

  // ★ 演出用：勝利状態かどうかを判定
  const isPerfect = !isMulti && soloResult === 'perfect';
  const isWin = (!isMulti && soloResult === 'win') || (isMulti && !allMultiBust && !isMultiDraw);

  // ★ 演出用：モーダルに付与する特殊クラス
  let modalAnimationClass = "";
  if (isPerfect) modalAnimationClass = "perfect-modal";
  else if (isWin) modalAnimationClass = "win-modal";

  return (
    <div id="game">
      
      {/* ★ 紙吹雪レイヤー（勝利時のみ表示、最前面） */}
      {showModal && (isPerfect || isWin) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 101, pointerEvents: 'none' }}>
          <Confetti 
            width={windowSize.width} 
            height={windowSize.height} 
            numberOfPieces={isPerfect ? 800 : 250} // パーフェクトは爆量！
            recycle={isPerfect} // パーフェクトはずっと降り続ける、Winは1回で終了
            gravity={isPerfect ? 0.3 : 0.15}
          />
        </div>
      )}

      <div className="top-bar">
        <button className="back-btn" onClick={onBack}>← タイトルへ戻る</button>
        {!isMulti && <div className="round-info mono">ROUND {round}｜{score}pt</div>}
      </div>

      {isMulti && !showModal && (
        <div className="turn-indicator" style={{ color: players[currentPlayerIdx]?.color, border: `2px solid ${players[currentPlayerIdx]?.color}66` }}>
          {players[currentPlayerIdx]?.emoji} {players[currentPlayerIdx]?.name} のターン
        </div>
      )}

      {isMulti ? (
        <div className="players-area">
          {players.map((p, i) => {
            const ratio = t.target > 0 ? Math.min(p.total / t.target, 1) * 100 : 0;
            const gColor = p.busted ? '#ff4444' : p.color;
            const activeClass = i === currentPlayerIdx && !p.stopped && !p.busted ? 'active' : '';
            const stoppedClass = p.stopped || p.busted ? 'stopped' : '';
            return (
              <div key={i} className={`player-panel ${activeClass} ${stoppedClass}`} style={{ borderColor: activeClass ? p.color : '' }}>
                <div className="p-name" style={{ color: p.color }}>{p.emoji} {p.name}</div>
                <div className="p-total mono" style={{ color: p.busted ? '#ff4444' : '#333' }}>
                  {fmt(p.total)}<span className="p-unit">{t.unit}</span>
                </div>
                <div className="p-remain">{p.busted ? 'BUST!' : p.stopped ? 'STOP' : p.total > 0 ? `あと${Math.max(0, t.target - p.total).toLocaleString()}` : '─'}</div>
                <div className="p-gauge"><div className="p-gauge-fill" style={{ width: `${ratio}%`, background: gColor }}></div></div>
                {(p.stopped || p.busted) && <div className="p-status" style={{ color: gColor }}>{p.busted ? '💥 バースト' : '✋ ストップ'}</div>}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="score-panel">
          <div className="score-header">
            <div className="left"><span className="emoji">{t.emoji}</span><span className="name">{t.name}</span></div>
            <div className="target mono" style={{ color: t.color }}>TARGET {t.target.toLocaleString()}{t.unit}</div>
          </div>
          <div className="gauge">
            <div className="gauge-fill" style={{ width: `${isSoloBust ? 100 : soloRatio}%`, background: isSoloBust ? '#ff4444' : t.color }}></div>
            <div className="gauge-text mono">{fmt(total)} / {t.target.toLocaleString()}</div>
          </div>
          <div className="total-display">
            <span className="total-num mono" style={{ color: isSoloBust ? '#ff4444' : '#222' }}>{fmt(total)}</span>
            <span className="total-unit">{t.unit}</span>
            {!soloResult && total > 0 && <span className="total-remain" style={{ color: t.target - total < 0 ? '#ff4444' : '#888' }}>(あと{Math.max(0, t.target - total).toLocaleString()})</span>}
          </div>
        </div>
      )}

      {!isMulti && hand.length > 0 && (
        <div>
          <div className="section-title">YOUR HAND ({hand.length})</div>
          <div className="hand-cards">
            {hand.map((c, i) => (
              <div key={i} className="hand-card" style={{ border: `1.5px solid ${t.color}66` }}>
                <div className="hname">{c.name}</div>
                <div className="hval mono" style={{ color: t.color }}>{c.value.toLocaleString()}<span className="hunit">{t.unit}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}
      {!isMulti && dealerHand.length > 0 && (
        <div>
          <div className="section-title">DEALER ({dealerTotal.toLocaleString()}{t.unit})</div>
          <div className="hand-cards">
            {dealerHand.map((c, i) => (
              <div key={i} className="hand-card" style={{ border: `1.5px solid ${t.color}66` }}>
                <div className="hname">{c.name}</div>
                <div className="hval mono" style={{ color: t.color }}>{c.value.toLocaleString()}<span className="hunit">{t.unit}</span></div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(!soloResult && !showModal) && (
        <div>
          <div className="section-title">SELECT A CARD（残り{field.length}枚）</div>
          <div className="field">
            {field.map((c) => {
              const isRevealed = revealedCardName === c.name;
              const revealColor = isMulti ? players[currentPlayerIdx]?.color : t.color;
              return (
                <button
                  key={c.name}
                  className={`field-card ${isRevealed ? 'revealed' : ''}`}
                  disabled={picking || (!isMulti && !!soloResult) || (isMulti && players[currentPlayerIdx]?.stopped)}
                  onClick={() => pickCard(c)}
                  style={isRevealed ? { borderColor: revealColor, background: `${revealColor}15` } : {}}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fname" style={{ color: isRevealed ? revealColor : '' }}>{c.name}</div>
                    <div className="fhint">{c.hint}</div>
                  </div>
                  {isRevealed ? (
                    <div className="fval" style={{ color: revealColor }}>{c.value.toLocaleString()}<span className="fu">{t.unit}</span></div>
                  ) : (
                    <div className="fq">？</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showStandBtn && !showModal && (
        <div className="stand-area">
          <button 
            className="stand-btn" 
            onClick={doStand}
            style={{ background: isMulti ? players[currentPlayerIdx]?.color : t.color }}
          >
            ✋ {isMulti ? 'ストップ！' : 'この合計でストップ！'}
          </button>
        </div>
      )}

      {/* リザルトモーダル */}
      <div className={`modal-bg ${showModal ? 'active' : ''}`}>
        {/* ★ 動的にアニメーションクラスを付与 */}
        <div className={`modal ${modalAnimationClass}`} style={{ borderColor: isMulti ? (allMultiBust ? '#ff4444' : players[0]?.color) : (soloResult === 'bust' ? '#ff4444' : t.color) }}>
          
          {!isMulti && (
            <>
              <div className="result-emoji">{soloResult === 'perfect' ? '🎰' : soloResult === 'win' ? '🎉' : soloResult === 'bust' ? '💥' : '😢'}</div>
              <div className="result-title" style={{ color: soloResult === 'perfect' || soloResult === 'win' ? t.color : soloResult === 'bust' ? '#ff4444' : '#666' }}>
                {soloResult === 'perfect' ? 'PERFECT!!' : soloResult === 'win' ? 'YOU WIN!' : soloResult === 'bust' ? 'BUST!' : 'YOU LOSE...'}
              </div>
              <div className="result-detail">
                あなた: {total.toLocaleString()}{t.unit}
                {dealerTotal > 0 && ` ／ ディーラー: ${dealerTotal.toLocaleString()}${t.unit}`}<br/>
                目標: {t.target.toLocaleString()}{t.unit}
              </div>
              {(soloResult === 'win' || soloResult === 'perfect') && (
                <div className="result-diff" style={{ color: t.color }}>
                  差: {Math.abs(total - t.target).toLocaleString()}{t.unit} {soloResult === 'perfect' && '🎯 ボーナス!'}
                </div>
              )}
            </>
          )}

          {isMulti && (
            <>
              <div className="result-emoji">{allMultiBust ? '💥' : isMultiDraw ? '🤝' : '🏆'}</div>
              <div className="result-title" style={{ color: allMultiBust ? '#ff4444' : isMultiDraw ? '#e67e22' : players[0]?.color }}>
                {allMultiBust ? '全員バースト！' : isMultiDraw ? '引き分け！' : `${players[0]?.emoji} ${players[0]?.name} の勝ち！`}
              </div>
              <div className="result-detail">目標: {t.target.toLocaleString()}{t.unit}</div>
              <div className="result-ranking">
                {players.map((p, i) => (
                  <div className="rank-row" key={i}>
                    <div className="rank-pos">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</div>
                    <div className="rank-name" style={{ color: p.color }}>{p.emoji} {p.name}</div>
                    <div className="rank-val mono" style={{ color: p.busted ? '#ff4444' : '#333' }}>
                      {fmt(p.total)}{t.unit} {p.busted ? '💥' : <span style={{fontSize:'11px', color:'#888'}}>(差:{p.diff?.toLocaleString()})</span>}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          <div className="modal-btns">
            {/* ★ ここだけインラインスタイルで背景を固定しないように className で制御（アニメーション優先のため） */}
            <button className="retry-btn" style={!isPerfect ? { background: t.color } : { background: '#222', border: '1px solid #fff' }} onClick={() => setRound(r => r + 1)}>もう1回</button>
            <button className="change-btn" onClick={onBack}>テーマ変更</button>
          </div>
        </div>
      </div>

    </div>
  );
}