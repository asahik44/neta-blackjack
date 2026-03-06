// hooks/useGameLogic.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { THEMES, ThemeKey, Card, GameMode } from "@/data/themes";
import { supabase } from "@/lib/supabase";

export type Player = { id?: string; name: string; color: string; emoji: string; hand: Card[]; total: number; stopped: boolean; busted: boolean; diff?: number; isCpu?: boolean; isHost?: boolean; };

const PLAYER_COLORS = ["#FF4B00", "#005AFF", "#03AF7A", "#990099", "#F6AA00"];
const PLAYER_NAMES = ["Player 1", "Player 2", "Player 3", "Player 4", "Player 5"];
const PLAYER_EMOJIS = ["🔴", "🔵", "🟢", "🟣", "🟠"];

export function shuffleArray<T>(array: T[]): T[] {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function fmt(v: number) { return v >= 1 ? Math.round(v).toLocaleString() : v < 0.01 ? "0" : v.toFixed(1); }

interface UseGameLogicProps {
  themeKey: ThemeKey;
  numPlayers: number;
  gameMode: GameMode;
  multiplier: number; 
  fieldSize: number;  
  onBack: () => void;
  roomId?: string;
  myPlayerId?: string | null;
}

export function useGameLogic({ themeKey, numPlayers, gameMode, multiplier, fieldSize, onBack, roomId, myPlayerId }: UseGameLogicProps) {
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
    setPicking(false); setRevealedCardName(null); setShowModal(false); setBattleLoser(null); setSharedTotal(0); setTimeLeft(15);

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
        setPlayers(initialPlayers); setCurrentPlayerIdx(0);
      } else if (numPlayers === 1) {
        setHand([]); setTotal(0); setSoloResult(null); setDealerHand([]); setDealerTotal(0);
      } else {
        const initialPlayers = Array.from({ length: numPlayers }).map((_, i) => ({
          name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], emoji: PLAYER_EMOJIS[i],
          hand: [], total: 0, stopped: false, busted: false
        }));
        setPlayers(initialPlayers); setCurrentPlayerIdx(0);
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
      if (loserIdx !== -1) { setBattleLoser(loserIdx); } else {
        setBattleLoser(null); setShowModal(false);
        const cardsDrawn = mappedPlayers.reduce((sum: number, p: any) => sum + (p.hand?.length || 0), 0);
        setCurrentPlayerIdx(cardsDrawn % mappedPlayers.length);
        if (cardsDrawn >= (data.field_size || 30) && cardsDrawn > 0) setTimeout(() => setShowModal(true), 600);
      }
    };

    const fetchRoom = async () => { const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single(); syncGameState(data); };
    fetchRoom();

    const channel = supabase.channel(`game-${roomId}`).on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => { syncGameState(payload.new); }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isOnline, roomId]);

  useEffect(() => {
    if (isOnline && battleLoser !== null) {
      const amILoser = players[battleLoser]?.id === myPlayerId;
      const totalDrawn = players.reduce((sum, p) => sum + (p.hand?.length || 0), 0);
      const isSelfDestruct = totalDrawn === 1;

      if (amILoser) playSound('bust'); 
      else if (isSelfDestruct) playSound('lose'); 
      else {
        const winnerIdx = (battleLoser - 1 + players.length) % players.length;
        if (players[winnerIdx]?.id === myPlayerId) playSound('win'); else playSound('lose');
      }
      setTimeout(() => setShowModal(true), 600);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [battleLoser, isOnline]);

  const pickCardRef = useRef<((card: Card) => void) | null>(null);

  const pickCard = useCallback(async (card: Card) => {
    if (picking) return;
    if (isOnline && (!isMyTurn || battleLoser !== null) && !amIHost) return; 

    setPicking(true); setRevealedCardName(card.name); playSound('select');

    if (isOnline) {
      setTimeout(async () => {
        const newField = field.filter(c => (c.url || c.name) !== (card.url || card.name));
        const newPlayers = [...players];
        const currentP = { ...newPlayers[currentPlayerIdx] };

        currentP.hand = [...currentP.hand, card]; currentP.total += card.value;
        const newSharedTotal = sharedTotal + card.value;
        if (newSharedTotal > activeTarget) currentP.busted = true;

        newPlayers[currentPlayerIdx] = currentP;
        setField(newField); setPlayers(newPlayers); setSharedTotal(newSharedTotal); setRevealedCardName(null); setPicking(false);
        await supabase.from("rooms").update({ field_cards: newField, players: newPlayers }).eq("id", roomId);
      }, 400); return;
    }

    setTimeout(() => {
      setField(prev => prev.filter(c => (c.url || c.name) !== (card.url || card.name)));
      setRevealedCardName(null);
      if (isBattle) handleBattlePick(card); else if (numPlayers === 1) handleSoloPick(card); else handleMultiPick(card);
    }, 400); 
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [picking, field, players, currentPlayerIdx, total, hand, sharedTotal, isBattle, numPlayers, isOnline, isMyTurn, roomId, amIHost]);

  useEffect(() => { pickCardRef.current = pickCard; }, [pickCard]);

  useEffect(() => {
    if (!isOnline) return; // ★ これを追加！オンラインじゃなければタイマーを動かさない！
    if (!gameReady || picking || showModal || battleLoser !== null || field.length === 0) return;
    if (timeLeft <= 0) {
      if (amIHost && pickCardRef.current) { const randomIndex = Math.floor(Math.random() * field.length); pickCardRef.current(field[randomIndex]); } return;
    }
    const timer = setTimeout(() => { setTimeLeft(prev => prev - 1); }, 1000); return () => clearTimeout(timer);
  }, [timeLeft, picking, showModal, battleLoser, gameReady, amIHost, field.length, isOnline]); // ★ 最後に , isOnline を追加

  useEffect(() => { setTimeLeft(15); }, [currentPlayerIdx, picking]);

  useEffect(() => {
    if (!gameReady || !isBattle || picking || showModal || battleLoser !== null || isOnline) return;
    if (players.length === 0 || field.length === 0) return;
    const currentPlayer = players[currentPlayerIdx];
    if (!currentPlayer || !currentPlayer.isCpu) return;
    if (cpuTimerRef.current) return;

    cpuTimerRef.current = setTimeout(() => {
      cpuTimerRef.current = null;
      if (pickCardRef.current && field.length > 0) { const randomIndex = Math.floor(Math.random() * field.length); pickCardRef.current(field[randomIndex]); }
    }, 1200);
    return () => { if (cpuTimerRef.current) { clearTimeout(cpuTimerRef.current); cpuTimerRef.current = null; } };
  }, [gameReady, currentPlayerIdx, picking, showModal, field, players, isBattle, battleLoser, isOnline]);

  const handleSoloPick = (card: Card) => {
    const newTotal = total + card.value;
    setHand(prev => [...prev, card]); setTotal(newTotal);
    if (newTotal > activeTarget) { setSoloResult('bust'); playSound('bust'); setTimeout(() => setShowModal(true), 500); }
    setPicking(false);
  };

  const handleMultiPick = (card: Card) => {
    const nextPlayers = [...players]; const p = { ...nextPlayers[currentPlayerIdx] };
    p.hand = [...p.hand, card]; p.total += card.value;
    if (p.total > activeTarget) { p.busted = true; p.stopped = true; playSound('bust'); }
    nextPlayers[currentPlayerIdx] = p; setPlayers(nextPlayers); setPicking(false);
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
    const nextPlayers = [...players]; const p = { ...nextPlayers[currentPlayerIdx] };
    p.hand = [...p.hand, card]; p.total += card.value; nextPlayers[currentPlayerIdx] = p; setPlayers(nextPlayers); setPicking(false);

    const newSharedTotal = sharedTotal + card.value; setSharedTotal(newSharedTotal);

    if (newSharedTotal > activeTarget) {
      p.busted = true; nextPlayers[currentPlayerIdx] = p; setPlayers(nextPlayers); setBattleLoser(currentPlayerIdx);
      if (numPlayers === 1) playSound(p.isCpu ? 'win' : 'bust'); else playSound('bust');
      setTimeout(() => setShowModal(true), 600); return;
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
      for (const c of sortedField) { if (dTotal + c.value <= activeTarget) { dHand.push(c); dTotal += c.value; } if (dTotal >= total) break; }
      if (dTotal < total) { for (const c of sortedField) { if (!dHand.includes(c) && dTotal + c.value <= activeTarget) { dHand.push(c); dTotal += c.value; if (dTotal >= total) break; } } }
      setDealerHand(dHand); setDealerTotal(dTotal);

      setTimeout(() => {
        const pDiff = Math.abs(total - activeTarget); const dDiff = Math.abs(dTotal - activeTarget);
        let res: 'win' | 'lose' | 'perfect' = 'lose';
        if (dTotal > activeTarget) { setScore(s => s + Math.max(Math.round((1 - pDiff / activeTarget) * 1000), 100)); res = 'win'; } 
        else if (pDiff <= dDiff) { setScore(s => s + Math.max(Math.round((1 - pDiff / activeTarget) * 1000), 100) + (pDiff === 0 ? 500 : 0)); res = pDiff === 0 ? 'perfect' : 'win'; }
        setSoloResult(res); playSound(res); setShowModal(true);
      }, 1200);

    } else {
      const nextPlayers = [...players]; nextPlayers[currentPlayerIdx].stopped = true; setPlayers(nextPlayers); advanceTurn(nextPlayers);
    }
  };

  const checkMultiResult = (finalPlayers: Player[]) => {
    const ranked = [...finalPlayers].map(p => ({ ...p, diff: Math.abs(p.total - activeTarget) })).sort((a, b) => {
      if (a.busted && !b.busted) return 1; if (!a.busted && b.busted) return -1; return (a.diff || 0) - (b.diff || 0);
    });
    const isAllBust = ranked.every(r => r.busted);
    setAllMultiBust(isAllBust); setIsMultiDraw(!ranked[0].busted && ranked.length > 1 && !ranked[1].busted && ranked[0].diff === ranked[1].diff); setPlayers(ranked); 
    if (isAllBust) playSound('lose'); else if (ranked[0].diff === 0 && !ranked[0].busted) playSound('perfect'); else playSound('win');
    setTimeout(() => setShowModal(true), 500);
  };

  const handleRetry = async () => {
    if (isOnline) {
      const newDeck = shuffleArray(t.cards).slice(0, fieldSize);
      const resetPlayers = players.map(p => ({ ...p, hand: [], total: 0, busted: false, stopped: false }));
      await supabase.from("rooms").update({ field_cards: newDeck, players: resetPlayers, status: "playing" }).eq("id", roomId);
    } else setRound(r => r + 1);
  };

  const handleBackToTitle = async () => {
    if (isOnline && battleLoser === null) {
      const newPlayers = [...players]; const myIndex = newPlayers.findIndex(p => p.id === myPlayerId);
      if (myIndex !== -1) { newPlayers[myIndex].busted = true; await supabase.from("rooms").update({ players: newPlayers }).eq("id", roomId); }
    }
    onBack();
  };

  // UI描画に必要なフラグ類をまとめて計算
  const isMulti = numPlayers > 1 || isBattle || isOnline;
  const showStandBtn = !isBattle && (isMulti ? (!players[currentPlayerIdx]?.busted && players[currentPlayerIdx]?.hand.length > 0) : (!soloResult && hand.length > 0));
  const isPerfect = !isMulti && soloResult === 'perfect';
  const isWin = (!isMulti && soloResult === 'win') || (isMulti && !isBattle && !allMultiBust && !isMultiDraw);
  const battleEnded = isBattle && battleLoser !== null;
  const showField = isBattle ? !battleEnded : (!soloResult && !showModal);
  const totalDrawnGlobal = players.reduce((sum, p) => sum + (p.hand?.length || 0), 0);
  const isSelfDestructGlobal = totalDrawnGlobal === 1;
  const battleWinnerIdx = (battleLoser !== null && !isSelfDestructGlobal) ? (battleLoser - 1 + players.length) % players.length : null;
  const isOfflineBattleWin = isBattle && !isOnline && battleLoser !== null && !isSelfDestructGlobal && !(numPlayers === 1 && battleLoser === 0);
  const isOnlineBattleWin = isBattle && isOnline && battleWinnerIdx !== null && players[battleWinnerIdx]?.id === myPlayerId;
  const showBattleConfetti = isOfflineBattleWin || isOnlineBattleWin;

  let modalAnimationClass = "";
  if (isPerfect) modalAnimationClass = "perfect-modal";
  else if (showBattleConfetti || isWin) modalAnimationClass = "win-modal";

  // Game.tsxのUIが必要とする全データをまとめて返す
  return {
    t, isBattle, activeTarget, isOnline, getPlayerName, windowSize, round, score,
    players, currentPlayerIdx, timeLeft, sharedTotal, battleEnded, battleLoser,
    isSelfDestructGlobal, total, hand, soloResult, showField, field, picking,
    isMyTurn, revealedCardName, pickCard, showStandBtn, doStand, showModal,
    modalAnimationClass, battleWinnerIdx, isMulti, allMultiBust, dealerTotal,
    isPerfect, isWin, showBattleConfetti, handleRetry, handleBackToTitle
  };
}