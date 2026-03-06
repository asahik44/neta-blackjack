// components/game/BattleScorePanel.tsx
import React from "react";

interface BattleScorePanelProps {
  activeTarget: number;
  sharedTotal: number;
  unit: string;
  fmt: (v: number) => string; // 数値を綺麗にする関数もGameから受け取る
}

export default function BattleScorePanel({ activeTarget, sharedTotal, unit, fmt }: BattleScorePanelProps) {
  const isOver = sharedTotal > activeTarget;

  return (
    <div className="score-panel" style={{ borderColor: '#e63946', marginBottom: '8px' }}>
      <div className="score-header">
        <div className="left">
          <span className="emoji">💣</span>
          <span className="name" style={{ color: '#e63946' }}>SHARED LIMIT</span>
        </div>
        <div className="target mono" style={{ color: '#e63946' }}>
          LIMIT {activeTarget.toLocaleString()}{unit}
        </div>
      </div>
      
      <div className="gauge">
        <div 
          className="gauge-fill" 
          style={{ 
            width: `${Math.min((sharedTotal / activeTarget) * 100, 100)}%`, 
            background: isOver ? '#ff4444' : '#e63946' 
          }}
        ></div>
        <div className="gauge-text mono">
          {fmt(sharedTotal)} / {activeTarget.toLocaleString()}
        </div>
      </div>
      
      <div className="total-display">
        <span className="total-num mono" style={{ color: isOver ? '#ff4444' : '#222' }}>
          {fmt(sharedTotal)}
        </span>
        <span className="total-unit">{unit}</span>
        <span className="total-remain" style={{ color: isOver ? '#ff4444' : '#e67e22' }}>
          {isOver ? '💥 超過！' : `(あと ${Math.max(0, activeTarget - sharedTotal).toLocaleString()})`}
        </span>
      </div>
    </div>
  );
}