// components/Game.tsx
"use client";

import React from "react";
import Confetti from "react-confetti"; 
import BattleScorePanel from "./game/BattleScorePanel";
import PlayerList from "./game/PlayerList";
import SoloStatusPanel from "./game/SoloStatusPanel";
import CardField from "./game/CardField";
import ResultModal from "./game/ResultModal";
import { ThemeKey, GameMode } from "../data/themes";
import { useGameLogic, fmt } from "../hooks/useGameLogic";

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

export default function Game(props: GameProps) {
  // ★ ここで脳みそ（useGameLogic）から、必要なデータを全部受け取る！
  const logic = useGameLogic(props);

  return (
    <div id="game">
      {logic.showModal && (logic.isPerfect || logic.isWin || logic.showBattleConfetti) && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 101, pointerEvents: 'none' }}>
          <Confetti width={logic.windowSize.width} height={logic.windowSize.height} numberOfPieces={logic.isPerfect ? 800 : 250} recycle={logic.isPerfect} gravity={logic.isPerfect ? 0.3 : 0.15} />
        </div>
      )}

      <div className="sticky-header">
        <div className="top-bar">
          <button className="back-btn" onClick={logic.handleBackToTitle}>← タイトルへ</button>
          {!logic.isMulti && <div className="round-info mono">ROUND {logic.round}｜{logic.score}pt</div>}
          {logic.isBattle && <div className="round-info mono" style={{ color: '#e63946' }}>{logic.isOnline ? '🌐 ONLINE BATTLE' : '⚔️ BATTLE'}</div>}
        </div>

        {logic.isMulti && !logic.showModal && !logic.battleEnded && (
          <div className={`turn-indicator ${logic.isBattle ? 'battle-turn' : ''}`} style={{ color: logic.players[logic.currentPlayerIdx]?.color, border: `2px solid ${logic.players[logic.currentPlayerIdx]?.color}66`, background: logic.isBattle ? `${logic.players[logic.currentPlayerIdx]?.color}08` : '#ffffff', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
            <span>{logic.players[logic.currentPlayerIdx]?.emoji} {logic.getPlayerName(logic.players[logic.currentPlayerIdx])} のターン</span>
            {logic.isOnline && ( /* ★ オンラインの時だけ表示！ */
              <span style={{ fontSize: '14px', fontWeight: '900', color: logic.timeLeft <= 5 ? '#ff4444' : logic.players[logic.currentPlayerIdx]?.color, background: logic.timeLeft <= 5 ? '#ffebee' : '#f0f0f0', padding: '2px 8px', borderRadius: '12px' }}>
                ⏳ {logic.timeLeft}秒
              </span>
            )}
          </div>
        )}

        {logic.isBattle && (
          <BattleScorePanel activeTarget={logic.activeTarget} sharedTotal={logic.sharedTotal} unit={logic.t.unit} fmt={fmt} />
        )}

        {logic.isMulti ? (
          <PlayerList 
            players={logic.players} currentPlayerIdx={logic.currentPlayerIdx} isBattle={logic.isBattle} battleEnded={logic.battleEnded}
            battleLoser={logic.battleLoser} isSelfDestructGlobal={logic.isSelfDestructGlobal} unit={logic.t.unit} activeTarget={logic.activeTarget}
            fmt={fmt} getPlayerName={logic.getPlayerName}
          />
        ) : (
          <SoloStatusPanel
            total={logic.total} hand={logic.hand} unit={logic.t.unit} activeTarget={logic.activeTarget} fmt={fmt}
            themeColor={logic.t.color} isBust={logic.soloResult === 'bust'}
          />
        )}
      </div> 

      {logic.showField && (
        <CardField
          field={logic.field} isBattle={logic.isBattle} isMulti={logic.isMulti} picking={logic.picking} battleEnded={logic.battleEnded}
          soloResult={logic.soloResult} players={logic.players} currentPlayerIdx={logic.currentPlayerIdx} isOnline={logic.isOnline}
          isMyTurn={logic.isMyTurn} revealedCardName={logic.revealedCardName} themeColor={logic.t.color} unit={logic.t.unit} pickCard={logic.pickCard}
        />
      )}

      {logic.showStandBtn && !logic.showModal && (
        <div className="stand-area">
          <button className="stand-btn" onClick={logic.doStand} style={{ background: logic.isMulti ? logic.players[logic.currentPlayerIdx]?.color : logic.t.color }}>
            ✋ {logic.isMulti ? 'ストップ！' : 'この合計でストップ！'}
          </button>
        </div>
      )}

      <ResultModal
        showModal={logic.showModal} modalAnimationClass={logic.modalAnimationClass} isBattle={logic.isBattle} battleLoser={logic.battleLoser}
        isSelfDestructGlobal={logic.isSelfDestructGlobal} getPlayerName={logic.getPlayerName} players={logic.players} sharedTotal={logic.sharedTotal}
        activeTarget={logic.activeTarget} unit={logic.t.unit} fmt={fmt} battleWinnerIdx={logic.battleWinnerIdx} isMulti={logic.isMulti}
        allMultiBust={logic.allMultiBust} soloResult={logic.soloResult} total={logic.total} dealerTotal={logic.dealerTotal} themeColor={logic.t.color}
        hand={logic.hand} isPerfect={logic.isPerfect} handleRetry={logic.handleRetry} handleBackToTitle={logic.handleBackToTitle}
      />
    </div>
  );
}