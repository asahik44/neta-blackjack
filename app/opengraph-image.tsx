// app/opengraph-image.tsx
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'ネタ・ブラックジャック';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(160deg, #e2e8f0, #cbd5e1)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ fontSize: 130, marginBottom: 20 }}>🃏</div>
        <div style={{ fontSize: 75, fontWeight: 900, color: '#111', letterSpacing: '-2px' }}>
          ネタ・ブラックジャック
        </div>
        <div style={{ fontSize: 35, color: '#e67e22', fontWeight: 800, marginTop: 24 }}>
          ─ 知識 × 予想 × 駆け引き ─
        </div>
      </div>
    ),
    { ...size }
  );
}