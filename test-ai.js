// ==========================================
// AIコンシェルジュ ローカル動作テストスクリプト
// ==========================================

// .env ファイルを自動ロードする簡易処理 (dotenvインストール不要の超堅牢版)
const fs = require('fs');
const path = require('path');
try {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/['"]/g, '');
        if (key) {
          process.env[key] = value;
        }
      }
    });
    console.log('📝 .env ファイルから環境変数をロードしました。');
  }
} catch (e) {
  console.warn('⚠️ .env ファイルのロード中に警告が発生しました:', e.message);
}

const { handler } = require('./netlify/functions/ai-concierge.js');

async function runTest() {
  console.log('🔄 AIコンシェルジュのローカルテストを開始します...');
  console.log('Gemini API と VOICEVOX API を呼び出しています。少々お待ちください...\n');

  const dummyEvent = {
    httpMethod: 'POST',
    body: JSON.stringify({
      text: '朝食は何時からですか？',
      voice: 'ja-JP-Chirp3-HD-Aoede', // 四国めたん
      ttsOnly: false
    })
  };

  try {
    const result = await handler(dummyEvent);
    
    if (result.statusCode === 200) {
      const responseBody = JSON.parse(result.body);
      console.log('✅ テスト結果: 正常に動作しました！ (HTTP 200)');
      console.log('--------------------------------------------------');
      console.log('🤖 AIの回答テキスト:');
      console.log(`「${responseBody.answer}」`);
      console.log('--------------------------------------------------');
      if (responseBody.audio) {
        console.log(`🎵 音声合成データ (Base64): 正常取得完了 (${responseBody.audio.length} 文字)`);
      } else {
        console.log('⚠️ 音声データが空です（フォールバックが発生した可能性があります）');
      }
    } else {
      console.log(`❌ テスト結果: エラーが発生しました (HTTP ${result.statusCode})`);
      console.log('応答:', result.body);
    }
  } catch (err) {
    console.error('❌ テスト実行中に致命的なエラーが発生しました:', err);
  }
}

runTest();
