// components/game/CardField.tsx
import React from "react";
import { Card } from "../../data/themes";
import { Player } from "../../hooks/useGameLogic";

interface CardFieldProps {
  field: Card[];
  isBattle: boolean;
  isMulti: boolean;
  picking: boolean;
  battleEnded: boolean;
  soloResult: string | null;
  players: Player[];
  currentPlayerIdx: number;
  isOnline: boolean;
  isMyTurn: boolean;
  revealedCardName: string | null;
  themeColor: string;
  unit: string;
  pickCard: (card: Card) => void;
}

export default function CardField({
  field, isBattle, isMulti, picking, battleEnded, soloResult,
  players, currentPlayerIdx, isOnline, isMyTurn, revealedCardName,
  themeColor, unit, pickCard
}: CardFieldProps) {
  return (
    <div>
      <div className="section-title">
        {isBattle ? `⚔️ SELECT A CARD（残り${field.length}枚）` : `SELECT A CARD（残り${field.length}枚）`}
      </div>
      <div className="field">
        {field.map((c) => {
          const isRevealed = revealedCardName === c.name;
          const revealColor = isMulti ? players[currentPlayerIdx]?.color : themeColor;
          
          // カードを押せない条件（ちょっと複雑な判定）
          const isDisabled = picking || battleEnded || (!isMulti && !!soloResult) || 
                             (isMulti && !isBattle && players[currentPlayerIdx]?.stopped) || 
                             (!isOnline && players[currentPlayerIdx]?.isCpu) || 
                             (isOnline && !isMyTurn);

          return (
            <button
              key={c.url || `${c.name}-${c.hint}`}
              className={`field-card ${isRevealed ? 'revealed' : ''}`}
              disabled={isDisabled}
              onClick={() => pickCard(c)}
              style={isRevealed ? { borderColor: revealColor, background: `${revealColor}15` } : {}}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="fname" style={{ color: isRevealed ? revealColor : '' }}>{c.name}</div>
                <div className="fhint">{c.hint}</div>
              </div>
              {isRevealed ? (
                <div className="fval" style={{ color: revealColor }}>
                  {c.value.toLocaleString()}<span className="fu">{unit}</span>
                </div>
              ) : (
                <div className="fq">？</div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}