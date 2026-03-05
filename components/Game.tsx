"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { THEMES, ThemeKey, Card, GameMode } from "../data/themes";
import Confetti from "react-confetti"; 

interface GameProps {
  themeKey: ThemeKey;
  numPlayers: number;
  gameMode: GameMode;
  onBack: () => void;
}

const FIELD_SIZE = 30;
// バトルでも通常でも、この色と名前を使います（最大3人）
const PLAYER_COLORS = ["#e63946", "#2196F3", "#7CFC00"];
const PLAYER_NAMES = ["Player 1", "Player 2", "Player 3"];
const PLAYER_EMOJIS = ["🔴", "🔵", "🟢"];

type Player = { name: string; color: string; emoji: string; hand: Card[]; total: number; stopped: boolean; busted: boolean; diff?: number; isCpu?: boolean; };

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function fmt(v: number) { return v >= 1 ? Math.round(v).toLocaleString() : v < 0.01 ? "0" : v.toFixed(1); }

export default function Game({ themeKey, numPlayers, gameMode, onBack }: GameProps) {
  const t = THEMES[themeKey];
  const isBattle = gameMode === "battle";
  const activeTarget = isBattle ? t.battleTarget : t.target;

  const playSound = (type: 'select' | 'win' | 'lose' | 'perfect' | 'bust') => {
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(err => console.log("音声の再生がブロックされました", err));
  };
  
  const [windowSize, setWindowSize] = useState({ width: 0, height: 0 });

  const [field, setField] = useState<Card[]>([]);
  const [round, setRound] = useState(1);
  const [picking, setPicking] = useState(false);
  const [revealedCardName, setRevealedCardName] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Solo state
  const [hand, setHand] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [score, setScore] = useState(0);
  const [soloResult, setSoloResult] = useState<'win' | 'lose' | 'bust' | 'perfect' | null>(null);
  const [dealerHand, setDealerHand] = useState<Card[]>([]);
  const [dealerTotal, setDealerTotal] = useState(0);

  // Multi / Battle state
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayerIdx, setCurrentPlayerIdx] = useState(0);
  const [isMultiDraw, setIsMultiDraw] = useState(false);
  const [allMultiBust, setAllMultiBust] = useState(false);

  // Battle specific
  const [battleLoser, setBattleLoser] = useState<number | null>(null);
  const [sharedTotal, setSharedTotal] = useState(0);

  // ★ FIX: ゲーム初期化完了フラグ（CPU useEffectの暴発を防ぐ）
  const [gameReady, setGameReady] = useState(false);
  // ★ FIX: CPUが動作中かどうかのフラグ（連続発火を防ぐ）
  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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
    // ★ FIX: 初期化開始時にフラグをリセット
    setGameReady(false);
    if (cpuTimerRef.current) { clearTimeout(cpuTimerRef.current); cpuTimerRef.current = null; }

    const shuffled = shuffleArray(t.cards).slice(0, FIELD_SIZE);
    setField(shuffled);
    setPicking(false);
    setRevealedCardName(null);
    setShowModal(false);
    setBattleLoser(null);
    setSharedTotal(0);

    if (isBattle) {
      const totalBattlePlayers = numPlayers === 1 ? 2 : numPlayers;
      const initialPlayers = Array.from({ length: totalBattlePlayers }).map((_, i) => ({
        name: numPlayers === 1 && i === 1 ? "CPU" : PLAYER_NAMES[i],
        color: PLAYER_COLORS[i],
        emoji: numPlayers === 1 && i === 1 ? "🤖" : PLAYER_EMOJIS[i],
        hand: [], total: 0, stopped: false, busted: false,
        isCpu: numPlayers === 1 && i === 1
      }));
      setPlayers(initialPlayers);
      setCurrentPlayerIdx(0);
    } else if (numPlayers === 1) {
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

    // ★ FIX: 次のレンダーサイクルでgameReadyをtrueにする
    // （setStateは非同期なので、上のstate更新が全部反映された後にreadyにしたい）
    setTimeout(() => setGameReady(true), 100);
  };

  // ★ FIX: pickCardをuseCallbackでメモ化 + refで最新版を保持
