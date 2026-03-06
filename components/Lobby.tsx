"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { THEMES, ThemeKey } from "@/data/themes";
import Game from "@/components/Game";

interface LobbyProps {
  roomId: string;
}

export default function Lobby({ roomId }: LobbyProps) {
  const [roomData, setRoomData] = useState<any>(null);
  const [playerName, setPlayerName] = useState("");
  const [isJoined, setIsJoined] = useState(false);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);

  useEffect(() => {
    const fetchRoom = async () => {
      const { data } = await supabase.from("rooms").select("*").eq("id", roomId).single();
      if (data) setRoomData(data);
    };
    fetchRoom();

    const channel = supabase
      .channel(`room-${roomId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "rooms", filter: `id=eq.${roomId}` }, (payload) => {
        setRoomData(payload.new);
      }).subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  const handleJoin = async () => {
    if (!playerName.trim() || !roomData) return;
    const newPlayerId = crypto.randomUUID();
    const newPlayer = { id: newPlayerId, name: playerName, isHost: (roomData.players || []).length === 0 };
    const updatedPlayers = [...(roomData.players || []), newPlayer];
    await supabase.from("rooms").update({ players: updatedPlayers }).eq("id", roomId);
    setMyPlayerId(newPlayerId);
    setIsJoined(true);
  };

  const handleStartGame = async () => {
    const theme = THEMES[roomData.theme_key as ThemeKey];
    const deck = [...theme.cards].sort(() => Math.random() - 0.5).slice(0, roomData.field_size || 30);
    const shuffledPlayers = [...(roomData.players || [])].sort(() => Math.random() - 0.5);
    await supabase.from("rooms").update({ status: "playing", field_cards: deck, players: shuffledPlayers }).eq("id", roomId);
  };

  const shareUrl = typeof window !== 'undefined' ? window.location.href : "";
  const shareText = roomData ? `「ネタ・ブラックジャック」の通信対戦に招待されています！\nテーマ: ${THEMES[roomData.theme_key as ThemeKey]?.name}\n` : "";
  
  const hasQuery = shareUrl.includes('?');
  const lineShareUrl = shareUrl ? `${shareUrl}${hasQuery ? '&' : '?'}openExternalBrowser=1` : "";

  const trackShare = (method: string) => {
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'share', { method: method, content_type: 'room_link', item_id: roomId });
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareText + shareUrl);
    alert("URLをコピーしました！DiscordやMessengerなどに貼り付けてください！");
    trackShare("Copy");
  };

  if (!roomData) return <div style={{ padding: '40px', textAlign: 'center', fontWeight: 'bold' }}>お部屋を探しています...🔍</div>;

  if (roomData.status === "playing") {
    return <Game themeKey={roomData.theme_key as ThemeKey} numPlayers={roomData.players.length} gameMode="battle" multiplier={roomData.multiplier || 1} fieldSize={roomData.field_size || 30} onBack={() => window.location.href = '/'} roomId={roomId} myPlayerId={myPlayerId} />;
  }

  const theme = THEMES[roomData.theme_key as ThemeKey];
  const isMeHost = roomData.players?.find((p: any) => p.id === myPlayerId)?.isHost;

  return (
    <div style={{ padding: '24px', maxWidth: '400px', margin: '0 auto' }}>
      
      {/* ★ トップへ戻るボタンを追加！ */}
      <button 
        onClick={() => window.location.href = '/'}
        style={{ marginBottom: '16px', background: 'none', border: 'none', color: '#555', fontSize: '14px', cursor: 'pointer', padding: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}
      >
        <span>←</span> タイトルへ戻る
      </button>

      <h2 style={{ textAlign: 'center', marginBottom: '20px', marginTop: 0 }}>🏨 待機ロビー</h2>
      
      <div style={{ background: '#ffffff', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0', marginBottom: '24px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
        <div style={{ fontSize: '12px', color: '#777', fontWeight: 'bold' }}>ROOM ID</div>
        <div style={{ fontSize: '32px', fontWeight: '900', letterSpacing: '2px', color: '#e67e22', marginBottom: '12px' }}>{roomId}</div>
        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#444', marginBottom: '16px' }}>
          テーマ: <span style={{ fontSize: '18px' }}>{theme?.emoji}</span> {theme?.name}
        </div>

        <div style={{ borderTop: '1px dashed #ccc', paddingTop: '16px', display: 'flex', gap: '8px', justifyContent: 'center' }}>
          <button onClick={handleCopy} style={{ flex: 1, padding: '12px 4px', background: '#333', color: '#fff', borderRadius: '12px', border: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
            <span style={{ fontSize: '20px', lineHeight: '1' }}>📋</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>URLコピー</span>
          </button>
          <a href={`https://line.me/R/msg/text/?${encodeURIComponent(shareText + lineShareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackShare('LINE')} style={{ flex: 1, padding: '12px 4px', background: '#06C755', color: '#fff', borderRadius: '12px', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '20px', lineHeight: '1' }}>💬</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>LINE</span>
          </a>
          <a href={`https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`} target="_blank" rel="noopener noreferrer" onClick={() => trackShare('X_Twitter')} style={{ flex: 1, padding: '12px 4px', background: '#000', color: '#fff', borderRadius: '12px', textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '20px', lineHeight: '1' }}>𝕏</span>
            <span style={{ fontSize: '11px', fontWeight: 'bold', whiteSpace: 'nowrap' }}>Post</span>
          </a>
        </div>
      </div>

      {!isJoined ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input value={playerName} onChange={(e) => setPlayerName(e.target.value)} placeholder="あなたの名前を入力..." style={{ padding: '14px', borderRadius: '12px', border: '2px solid #e2e8f0', fontSize: '16px', fontWeight: 'bold', outline: 'none' }} />
          <button onClick={handleJoin} disabled={!playerName.trim()} style={{ padding: '14px', background: playerName.trim() ? '#e67e22' : '#cbd5e1', color: '#fff', borderRadius: '12px', fontSize: '16px', fontWeight: '900', border: 'none', cursor: 'pointer' }}>
            部屋に入る！
          </button>
        </div>
      ) : (
        <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
          <h3 style={{ fontSize: '15px', color: '#555', marginBottom: '12px' }}>👥 参加者一覧 ({roomData.players?.length || 0}人)</h3>
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {roomData.players?.map((p: any) => (
              <li key={p.id} style={{ background: '#fff', padding: '12px', borderRadius: '8px', fontWeight: 'bold', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                {p.isHost && <span title="ホスト">👑</span>}
                {p.name} {p.id === myPlayerId && <span style={{fontSize:'10px', color:'#e67e22'}}>(あなた)</span>}
              </li>
            ))}
          </ul>
          
          {isMeHost ? (
            <button onClick={handleStartGame} style={{ width: '100%', padding: '14px', background: '#e63946', color: '#fff', borderRadius: '12px', fontSize: '16px', fontWeight: '900', marginTop: '20px', border: 'none', cursor: 'pointer' }}>
              全員でゲームスタート！
            </button>
          ) : (
            <div style={{ marginTop: '20px', padding: '14px', textAlign: 'center', fontSize: '13px', fontWeight: 'bold', color: '#888', background: '#e2e8f0', borderRadius: '12px' }}>
              ホストが開始するのを待っています...☕️
            </div>
          )}
        </div>
      )}
    </div>
  );
}