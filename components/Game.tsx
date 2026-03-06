"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { THEMES, ThemeKey, Card, GameMode } from "../data/themes";
import Confetti from "react-confetti"; 
import { supabase } from "@/lib/supabase";

interface GameProps {
  themeKey: ThemeKey;
  numPlayers: number;
  gameMode: GameMode;
  multiplier: number; 
  fieldSize: number;  
  onBack: () => void;
  roomId?: string;
  myPlayerId?: string | null;
}

const PLAYER_COLORS = ["#FF4B00", "#005AFF", "#03AF7A", "#990099", "#F6AA00"];
const PLAYER_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"];
const PLAYER_EMOJIS = ["🔴", "🔵", "🟢", "🟣", "🟠"];

type Player = { id?: string; name: string; color: string; emoji: string; hand: Card[]; total: number; stopped: boolean; busted: boolean; diff?: number; isCpu?: boolean; isHost?: boolean; };

function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}
function fmt(v: number) { return v >= 1 ? Math.round(v).toLocaleString() : v < 0.01 ? "0" : v.toFixed(1); }

export default function Game({ themeKey, numPlayers, gameMode, multiplier, fieldSize, onBack, roomId, myPlayerId }: GameProps) {
  const t = THEMES[themeKey];
  const isBattle = gameMode === "battle" || !!roomId; 
  const activeTarget = Math.floor(t.target * multiplier);
  const isOnline = !!roomId && !!myPlayerId;

  const getPlayerName = (p: Player | undefined) => {
    if (!p) return "";
    return (isOnline && p.id === myPlayerId) ? "あなた" : p.name;
  };

  const playSound = (type: 'select' | 'win' | 'lose' | 'perfect' | 'bust') => {
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.volume = 0.5;
    audio.play().catch(() => {});
  };
  
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
  const [battleLoser, setBattleLoser] = useState<number | null>(null);
  const [sharedTotal, setSharedTotal] = useState(0);

  const [gameReady, setGameReady] = useState(false);
  const [timeLeft, setTimeLeft] = useState(15);

  const cpuTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMyTurn = isOnline ? players[currentPlayerIdx]?.id === myPlayerId : true;
  const amIHost = isOnline ? players.find(p => p.id === myPlayerId)?.isHost : true;

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
    setGameReady(false);
    if (cpuTimerRef.current) { clearTimeout(cpuTimerRef.current); cpuTimerRef.current = null; }

    setPicking(false);
    setRevealedCardName(null);
    setShowModal(false);
    setBattleLoser(null);
    setSharedTotal(0);
    setTimeLeft(15);

    if (!isOnline) {
      const shuffled = shuffleArray(t.cards).slice(0, fieldSize);
      setField(shuffled);
      if (isBattle) {
        const totalBattlePlayers = numPlayers === 1 ? 2 : numPlayers;
        const initialPlayers = Array.from({ length: totalBattlePlayers }).map((_, i) => ({
          name: numPlayers === 1 && i === 1 ? "CPU" : PLAYER_NAMES[i],
          color: PLAYER_COLORS[i], emoji: numPlayers === 1 && i === 1 ? "🤖" : PLAYER_EMOJIS[i],
          hand: [], total: 0, stopped: false, busted: false, isCpu: numPlayers === 1 && i === 1
        }));
        setPlayers(initialPlayers);
        setCurrentPlayerIdx(0);
      } else if (numPlayers === 1) {
        setHand([]); setTotal(0); setSoloResult(null); setDealerHand([]); setDealerTotal(0);
      } else {
        const initialPlayers = Array.from({ length: numPlayers }).map((_, i) => ({
          name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], emoji: PLAYER_EMOJIS[i],
          hand: [], total: 0, stopped: false, busted: false
        }));
        setPlayers(initialPlayers);
        setCurrentPlayerIdx(0);
      }
    }
    setTimeout(() => setGameReady(true), 100);
  };

  useEffect(() => {
    if (!isOnline || !roomId) return;
    const syncGameState = (data: any) => {
      if (!data) return;
      setField(data.field_cards || []);
      const dbPlayers = data.players || [];
      const mappedPlayers = dbPlayers.map((p: any, i: number) => ({
        ...p, hand: p.hand || [], total: p.total || 0, busted: p.busted || false,
        color: p.color || PLAYER_COLORS[i % 5], emoji: p.emoji || (p.isHost ? "👑" : PLAYER_EMOJIS[i % 5]),
      }));
      setPlayers(mappedPlayers);
      const newSharedTotal = mappedPlayers.reduce((sum: number, p: any) => sum + p.total, 0);
      setSharedTotal(newSharedTotal);

      const loserIdx = mappedPlayers.findIndex((p: any) => p.busted);
      if (loserIdx !== -1) {
        setBattleLoser(loserIdx);
      } else {
        setBattleLoser(null);
        setShowModal(false);
        const cardsDrawn = mappedPlayers.reduce((sum: number, p: any) => sum + (p.hand?.length || 0), 0);
        setCurrentPlayerIdx(cardsDrawn % mappedPlayers.length);
        if (cardsDrawn >= (data.field_size || 30) && cardsDrawn > 0) {
           setTimeout(() => setShowModal(true), 600);
        }
      }
    };

    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      syncGameState(data);
    };
    fetchRoom();

    const channel = supabase.channel(`game-${roomId}`).on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
      syncGameState(payload.new);
    }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOnline, roomId]);

  useEffect(() => {
    if (isOnline && battleLoser !== null) {
      const amILoser = players[battleLoser]?.id === myPlayerId;
      
      // ★ 1枚目で自爆したかどうかの判定を追加！
      const totalDrawn = players.reduce((sum, p) => sum + (p.hand?.length || 0), 0);
      const isSelfDestruct = totalDrawn === 1;

      if (amILoser) {
        playSound('bust'); 
      } else if (isSelfDestruct) {
        playSound('lose'); // 自爆の時は勝者がいないので、それ以外はLose音
      } else {
        const winnerIdx = (battleLoser - 1 + players.length) % players.length;
        const amIWinner = players[winnerIdx]?.id === myPlayerId;
        if (amIWinner) playSound('win');
        else playSound('lose');
      }
      setTimeout(() => setShowModal(true), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleLoser, isOnline]);

  const pickCardRef = useRef<((card: Card) => void) | null>(null);

  const pickCard = useCallback(async (card: Card) => {
    if (picking) return;
    if (isOnline && (!isMyTurn || battleLoser !== null) && !amIHost) return; 

    setPicking(true);
    setRevealedCardName(card.name);
    playSound('select');

    if (isOnline) {
      setTimeout(async () => {
        const newField = field.filter(c => (c.url || c.name) !== (card.url || card.name));
        const newPlayers = [...players];
        const currentP = { ...newPlayers[currentPlayerIdx] };

        currentP.hand = [...currentP.hand, card];
        currentP.total += card.value;
        const newSharedTotal = sharedTotal + card.value;
        if (newSharedTotal > activeTarget) currentP.busted = true;

        newPlayers[currentPlayerIdx] = currentP;
        setField(newField);
        setPlayers(newPlayers);
        setSharedTotal(newSharedTotal);
        setRevealedCardName(null);
        setPicking(false);

        await supabase.from("rooms").update({ field_cards: newField, players: newPlayers }).eq("id", roomId);
      }, 400);
      return;
    }

    setTimeout(() => {
      setField(prev => prev.filter(c => (c.url || c.name) !== (card.url || card.name)));
      setRevealedCardName(null);
      if (isBattle) handleBattlePick(card);
      else if (numPlayers === 1) handleSoloPick(card);
      else handleMultiPick(card);
    }, 400); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, field, players, currentPlayerIdx, total, hand, sharedTotal, isBattle, numPlayers, isOnline, isMyTurn, roomId, amIHost]);

  useEffect(() => { pickCardRef.current = pickCard; }, [pickCard]);

  useEffect(() => {
    if (!gameReady || picking || showModal || battleLoser !== null || field.length === 0) return;
    if (timeLeft <= 0) {
      if (amIHost && pickCardRef.current) {
        const randomIndex = Math.floor(Math.random() * field.length);
        pickCardRef.current(field[randomIndex]);
      }
      return;
    }
    const timer = setTimeout(() => { setTimeLeft(prev => prev - 1); }, 1000);
    return () => clearTimeout(timer);
  }, [timeLeft, picking, showModal, battleLoser, gameReady, amIHost, field.length]);

  useEffect(() => { setTimeLeft(15); }, [currentPlayerIdx, picking]);

  useEffect(() => {
    if (!gameReady || !isBattle || picking || showModal || battleLoser !== null || isOnline) return;
    if (players.length === 0 || field.length === 0) return;
    const currentPlayer = players[currentPlayerIdx];
    if (!currentPlayer || !currentPlayer.isCpu) return;
    if (cpuTimerRef.current) return;

    cpuTimerRef.current = setTimeout(() => {
      cpuTimerRef.current = null;
      if (pickCardRef.current && field.length > 0) {
        const randomIndex = Math.floor(Math.random() * field.length);
        pickCardRef.current(field[randomIndex]);
      }
    }, 1200);
    return () => { if (cpuTimerRef.current) { clearTimeout(cpuTimerRef.current); cpuTimerRef.current = null; } };
  }, [gameReady, currentPlayerIdx, picking, showModal, field, players, isBattle, battleLoser, isOnline]);

  const handleSoloPick = (card: Card) => {
    const newTotal = total + card.value;
    setHand(prev => [...prev, card]);
    setTotal(newTotal);
    if (newTotal > activeTarget) { setSoloResult('bust'); playSound('bust'); setTimeout(() => setShowModal(true), 500); }
    setPicking(false);
  };

  const handleMultiPick = (card: Card) => {
    const nextPlayers = [...players];
    const p = { ...nextPlayers[currentPlayerIdx] };
    p.hand = [...p.hand, card];
    p.total += card.value;
    if (p.total > activeTarget) { p.busted = true; p.stopped = true; playSound('bust'); }
    nextPlayers[currentPlayerIdx] = p;
    setPlayers(nextPlayers);
    setPicking(false);
    setTimeout(() => advanceTurn(nextPlayers), 300); 
  };

  const advanceTurn = (currentPlayers: Player[]) => {
    const allDone = currentPlayers.every(p => p.stopped || p.busted);
    if (allDone) { checkMultiResult(currentPlayers); return; }
    const playerCount = currentPlayers.length;
    let next = (currentPlayerIdx + 1) % playerCount;
    while (currentPlayers[next].stopped || currentPlayers[next].busted) { next = (next + 1) % playerCount; }
    setCurrentPlayerIdx(next);
  };

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

    if (newSharedTotal > activeTarget) {
      p.busted = true;
      nextPlayers[currentPlayerIdx] = p;
      setPlayers(nextPlayers);
      setBattleLoser(currentPlayerIdx);
      
      if (numPlayers === 1) playSound(p.isCpu ? 'win' : 'bust');
      else playSound('bust');
      
      setTimeout(() => setShowModal(true), 600);
      return;
    }

    const totalDrawnCards = nextPlayers.reduce((sum, player) => sum + player.hand.length, 0);
    if (totalDrawnCards >= fieldSize) { setTimeout(() => setShowModal(true), 600); return; }
    setTimeout(() => { setCurrentPlayerIdx((currentPlayerIdx + 1) % nextPlayers.length); }, 300);
  };

  const doStand = () => {
    if (picking || isBattle) return;
    if (numPlayers === 1) {
      if (soloResult) return;
      const sortedField = [...field].sort((a, b) => b.value - a.value);
      let dTotal = 0; let dHand: Card[] = [];
      for (const c of sortedField) {
        if (dTotal + c.value <= activeTarget) { dHand.push(c); dTotal += c.value; }
        if (dTotal >= total) break;
      }
      if (dTotal < total) {
        for (const c of sortedField) {
          if (!dHand.includes(c) && dTotal + c.value <= activeTarget) { dHand.push(c); dTotal += c.value; if (dTotal >= total) break; }
        }
      }
      setDealerHand(dHand); setDealerTotal(dTotal);

      setTimeout(() => {
        const pDiff = Math.abs(total - activeTarget);
        const dDiff = Math.abs(dTotal - activeTarget);
        let res: 'win' | 'lose' | 'perfect' = 'lose';
        if (dTotal > activeTarget) { setScore(s => s + Math.max(Math.round((1 - pDiff / activeTarget) * 1000), 100)); res = 'win'; } 
        else if (pDiff <= dDiff) { setScore(s => s + Math.max(Math.round((1 - pDiff / activeTarget) * 1000), 100) + (pDiff === 0 ? 500 : 0)); res = pDiff === 0 ? 'perfect' : 'win'; }
        setSoloResult(res); playSound(res); setShowModal(true);
      }, 1200);

    } else {
      const nextPlayers = [...players];
      nextPlayers[currentPlayerIdx].stopped = true;
      setPlayers(nextPlayers);
      advanceTurn(nextPlayers);
    }
  };

  const checkMultiResult = (finalPlayers: Player[]) => {
    const ranked = [...finalPlayers].map(p => ({ ...p, diff: Math.abs(p.total - activeTarget) })).sort((a, b) => {
      if (a.busted && !b.busted) return 1;
      if (!a.busted && b.busted) return -1;
      return (a.diff || 0) - (b.diff || 0);
    });
    
    const isAllBust = ranked.every(r => r.busted);
    setAllMultiBust(isAllBust);
    setIsMultiDraw(!ranked[0].busted && ranked.length > 1 && !ranked[1].busted && ranked[0].diff === ranked[1].diff);
    setPlayers(ranked); 

    if (isAllBust) playSound('lose');
    else if (ranked[0].diff === 0 && !ranked[0].busted) playSound('perfect');
    else playSound('win');
    setTimeout(() => setShowModal(true), 500);
  };

  const handleRetry = async () => {
    if (isOnline) {
      const newDeck = shuffleArray(t.cards).slice(0, fieldSize);
      const resetPlayers = players.map(p => ({ ...p, hand: [], total: 0, busted: false, stopped: false }));
      await supabase.from("rooms").update({ field_cards: newDeck, players: resetPlayers, status: "playing" }).eq("id", roomId);
    } else {
      setRound(r => r + 1);
    }
  };

  const handleBackToTitle = async () => {
    if (isOnline && battleLoser === null) {
      const newPlayers = [...players];
      const myIndex = newPlayers.findIndex(p => p.id === myPlayerId);
      if (myIndex !== -1) {
        newPlayers[myIndex].busted = true;
        await supabase.from("rooms").update({ players: newPlayers }).eq("id", roomId);
      }
    }
    onBack();
  };

  const isMulti = numPlayers > 1 || isBattle || isOnline;
  const isSoloBust = soloResult === 'bust';
  const soloRatio = activeTarget > 0 ? Math.min((total / activeTarget) * 100, 100) : 0;
  
  const showStandBtn = !isBattle && (isMulti ? (!players[currentPlayerIdx]?.busted && players[currentPlayerIdx]?.hand.length > 0) : (!soloResult && hand.length > 0));

  const isPerfect = !isMulti && soloResult === 'perfect';
  const isWin = (!isMulti && soloResult === 'win') || (isMulti && !isBattle && !allMultiBust && !isMultiDraw);
  const battleEnded = isBattle && battleLoser !== null;
  const showField = isBattle ? !battleEnded : (!soloResult && !showModal);

  // ★ 全体のドロー枚数から「1枚目で自爆したか」を判定
  const totalDrawnGlobal = players.reduce((sum, p) => sum + (p.hand?.length || 0), 0);
  const isSelfDestructGlobal = totalDrawnGlobal === 1;

  const battleWinnerIdx = (battleLoser !== null && !isSelfDestructGlobal) ? (battleLoser - 1 + players.length) % players.length : null;
  const isOfflineBattleWin = isBattle && !isOnline && battleLoser !== null && !isSelfDestructGlobal && !(numPlayers === 1 && battleLoser === 0);
  const isOnlineBattleWin = isBattle && isOnline && battleWinnerIdx !== null && players[battleWinnerIdx]?.id === myPlayerId;
  const showBattleConfetti = isOfflineBattleWin || isOnlineBattleWin;

  let modalAnimationClass = "";
  if (isPerfect) modalAnimationClass = "perfect-modal";
  else if (showBattleConfetti) modalAnimationClass = "win-modal"; 
  else if (isWin) modalAnimationClass = "win-modal";

  return (
    <div id="game">
      
      {showModal && (isPerfect || isWin || showBattleConfetti) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 101, pointerEvents: 'none' }}>
          <Confetti width={windowSize.width} height={windowSize.height} numberOfPieces={isPerfect ? 800 : 250} recycle={isPerfect} gravity={isPerfect ? 0.3 : 0.15} />
        </div>
      )}

      <div className="sticky-header">
        <div className="top-bar">
          <button className="back-btn" onClick={handleBackToTitle}>← タイトルへ</button>
          {!isMulti && <div className="round-info mono">ROUND {round}｜{score}pt</div>}
          {isBattle && <div className="round-info mono" style={{ color: '#e63946' }}>{isOnline ? '🌐 ONLINE BATTLE' : '⚔️ BATTLE'}</div>}
        </div>

        {isMulti && !showModal && !battleEnded && (
          <div className={`turn-indicator ${isBattle ? 'battle-turn' : ''}`} style={{ color: players[currentPlayerIdx]?.color, border: `2px solid ${players[currentPlayerIdx]?.color}66`, background: isBattle ? `${players[currentPlayerIdx]?.color}08` : '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <span>{players[currentPlayerIdx]?.emoji} {getPlayerName(players[currentPlayerIdx])} のターン</span>
            <span style={{ fontSize: '14px', fontWeight: '900', color: timeLeft <= 5 ? '#ff4444' : players[currentPlayerIdx]?.color, background: timeLeft <= 5 ? '#ffebee' : '#f0f0f0', padding: '2px 8px', borderRadius: '12px' }}>
              ⏳ {timeLeft}秒
            </span>
          </div>
        )}

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

        {isMulti && (
          <div className="players-area">
            {players.map((p, i) => {
              const activeClass = i === currentPlayerIdx && !p.stopped && !p.busted && !battleEnded ? 'active' : '';
              const stoppedClass = p.stopped || p.busted || (battleEnded && battleLoser === i) ? 'stopped' : '';
              return (
                <div key={i} className={`player-panel ${activeClass} ${stoppedClass}`} style={{ borderColor: activeClass ? p.color : '' }}>
                  <div className="p-name" style={{ color: p.color }}>{p.emoji} {getPlayerName(p)}</div>
                  
                  {isBattle ? (
                    <>
                      <div className="p-remain" style={{ color: '#888', marginTop: '2px', fontSize: '11px' }}>
                        合計: {fmt(p.total)}{t.unit}（{p.hand.length}枚）
                      </div>
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
                      {battleEnded && battleLoser !== i && !isSelfDestructGlobal && <div className="p-status" style={{ color: p.color, fontSize: '12px' }}>🏆 SURVIVE!</div>}
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
      </div> 

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
                  key={c.url || `${c.name}-${c.hint}`}
                  className={`field-card ${isRevealed ? 'revealed' : ''}`}
                  disabled={picking || battleEnded || (!isMulti && !!soloResult) || (isMulti && !isBattle && players[currentPlayerIdx]?.stopped) || (!isOnline && players[currentPlayerIdx]?.isCpu) || (isOnline && !isMyTurn)}
                  onClick={() => pickCard(c)}
                  style={isRevealed ? { borderColor: revealColor, background: `${revealColor}15` } : {}}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="fname" style={{ color: isRevealed ? revealColor : '' }}>{c.name}</div>
                    <div className="fhint">{c.hint}</div>
                  </div>
                  {isRevealed ? <div className="fval" style={{ color: revealColor }}>{c.value.toLocaleString()}<span className="fu">{t.unit}</span></div> : <div className="fq">？</div>}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {showStandBtn && !showModal && (
        <div className="stand-area">
          <button className="stand-btn" onClick={doStand} style={{ background: isMulti ? players[currentPlayerIdx]?.color : t.color }}>
            ✋ {isMulti ? 'ストップ！' : 'この合計でストップ！'}
          </button>
        </div>
      )}

      <div className={`modal-bg ${showModal ? 'active' : ''}`}>
        <div className={`modal ${modalAnimationClass}`} style={{ borderColor: isBattle ? (battleLoser !== null ? '#e63946' : '#888') : isMulti ? (allMultiBust ? '#ff4444' : players[0]?.color) : (soloResult === 'bust' ? '#ff4444' : t.color) }}>
          
          {isBattle && (
            <>
              <div className="result-emoji">{battleLoser !== null ? '💥' : '🤝'}</div>
              <div className="result-title">
                {battleLoser !== null 
                  ? (() => {
                      // ★ 1枚目で自爆した場合は専用のテキスト表示！
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
                最終合計: <span style={{color: '#ff4444', fontWeight: 900}}>{fmt(sharedTotal)}{t.unit}</span><br/>💣 リミット: {activeTarget.toLocaleString()}{t.unit}
              </div>
              <div className="result-ranking">
                {players.map((p, i) => {
                  const isLoserP = battleLoser === i;
                  const isWinnerP = i === battleWinnerIdx;
                  // 自爆時は全員😶か💥にする
                  const rankPos = isSelfDestructGlobal ? (isLoserP ? '💥' : '😶') : (isWinnerP ? '🏆' : isLoserP ? '💥' : '👏');
                  
                  return (
                    <div className="rank-row" key={i}>
                      <div className="rank-pos">{rankPos}</div>
                      <div className="rank-name" style={{ color: p.color }}>{p.emoji} {getPlayerName(p)}</div>
                      <div className="rank-val mono" style={{ color: isLoserP ? '#ff4444' : '#333' }}>選択数: {fmt(p.total)}{t.unit}</div>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {!isMulti && !isBattle && (
            <>
              <div className="result-emoji">{soloResult === 'perfect' ? '🎰' : soloResult === 'win' ? '🎉' : soloResult === 'bust' ? '💥' : '😢'}</div>
              <div className="result-title" style={{ color: soloResult === 'perfect' || soloResult === 'win' ? t.color : soloResult === 'bust' ? '#ff4444' : '#666' }}>
                {soloResult === 'perfect' ? 'PERFECT!!' : soloResult === 'win' ? 'YOU WIN!' : soloResult === 'bust' ? 'BUST!' : 'YOU LOSE...'}
              </div>
              <div className="result-detail">あなた: {total.toLocaleString()}{t.unit} {dealerTotal > 0 && ` ／ ディーラー: ${dealerTotal.toLocaleString()}${t.unit}`}<br/>目標: {activeTarget.toLocaleString()}{t.unit}</div>
              {(soloResult === 'win' || soloResult === 'perfect') && <div className="result-diff" style={{ color: t.color }}>差: {Math.abs(total - activeTarget).toLocaleString()}{t.unit} {soloResult === 'perfect' && '🎯 ボーナス!'}</div>}
            </>
          )}

          <div className="amazon-section">
            <div className="amazon-title">{(isMulti ? players[0]?.hand ?? [] : hand).some(c => c.url) ? "🎧 今回引いた動画を観る" : "🛒 今回引いたカードをAmazonで探す"}</div>
            <div className="amazon-cards">
              {(isMulti ? players[0]?.hand ?? [] : hand).slice(0, 3).map((c, i) => (
                <a key={i} href={c.url ? c.url : `https://www.amazon.co.jp/s?k=${encodeURIComponent(c.name)}&tag=ash44-22`} target="_blank" rel="noopener noreferrer" className="amazon-link" style={c.url ? { color: '#cc0000', borderColor: '#ffcccc' } : {}}>
                  {c.url ? `▶️ ${c.name} ${c.hint}` : `🔍 ${c.name}`}
                </a>
              ))}
            </div>
          </div>

          <div className="modal-btns">
            <button className="retry-btn" style={isBattle ? { background: '#e63946' } : !isPerfect ? { background: t.color } : { background: '#222', border: '1px solid #fff' }} onClick={handleRetry}>
              {isBattle ? '⚔️ もう1戦' : 'もう1回'}
            </button>
            <button className="change-btn" onClick={handleBackToTitle}>終了して戻る</button>
          </div>
        </div>
      </div>
    </div>
  );
}