const pickCardRef = useRef<((card: Card) => void) | null>(null);

  const pickCard = useCallback((card: Card) => {
    if (picking) return;
    setPicking(true);
    setRevealedCardName(card.name);
    playSound('select');

    setTimeout(() => {
      setField(prev => prev.filter(c => c.name !== card.name));
      setRevealedCardName(null);

      if (isBattle) handleBattlePick(card);
      else if (numPlayers === 1) handleSoloPick(card);
      else handleMultiPick(card);
    }, 400); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, field, players, currentPlayerIdx, total, hand, sharedTotal, isBattle, numPlayers]);

  // refを常に最新のpickCardに更新
  useEffect(() => {
    pickCardRef.current = pickCard;
  }, [pickCard]);

  // ★ FIX: CPUの自動プレイロジック（安全版）
  useEffect(() => {
    // ガード条件：ゲームが準備できていない、またはバトルモードでない場合は何もしない
    if (!gameReady || !isBattle || picking || showModal || battleLoser !== null) return;
    // players配列が空、またはフィールドが空なら何もしない
    if (players.length === 0 || field.length === 0) return;

    const currentPlayer = players[currentPlayerIdx];
    if (!currentPlayer || !currentPlayer.isCpu) return;

    // ★ FIX: 既にタイマーが走っていたら何もしない（連続発火防止）
    if (cpuTimerRef.current) return;

    cpuTimerRef.current = setTimeout(() => {
      cpuTimerRef.current = null;
      // 実行時点でもう一度状態をチェック（stale closure対策でrefを使う）
      if (pickCardRef.current && field.length > 0) {
        const randomIndex = Math.floor(Math.random() * field.length);
        pickCardRef.current(field[randomIndex]);
      }
    }, 1200);

    return () => {
      if (cpuTimerRef.current) { clearTimeout(cpuTimerRef.current); cpuTimerRef.current = null; }
    };
  }, [gameReady, currentPlayerIdx, picking, showModal, field, players, isBattle, battleLoser]);

  // ========== SOLO ==========
  const handleSoloPick = (card: Card) => {
    const newTotal = total + card.value;
    setHand(prev => [...prev, card]);
    setTotal(newTotal);

    if (newTotal > activeTarget) {
      setSoloResult('bust');
      playSound('bust');
      setTimeout(() => setShowModal(true), 500);
    }
    setPicking(false);
  };

  // ========== MULTI (normal) ==========
  const handleMultiPick = (card: Card) => {
    const nextPlayers = [...players];
    const p = { ...nextPlayers[currentPlayerIdx] };
    p.hand = [...p.hand, card];
    p.total += card.value;
    
    if (p.total > activeTarget) {
      p.busted = true;
      p.stopped = true;
      playSound('bust');
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
    // ★ FIX: players.lengthを使う（numPlayersではなく実際のプレイヤー数）
    const playerCount = currentPlayers.length;
    let next = (currentPlayerIdx + 1) % playerCount;
    while (currentPlayers[next].stopped || currentPlayers[next].busted) {
      next = (next + 1) % playerCount;
    }
    setCurrentPlayerIdx(next);
  };

  // ========== BATTLE ==========
  const handleBattlePick = (card: Card) => {
    const nextPlayers = [...players];
    const p = { ...nextPlayers[currentPlayerIdx] };
    p.hand = [...p.hand, card];
    p.total += card.value; 
    nextPlayers[currentPlayerIdx] = p;
    setPlayers(nextPlayers);
    setPicking(false);

    const newSharedTotal = sharedTotal + card.value;
    setSharedTotal(newSharedTotal);

    // バースト判定
    if (newSharedTotal > activeTarget) {
      p.busted = true;
      nextPlayers[currentPlayerIdx] = p;
      setPlayers(nextPlayers);
      setBattleLoser(currentPlayerIdx);

      playSound(p.isCpu ? 'win' : 'lose');
      setTimeout(() => setShowModal(true), 600);
      return;
    }

    const totalDrawnCards = nextPlayers.reduce((sum, player) => sum + player.hand.length, 0);
    if (totalDrawnCards >= FIELD_SIZE) {
      setTimeout(() => setShowModal(true), 600);
      return;
    }

    // 次の人のターンへ
    setTimeout(() => {
      const nextIdx = (currentPlayerIdx + 1) % nextPlayers.length;
      setCurrentPlayerIdx(nextIdx);
    }, 300);
  };

  // ========== STAND (normal modes only) ==========
  const doStand = () => {
    if (picking || isBattle) return;
    if (numPlayers === 1) {
      if (soloResult) return;
      
      const sortedField = [...field].sort((a, b) => b.value - a.value);
      let dTotal = 0;
      let dHand: Card[] = [];
      for (const c of sortedField) {
        if (dTotal + c.value <= activeTarget) { dHand.push(c); dTotal += c.value; }
        if (dTotal >= total) break;
      }
      if (dTotal < total) {
        for (const c of sortedField) {
          if (!dHand.includes(c) && dTotal + c.value <= activeTarget) {
            dHand.push(c); dTotal += c.value;
            if (dTotal >= total) break;
          }
        }
      }

      setDealerHand(dHand);
      setDealerTotal(dTotal);

      setTimeout(() => {
        const pDiff = Math.abs(total - activeTarget);
        const dDiff = Math.abs(dTotal - activeTarget);
        let res: 'win' | 'lose' | 'perfect' = 'lose';
        
        if (dTotal > activeTarget) {
          setScore(s => s + Math.max(Math.round((1 - pDiff / activeTarget) * 1000), 100));
          res = 'win';
        } else if (pDiff <= dDiff) {
          setScore(s => s + Math.max(Math.round((1 - pDiff / activeTarget) * 1000), 100) + (pDiff === 0 ? 500 : 0));
          res = pDiff === 0 ? 'perfect' : 'win';
        }
        setSoloResult(res);
        playSound(res);
        setShowModal(true);
      }, 1200);

    } else {
      const nextPlayers = [...players];
      nextPlayers[currentPlayerIdx].stopped = true;
      setPlayers(nextPlayers);
      advanceTurn(nextPlayers);
    }
  };

  // ========== MULTI RESULT ==========
  const checkMultiResult = (finalPlayers: Player[]) => {
    const ranked = [...finalPlayers].map(p => ({ ...p, diff: Math.abs(p.total - activeTarget) })).sort((a, b) => {
      if (a.busted && !b.busted) return 1;
      if (!a.busted && b.busted) return -1;
      return a.diff - b.diff;
    });
    
    const isAllBust = ranked.every(r => r.busted);
    setAllMultiBust(isAllBust);
    setIsMultiDraw(!ranked[0].busted && ranked.length > 1 && !ranked[1].busted && ranked[0].diff === ranked[1].diff);
    setPlayers(ranked); 

    if (isAllBust) {
      playSound('lose');
    } else if (ranked[0].diff === 0 && !ranked[0].busted) {
      playSound('perfect');
    } else {
      playSound('win');
    }

    setTimeout(() => setShowModal(true), 500);
  };

  // ========== RENDER HELPERS ==========
  const isMulti = numPlayers > 1 || isBattle;
  const isSoloBust = soloResult === 'bust';
  const soloRatio = activeTarget > 0 ? Math.min((total / activeTarget) * 100, 100) : 0;
  
  const showStandBtn = !isBattle && (
    isMulti 
      ? (!players[currentPlayerIdx]?.busted && players[currentPlayerIdx]?.hand.length > 0)
      : (!soloResult && hand.length > 0)
  );

  const isPerfect = !isMulti && soloResult === 'perfect';
  const isWin = (!isMulti && soloResult === 'win') || (isMulti && !isBattle && !allMultiBust && !isMultiDraw);
  const battleEnded = isBattle && battleLoser !== null;
  const showField = isBattle ? !battleEnded : (!soloResult && !showModal);

  let modalAnimationClass = "";
  if (isPerfect) modalAnimationClass = "perfect-modal";
  else if (battleEnded && !(numPlayers === 1 && battleLoser === 0)) modalAnimationClass = "win-modal";
  else if (isWin) modalAnimationClass = "win-modal";

  return (
    <div id="game">
      
      {showModal && (isPerfect || isWin || (battleEnded && !(numPlayers === 1 && battleLoser === 0))) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 101, pointerEvents: 'none' }}>
          <Confetti 
            width={windowSize.width} 
            height={windowSize.height} 
            numberOfPieces={isPerfect ? 800 : 250} 
            recycle={isPerfect} 
            gravity={isPerfect ? 0.3 : 0.15}
          />
        </div>
      )}

      {/* ★ 追従する（固定）エリア */}
      <div className="sticky-header">
        <div className="top-bar">
          <button className="back-btn" onClick={onBack}>← タイトルへ戻る</button>
          {!isMulti && <div className="round-info mono">ROUND {round}｜{score}pt</div>}
          {isBattle && <div className="round-info mono" style={{ color: '#e63946' }}>⚔️ BATTLE</div>}
        </div>

        {/* ターン表示 */}
        {isMulti && !showModal && !battleEnded && (
          <div 
            className={`turn-indicator ${isBattle ? 'battle-turn' : ''}`}
            style={{ 
              color: players[currentPlayerIdx]?.color, 
              border: `2px solid ${players[currentPlayerIdx]?.color}66`,
              background: isBattle ? `${players[currentPlayerIdx]?.color}08` : '#ffffff'
            }}
          >
            {players[currentPlayerIdx]?.emoji} {players[currentPlayerIdx]?.name} のターン
            {isBattle && <span className="battle-turn-sub">（必ず1枚選んでください）</span>}
          </div>
        )}

        {/* バトルモード用：デカい共通の爆弾ゲージ！ */}
        {isBattle && (
          <div className="score-panel" style={{ borderColor: '#e63946', marginBottom: '8px' }}>
            <div className="score-header">
              <div className="left"><span className="emoji">💣</span><span className="name" style={{color: '#e63946'}}>SHARED LIMIT</span></div>
              <div className="target mono" style={{ color: '#e63946' }}>LIMIT {activeTarget.toLocaleString()}{t.unit}</div>
            </div>
            <div className="gauge">
              <div className="gauge-fill" style={{ width: `${Math.min((sharedTotal / activeTarget) * 100, 100)}%`, background: sharedTotal > activeTarget ? '#ff4444' : '#e63946' }}></div>
              <div className="gauge-text mono">{fmt(sharedTotal)} / {activeTarget.toLocaleString()}</div>
            </div>
            <div className="total-display">
              <span className="total-num mono" style={{ color: sharedTotal > activeTarget ? '#ff4444' : '#222' }}>{fmt(sharedTotal)}</span>
              <span className="total-unit">{t.unit}</span>
              <span className="total-remain" style={{ color: activeTarget - sharedTotal < 0 ? '#ff4444' : '#e67e22' }}>
                {activeTarget - sharedTotal < 0 ? '💥 超過！' : `(あと ${Math.max(0, activeTarget - sharedTotal).toLocaleString()})`}
              </span>
            </div>
          </div>
        )}

        {/* Player panels */}
        {isMulti && (
          <div className="players-area">
            {players.map((p, i) => {
              const activeClass = i === currentPlayerIdx && !p.stopped && !p.busted && !battleEnded ? 'active' : '';
              const stoppedClass = p.stopped || p.busted || (battleEnded && battleLoser === i) ? 'stopped' : '';
              return (
                <div key={i} className={`player-panel ${activeClass} ${stoppedClass}`} style={{ borderColor: activeClass ? p.color : '' }}>
                  <div className="p-name" style={{ color: p.color }}>{p.emoji} {p.name}</div>
                  
                  {isBattle ? (
                    <>
                      <div className="p-remain" style={{ color: '#888', marginTop: '2px', fontSize: '11px' }}>
                        合計: {fmt(p.total)}{t.unit}（{p.hand.length}枚）
                      </div>
                      {/* バトル用：選んだカード一覧（コンパクト表示） */}
                      {p.hand.length > 0 && (
                        <div className="battle-hand">
                          {p.hand.map((c, ci) => (
                            <div key={ci} className="battle-hand-card" style={{ borderColor: `${p.color}33` }}>
                              <span className="battle-hand-name">{c.name}</span>
                              <span className="battle-hand-val mono" style={{ color: p.color }}>{c.value.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {battleEnded && battleLoser !== i && <div className="p-status" style={{ color: p.color, fontSize: '12px' }}>🏆 SURVIVE!</div>}
                      {battleEnded && battleLoser === i && <div className="p-status" style={{ color: '#ff4444', fontSize: '12px' }}>💥 踏んだ…</div>}
                    </>
                  ) : (
                    <>
                      <div className="p-total mono" style={{ color: p.busted ? '#ff4444' : '#333' }}>
                        {fmt(p.total)}<span className="p-unit">{t.unit}</span>
                      </div>
                      <div className="p-remain" style={{ color: p.busted ? '#ff4444' : (activeTarget - p.total) < activeTarget * 0.2 ? '#e63946' : '#e67e22' }}>
                        {p.busted ? '💥 バースト！' : p.stopped ? '✋ ストップ' : p.total > 0 ? `あと${Math.max(0, activeTarget - p.total).toLocaleString()}${t.unit}` : '─'}
                      </div>
                      <div className="p-gauge"><div className="p-gauge-fill" style={{ width: `${activeTarget > 0 ? Math.min(p.total / activeTarget, 1) * 100 : 0}%`, background: p.busted ? '#ff4444' : p.color }}></div></div>
                      {(p.stopped || p.busted) && <div className="p-status" style={{ color: p.busted ? '#ff4444' : p.color }}>{p.busted ? '💥 バースト' : '✋ ストップ'}</div>}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
        {!isMulti && (
        <div className="score-panel">
            <div className="score-header">
              <div className="left"><span className="emoji">{t.emoji}</span><span className="name">{t.name}</span></div>
              <div className="target mono" style={{ color: t.color }}>TARGET {activeTarget.toLocaleString()}{t.unit}</div>
            </div>
            <div className="gauge">
              <div className="gauge-fill" style={{ width: `${isSoloBust ? 100 : soloRatio}%`, background: isSoloBust ? '#ff4444' : t.color }}></div>
              <div className="gauge-text mono">{fmt(total)} / {activeTarget.toLocaleString()}</div>
            </div>
            <div className="total-display">
              <span className="total-num mono" style={{ color: isSoloBust ? '#ff4444' : '#222' }}>{fmt(total)}</span>
              <span className="total-unit">{t.unit}</span>
              {!soloResult && total > 0 && (
                <span className="total-remain" style={{ color: activeTarget - total < 0 ? '#ff4444' : '#e67e22' }}>
                  (あと{Math.max(0, activeTarget - total).toLocaleString()})
                </span>
              )}
            </div>
          </div>
        )}
      </div> 
      {/* ★ 追従エリアここまで */}

      {/* Solo hand */}
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

      {/* Solo dealer */}
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

      {/* Field */}
      {showField && (
        <div>
          <div className="section-title">
            {isBattle ? `⚔️ SELECT A CARD（残り${field.length}枚）` : `SELECT A CARD（残り${field.length}枚）`}
          </div>
          <div className="field">
            {field.map((c) => {
              const isRevealed = revealedCardName === c.name;
              const revealColor = isMulti ? players[currentPlayerIdx]?.color : t.color;
              return (
                <button
                  key={c.name}
                  className={`field-card ${isRevealed ? 'revealed' : ''}`}
                  // ★ CPUのターン中は人間がクリックできないようにブロック！
                  disabled={picking || battleEnded || (!isMulti && !!soloResult) || (isMulti && !isBattle && players[currentPlayerIdx]?.stopped) || (players[currentPlayerIdx]?.isCpu ?? false)}
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

      {/* Stand button (normal modes only) */}
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

      {/* ========== RESULT MODAL ========== */}
      <div className={`modal-bg ${showModal ? 'active' : ''}`}>
        <div className={`modal ${modalAnimationClass}`} style={{ 
          borderColor: isBattle 
            ? (battleLoser !== null ? '#e63946' : '#888') 
            : isMulti 
              ? (allMultiBust ? '#ff4444' : players[0]?.color) 
              : (soloResult === 'bust' ? '#ff4444' : t.color) 
        }}>
          
          {/* BATTLE RESULT */}
          {isBattle && (
            <>
              <div className="result-emoji">{battleLoser !== null ? '💥' : '🤝'}</div>
              <div className="result-title">
                {battleLoser !== null 
                  ? (
                    <>
                      <span style={{ fontSize: '16px', color: '#ff4444', display: 'block', marginBottom: '4px' }}>
                        {players[battleLoser]?.name} がドカン！💥
                      </span>
                      <span style={{ color: players.length === 2 ? players[battleLoser === 0 ? 1 : 0]?.color : '#e67e22' }}>
                        {players.length === 2
                          ? `${players[battleLoser === 0 ? 1 : 0]?.name} の勝ち！`
                          : '生存者の勝ち！'
                        }
                      </span>
                    </>
                  )
                  : '引き分け！'
                }
              </div>
              <div className="result-detail">
                最終合計: <span style={{color: '#ff4444', fontWeight: 900}}>{fmt(sharedTotal)}{t.unit}</span><br/>
                💣 リミット: {activeTarget.toLocaleString()}{t.unit}
              </div>
              <div className="result-ranking">
                {players.map((p, i) => {
                  const isLoserP = battleLoser === i;
                  const isWinnerP = battleLoser !== null && !isLoserP;
                  return (
                    <div className="rank-row" key={i}>
                      <div className="rank-pos">{isWinnerP ? '🏆' : '💥'}</div>
                      <div className="rank-name" style={{ color: p.color }}>{p.emoji} {p.name}</div>
                      <div className="rank-val mono" style={{ color: isLoserP ? '#ff4444' : '#333' }}>
                        選択数: {fmt(p.total)}{t.unit}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {/* SOLO RESULT */}
          {!isMulti && !isBattle && (
            <>
              <div className="result-emoji">{soloResult === 'perfect' ? '🎰' : soloResult === 'win' ? '🎉' : soloResult === 'bust' ? '💥' : '😢'}</div>
              <div className="result-title" style={{ color: soloResult === 'perfect' || soloResult === 'win' ? t.color : soloResult === 'bust' ? '#ff4444' : '#666' }}>
                {soloResult === 'perfect' ? 'PERFECT!!' : soloResult === 'win' ? 'YOU WIN!' : soloResult === 'bust' ? 'BUST!' : 'YOU LOSE...'}
              </div>
              <div className="result-detail">
                あなた: {total.toLocaleString()}{t.unit}
                {dealerTotal > 0 && ` ／ ディーラー: ${dealerTotal.toLocaleString()}${t.unit}`}<br/>
                目標: {activeTarget.toLocaleString()}{t.unit}
              </div>
              {(soloResult === 'win' || soloResult === 'perfect') && (
                <div className="result-diff" style={{ color: t.color }}>
                  差: {Math.abs(total - activeTarget).toLocaleString()}{t.unit} {soloResult === 'perfect' && '🎯 ボーナス!'}
                </div>
              )}
            </>
          )}

          {/* MULTI RESULT (normal) */}
          {isMulti && !isBattle && (
            <>
              <div className="result-emoji">{allMultiBust ? '💥' : isMultiDraw ? '🤝' : '🏆'}</div>
              <div className="result-title" style={{ color: allMultiBust ? '#ff4444' : isMultiDraw ? '#e67e22' : players[0]?.color }}>
                {allMultiBust ? '全員バースト！' : isMultiDraw ? '引き分け！' : `${players[0]?.emoji} ${players[0]?.name} の勝ち！`}
              </div>
              <div className="result-detail">目標: {activeTarget.toLocaleString()}{t.unit}</div>
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

          {/* ★ Amazonアフィリエイト枠 ★ */}
          <div className="amazon-section">
            <div className="amazon-title">🛒 今回引いたカードをAmazonで探す</div>
            <div className="amazon-cards">
              {(isMulti ? players[0]?.hand ?? [] : hand).slice(0, 3).map((c, i) => (
                <a 
                  key={i} 
                  href={`https://www.amazon.co.jp/s?k=${encodeURIComponent(c.name)}&tag=ash44-22`} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="amazon-link"
                >
                  🔍 {c.name}
                </a>
              ))}
            </div>
          </div>

          <div className="modal-btns">
            <button className="retry-btn" style={
              isBattle 
                ? { background: '#e63946' }
                : !isPerfect 
                  ? { background: t.color } 
                  : { background: '#222', border: '1px solid #fff' }
            } onClick={() => setRound(r => r + 1)}>
              {isBattle ? '⚔️ もう1戦' : 'もう1回'}
            </button>
            <button className="change-btn" onClick={onBack}>テーマ変更</button>
          </div>
        </div>
      </div>

    </div>
  );
}