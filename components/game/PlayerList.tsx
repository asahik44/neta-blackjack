// components/game/PlayerList.tsx
import React from "react";
import { Player } from "../../hooks/useGameLogic";

interface PlayerListProps {
  players: Player[];
  currentPlayerIdx: number;
  isBattle: boolean;
  battleEnded: boolean;
  battleLoser: number | null;
  isSelfDestructGlobal: boolean;
  unit: string;
  activeTarget: number;
  fmt: (v: number) => string;
  getPlayerName: (p: Player | undefined) => string;
}

export default function PlayerList({
  players, currentPlayerIdx, isBattle, battleEnded, battleLoser,
  isSelfDestructGlobal, unit, activeTarget, fmt, getPlayerName
}: PlayerListProps) {
  return (
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
                  合計: {fmt(p.total)}{unit}（{p.hand.length}枚）
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
                  {fmt(p.total)}<span className="p-unit">{unit}</span>
                </div>
                <div className="p-remain" style={{ color: p.busted ? '#ff4444' : (activeTarget - p.total) < activeTarget * 0.2 ? '#e63946' : '#e67e22' }}>
                  {p.busted ? '💥 バースト！' : p.stopped ? '✋ ストップ' : p.total > 0 ? `あと${Math.max(0, activeTarget - p.total).toLocaleString()}${unit}` : '─'}
                </div>
                <div className="p-gauge"><div className="p-gauge-fill" style={{ width: `${activeTarget > 0 ? Math.min(p.total / activeTarget, 1) * 100 : 0}%`, background: p.busted ? '#ff4444' : p.color }}></div></div>
                {(p.stopped || p.busted) && <div className="p-status" style={{ color: p.busted ? '#ff4444' : p.color }}>{p.busted ? '💥 バースト' : '✋ ストップ'}</div>}
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}