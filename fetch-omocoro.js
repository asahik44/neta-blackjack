// fetch-omocoro.js
const fs = require('fs');

const API_KEY = 'AIzaSyBhOltvF4GBiVySEBaeluc2l83BjFqCWOc'; 
const CHANNEL_ID = 'UCOx-oLP9tOhiYwSK_m-yVxA'; // オモコロチャンネルID
const PLAYLIST_ID = 'UUOx-oLP9tOhiYwSK_m-yVxA'; // 全アップロード動画リストID

async function fetchOmocoro() {
  let videos = [];
  let nextPageToken = '';
  
  console.log('🎥 オモコロチャンネルの動画リストを取得中...');

  try {
    do {
      const url = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=${PLAYLIST_ID}&key=${API_KEY}${nextPageToken ? `&pageToken=${nextPageToken}` : ''}`;
      const res = await fetch(url);
      const data = await res.json();
      
      if (data.error) {
        console.error('❌ エラー:', data.error.message);
        return;
      }
      if (!data.items) break;
      videos.push(...data.items);
      nextPageToken = data.nextPageToken;
      process.stdout.write(`取得済み: ${videos.length}件...\r`);
    } while (nextPageToken);

    console.log(`\n合計 ${videos.length} 件の動画を分析します...`);

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

        // 再生時間を秒に変換
        const durationStr = vData.contentDetails.duration;
        const durationMatch = durationStr.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        const hours = parseInt(durationMatch[1] || 0, 10);
        const minutes = parseInt(durationMatch[2] || 0, 10);
        const seconds = parseInt(durationMatch[3] || 0, 10);
        const totalSeconds = (hours * 3600) + (minutes * 60) + seconds;

        // ★ 5分（300秒）以下の動画（ショートなど）を端折る
        if (totalSeconds <= 300) return;

        // タイトル分割ロジック
        // 「【検証】100均の物だけで〜」を「【検証】」と「100均の物〜」に分ける
        const tagMatch = rawTitle.match(/^([【\(\[].+?[】\)\]])(.*)/);
        let name = tagMatch ? tagMatch[1] : rawTitle.substring(0, 10);
        let hint = tagMatch ? tagMatch[2].trim() : rawTitle;

        cards.push({
          name: name,
          value: totalSeconds,
          hint: hint,
          url: `https://youtu.be/${vData.id}`
        });
      });
    }

    const fileContent = `import { Theme } from "./types";\n\nexport const omocoroTheme: Theme = {\n  name: "オモコロチャンネル",\n  target: 5400, // 1.5時間\n  battleTarget: 7200,\n  unit: "秒",\n  emoji: "🥒🍹",\n  color: "#FFD700",\n  bg: "#0d1a0d",\n  cards: ${JSON.stringify(cards, null, 2)}\n};\n`;
    
    fs.writeFileSync('data/omocoro.ts', fileContent);
    console.log('✅ data/omocoro.ts を生成しました！');

  } catch (error) {
    console.error('通信エラー:', error);
  }
}

fetchOmocoro();