// components/game/SoloStatusPanel.tsx
import React from "react";
import { Card } from "../../data/themes"; // ★ 型を読み込む

interface SoloStatusPanelProps {
  total: number;
  hand: Card[];
  unit: string;
  activeTarget: number;
  fmt: (v: number) => string;
  themeColor: string;
  isBust: boolean;
}

export default function SoloStatusPanel({ total, hand, unit, activeTarget, fmt, themeColor, isBust }: SoloStatusPanelProps) {
  return (
    <div className="players-area" style={{ marginBottom: '16px' }}>
      <div className="player-panel active" style={{ borderColor: themeColor }}>
        <div className="p-name" style={{ color: themeColor }}>👤 あなた（ソロ挑戦）</div>
        
        <div className="p-total mono" style={{ color: isBust ? '#ff4444' : '#333' }}>
          {fmt(total)}<span className="p-unit">{unit}</span>
        </div>
        
        <div className="p-remain" style={{ color: isBust ? '#ff4444' : (activeTarget - total) < activeTarget * 0.2 ? '#e63946' : '#e67e22' }}>
          {isBust ? '💥 バースト！' : total > 0 ? `あと${Math.max(0, activeTarget - total).toLocaleString()}${unit}（${hand.length}枚選択）` : '目標に近づけろ！'}
        </div>
        
        <div className="p-gauge">
          <div className="p-gauge-fill" style={{ width: `${activeTarget > 0 ? Math.min(total / activeTarget, 1) * 100 : 0}%`, background: isBust ? '#ff4444' : themeColor }}></div>
        </div>

        {/* 選んだカードの一覧を表示！ */}
        {hand.length > 0 && (
          <div className="battle-hand" style={{ marginTop: '12px' }}>
            {hand.map((c, ci) => (
              <div key={ci} className="battle-hand-card" style={{ borderColor: `${themeColor}33` }}>
                <span className="battle-hand-name">{c.name}</span>
                <span className="battle-hand-val mono" style={{ color: themeColor }}>{c.value.toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}