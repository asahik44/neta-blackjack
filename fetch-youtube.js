// fetch-youtube.js
const fs = require('fs');

// ★ここに取得したYouTube Data API v3のキーを入れてください
const API_KEY = 'AIzaSyBhOltvF4GBiVySEBaeluc2l83BjFqCWOc'; 
// 匿名ラジオの再生リストID（アップロード動画一覧など）
// ※オモコロチャンネルの「匿名ラジオ」プレイリストIDを指定します
const PLAYLIST_ID = 'UUlSsb_e0HDQ-w7XuwNPgGqQ'; 

async function fetchAllVideos() {
  let videos = [];
  let nextPageToken = '';
  
  console.log('動画リストを取得中...');

  try {
    // 1. プレイリストから動画IDとタイトルを取得
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${PLAYLIST_ID}&key=${API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      
      // ★ エラーの正体を暴くコードを追加！
      if (data.error) {
        console.error('\n❌ YouTubeからエラーが返ってきました！');
        console.error('原因:', data.error.message, '\n');
        break;
      }
      
      if (!data.items) break;
      videos.push(...data.items);
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    console.log(`合計 ${videos.length} 件の動画を見つけました！`);
    console.log('それぞれの再生時間を取得中...');

    // 2. 動画IDを使って、再生時間（duration）を取得（APIの制限上、50件ずつまとめます）
    const cards = [];
    for (let i = 0; i < videos.length; i += 50) {
      const chunk = videos.slice(i, i + 50);
      const ids = chunk.map(v => v.snippet.resourceId.videoId).join(',');
      
      const vidUrl = `https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=${ids}&key=${API_KEY}`;
      const vidRes = await fetch(vidUrl);
      const vidData = await vidRes.json();

      vidData.items.forEach(vData => {
        const snippet = chunk.find(v => v.snippet.resourceId.videoId === vData.id).snippet;
        const rawTitle = snippet.title;
        
        // "【#504】フワっとした日本語の定義を勝手に決めよう！" などを分割
        // ※タイトルのフォーマットに合わせて正規表現を調整しています
        const match = rawTitle.match(/【?(#\d+)】?(.*)/);
        let name = match ? match[1] : "特別編";
        let hint = match ? match[2].trim() : rawTitle;

        // PT15M33S みたいな謎のフォーマットを秒数（数値）に変換
        const durationStr = vData.contentDetails.duration;
        const durationMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(durationMatch[1] || 0, 10);
        const minutes = parseInt(durationMatch[2] || 0, 10);
        const seconds = parseInt(durationMatch[3] || 0, 10);
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

        // ショート動画や短すぎるものは除外
        if (totalSeconds > 60) {
          cards.push({
            name,
            value: totalSeconds,
            hint,
            url: `https://youtu.be/${vData.id}`
          });
        }
      });
    }

    // 3. tokumei.ts として出力
    const fileContent = `import { Theme } from "./types";\n\nexport const tokumeiTheme: Theme = {\n  name: "匿名ラジオ",\n  target: 3600, // 1時間(3600秒)\n  battleTarget: 7200,\n  unit: "秒",\n  emoji: "📻",\n  color: "#ff0000",\n  bg: "#1a0000",\n  cards: ${JSON.stringify(cards, null, 2)}\n};\n`;
    
    fs.writeFileSync('tokumei.ts', fileContent);
    console.log('✅ tokumei.ts の生成が完了しました！');

  } catch (error) {
    console.error('エラーが発生しました:', error);
  }
}

fetchAllVideos();