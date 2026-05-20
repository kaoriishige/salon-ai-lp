// ===================================================
// 那須ミッドシティホテル AIコンシェルジュ バックエンド (Netlify Functions)
// 【絶対堅牢・LLM完全排除・RAG完全準拠版】
// RAGにない情報は一切回答せず、内線9番（フロント）へ即座に誘導します。
// ===================================================

const https = require('https');

// リダイレクト追跡機能付きの超堅牢な HTTP GET 関数 (VOICEVOX 音声取得用)
function httpGet(url) {
  return new Promise((resolve, reject) => {
    const handleRequest = (currentUrl) => {
      https.get(currentUrl, (res) => {
        if (res.statusCode === 301 || res.statusCode === 302) {
          const redirectUrl = res.headers.location;
          if (redirectUrl) {
            handleRequest(redirectUrl);
            return;
          }
        }
        if (res.statusCode !== 200) {
          reject(new Error("GET failed with status " + res.statusCode + " for " + currentUrl));
          return;
        }
        const chunks = [];
        res.on('data', (chunk) => chunks.push(chunk));
        res.on('end', () => {
          resolve(Buffer.concat(chunks));
        });
      }).on('error', reject);
    };
    handleRequest(url);
  });
}



function optimizeTextForSpeech(text, isEnglish = false) {
  if (!text) return '';
  if (isEnglish) return text.replace(/:/g, ' ');

  let optimized = text;
  // 1. Specific phrases/words (case-insensitive for half-width alphabets)
  optimized = optimized.replace(/TKG/gi, 'たまごかけごはん');
  optimized = optimized.replace(/Wi-Fi/gi, 'ワイファイ');
  optimized = optimized.replace(/wifi/gi, 'ワイファイ');
  optimized = optimized.replace(/LAN/gi, 'ラン');
  optimized = optimized.replace(/Aカード/gi, 'えーかーど');
  optimized = optimized.replace(/那須御養卵/g, 'なすごようらん');
  optimized = optimized.replace(/大鷹の湯/g, 'おおたかのゆ');
  optimized = optimized.replace(/内線9番/g, 'ないせん きゅうばん');
  
  // 2. Numbers, times and rates
  optimized = optimized.replace(/6:30/g, '六時半');
  optimized = optimized.replace(/6:45/g, '六時四十五分');
  optimized = optimized.replace(/9:00/g, '九時');
  optimized = optimized.replace(/9:30/g, '九時半');
  optimized = optimized.replace(/15:00/g, '十五時');
  optimized = optimized.replace(/11:00/g, '十一時');
  optimized = optimized.replace(/17:30/g, '十七時半');
  optimized = optimized.replace(/21:00/g, '二十一時');
  
  // 3. Ranges and symbols
  optimized = optimized.replace(/〜/g, 'から');
  optimized = optimized.replace(/・/g, '、');
  
  // 4. Prices and currency symbols
  optimized = optimized.replace(/¥1,500/g, '千五百円');
  optimized = optimized.replace(/1,500円/g, '千五百円');
  optimized = optimized.replace(/1,000円/g, '千円');
  optimized = optimized.replace(/650円/g, '六百五十円');
  optimized = optimized.replace(/¥/g, '');
  optimized = optimized.replace(/,/g, '');
  
  // 5. Percentages
  optimized = optimized.replace(/10%/g, '十パーセント');
  
  // 6. Floor numbers
  optimized = optimized.replace(/1階/g, 'いっかい');
  optimized = optimized.replace(/2階/g, 'にかい');
  
  // 7. Time/duration/counts
  optimized = optimized.replace(/24時間/g, 'にじゅうよじかん');
  optimized = optimized.replace(/3分/g, 'さんぷん');
  optimized = optimized.replace(/1台/g, 'いちだい');
  
  // 8. Phone number & address hyphens
  optimized = optimized.replace(/0287-67-1400/g, 'れい にー はち なな、ろく なな、いち よん ぜろ ぜろ');
  optimized = optimized.replace(/1-1-10/g, 'いち の いち の じゅう');
  
  // 9. General cleanup of emojis and brackets
  optimized = optimized.replace(/[【】「」()（）]/g, '');
  optimized = optimized.replace(/🍆/g, '');
  optimized = optimized.replace(/[🌸💎❄️🎀👑🌼⭐🌟✨🦊💡🍀🎵👀👩👨🏨📞📱]/g, '');
  optimized = optimized.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');

  return optimized;
}

// VOICEVOX v1 API から高速に音声バイナリを直接取得する関数 (JSONレスポンスのURLから取得)
async function getVoicevoxAudioV1(text, speaker, apiKey) {
  const url = "https://api.tts.quest/v1/voicevox/?key=" + apiKey + "&text=" + encodeURIComponent(text) + "&speaker=" + speaker;
  const buffer = await httpGet(url);
  if (buffer.length > 0 && buffer[0] === 0x7B) {
    const json = JSON.parse(buffer.toString('utf-8'));
    if (json.error || json.errorMessage) {
      throw new Error(json.error || json.errorMessage);
    }
    
    // ストリーミングURLを優先的に直接返却する（ポーリング待機を完全排除）
    const audioUrl = json.mp3StreamingUrl || json.mp3DownloadUrl || json.wavDownloadUrl;
    if (!audioUrl) {
      throw new Error("No download or streaming URL found in VOICEVOX response");
    }
    return audioUrl;
  }
  return buffer.toString('base64');
}

exports.handler = async (event) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers: corsHeaders, body: '' };

  try {
    const { text = '', voice = 'ja-JP-Chirp3-HD-Aoede', ttsOnly = false, textOnly = false } = JSON.parse(event.body || '{}');

    if (!text) return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Text required' }) };

    let answerText = "";
    let isPreciseMatch = false;

    if (ttsOnly) {
      answerText = text;
      isPreciseMatch = true;
    } else {
      const q = text.toLowerCase().trim();

      // ==========================================
      // RAG（ホテルナレッジ）に基づくローカル判定のみを実行（推測・嘘の排除）
      // ==========================================
      
      // 0. 挨拶
      if (q.includes('こんにちは') || q.includes('こんばんは') || q.includes('おはよう') || q.includes('はじめまして') || q.includes('ハロー') || q === 'やあ' || q === 'どうも' || q.includes('もりなす')) {
        answerText = "こんにちは！那須ミッドシティホテル公式マスコット「もりなすちゃん」です🍆 どんなことでもお気軽にお尋ねくださいね。";
        isPreciseMatch = true;
      }
      // 1. コインランドリー
      else if (q.includes('コインランドリー') || q.includes('ランドリー') || q.includes('洗濯') || q.includes('乾燥機') || q.includes('laundry') || q.includes('washing')) {
        answerText = "当ホテルの1階コインランドリーエリアに、有料のドラム式洗濯乾燥機がございます！24時間いつでもご利用いただけます。";
        isPreciseMatch = true;
      }
      // 2. 自販機・製氷機・電子レンジ
      else if (q.includes('自販機') || q.includes('自動販売機') || q.includes('製氷機') || q.includes('氷') || q.includes('電子レンジ') || q.includes('レンジ') || q.includes('温め') || q.includes('vending') || q.includes('microwave') || q.includes('ice')) {
        answerText = "1階のコインランドリーエリアに、ソフトドリンク自販機、無料で使える自動製氷機、および電子レンジ（1台）を設置しております！ご自由にご利用ください。";
        isPreciseMatch = true;
      }
      // 3. 喫煙所
      else if (q.includes('喫煙') || q.includes('たばこ') || q.includes('タバコ') || q.includes('吸う') || q.includes('smoking') || q.includes('喫煙所') || q.includes('喫煙室')) {
        answerText = "当ホテルは全室禁煙となっておりますが、1階のコインランドリーエリアに新設された専用の喫煙所をご利用いただけます。";
        isPreciseMatch = true;
      }
      // 4. 朝食（時間・メニューなど）
      else if (q.includes('朝食') || q.includes('バイキング') || q.includes('ごはん') || q.includes('朝ごはん') || q.includes('卵かけ') || q.includes('tkg') || q.includes('breakfast')) {
        answerText = "朝食バイキングは6:45〜9:30に1階レストラン「オールヴォワール」にて【宿泊者全員無料】で提供しております！那須御養卵TKGが大変人気です。";
        isPreciseMatch = true;
      }
      // 5. 夕食
      else if (q.includes('夕食') || q.includes('ディナー') || q.includes('レストラン') || q.includes('ちょい飲み') || q.includes('コース') || q.includes('ディナーコース') || q.includes('dinner')) {
        answerText = "夕食は1階レストラン「オールヴォワール」にて17:30〜21:00まで営業しております。那須高原豚ステーキやちょい飲みセット（¥1,500）がございます。";
        isPreciseMatch = true;
      }
      // 6. 温泉・おおたかの湯
      else if (q.includes('温泉') || q.includes('おおたか') || q.includes('大鷹') || q.includes('千本松') || q.includes('駅前温泉') || q.includes('日帰り温泉') || q.includes('onsen')) {
        answerText = "当館に大浴場はございませんが、車で10分ほどの極上温泉『大鷹（おおたか）の湯』が大変おすすめです！とろみあるウーロン茶色の極上モール泉をお楽しみいただけます。";
        isPreciseMatch = true;
      }
      // 7. Aカード・キャッシュバック
      else if (q.includes('aカード') || q.includes('エーカード') || q.includes('キャッシュバック') || q.includes('ポイント') || q.includes('acard') || q.includes('cashback')) {
        answerText = "Aカードは年会費無料で、宿泊料金の10%以上がポイント還元され、貯まったポイントはフロントで現金キャッシュバックできる非常にお得なカードです！";
        isPreciseMatch = true;
      }
      // 8. 添い寝
      else if (q.includes('添い寝') || q.includes('添寝') || q.includes('子供') || q.includes('子ども') || q.includes('小学生') || q.includes('添いね') || q.includes('child')) {
        answerText = "小学生以下のお子様は、保護者の方と同じベッドで添い寝される場合、宿泊料金は無料になります（アメニティは付きません）。朝食代は別途650円頂戴します。";
        isPreciseMatch = true;
      }
      // 9. ビジネス・客室設備・Wi-Fi
      else if (q.includes('ビジネス') || q.includes('デスク') || q.includes('wifi') || q.includes('有線') || q.includes('インターネット') || q.includes('出張') || q.includes('デスクライト') || q.includes('ズボンプレッサー')) {
        answerText = "全室Wi-Fi・有線LAN完備、幅2m以上の大型デスクにデスクライトやコンセント、ズボンプレッサーや消臭スプレーを完備しておりビジネス出張に最適です！";
        isPreciseMatch = true;
      }
      // 10. チェックイン・チェックアウト
      else if (q.includes('チェックイン') || q.includes('チェックアウト') || q.includes('時間') || q.includes('checkin') || q.includes('checkout')) {
        answerText = "チェックインは15:00から、チェックアウトは11:00まででございます。";
        isPreciseMatch = true;
      }
      // 11. 駐車場
      else if (q.includes('駐車場') || q.includes('駐車') || q.includes('車') || q.includes('parking') || q.includes('car')) {
        answerText = "普通乗用車用の無料駐車場を完備しております（先着順）。大型車や中型車の場合は事前にお電話にてご相談ください。";
        isPreciseMatch = true;
      }
      // 12. アクセス・駅・行き方
      else if (q.includes('アクセス') || q.includes('駅') || q.includes('行き方') || q.includes('場所') || q.includes('住所') || q.includes('那須塩原') || q.includes('access') || q.includes('station')) {
        answerText = "那須塩原駅の東口から徒歩3分でございます！住所は栃木県那須塩原市方京1-1-10でございます。";
        isPreciseMatch = true;
      }

      // ==========================================
      // RAG（上記辞書）にマッチしない場合の一律フォールバック（LLMへの問い合わせを完全遮断）
      // ==========================================
      if (!isPreciseMatch) {
        answerText = "ご質問ありがとうございます。あいにくその件につきましては詳細なデータが手元にございません。客室の電話機より内線9番でフロントまでおかけいただければ、スタッフが喜んで詳しくご案内いたします。";
      }
    }

    const isEnglish = voice.toLowerCase().includes('en-us');
    const speechReadyText = optimizeTextForSpeech(answerText, isEnglish);

    let audioContent = null;

    // textOnly=true の場合はTTS合成を完全スキップして即時返却（フロントエンドが後から文ごとにttsOnly=trueで再取得するため不要）
    if (textOnly) {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          answer: answerText,
          audio: null,
          mimeType: 'audio/mp3'
        })
      };
    }

    // VOICEVOX APIのみで音声合成（3キーローテーション）
    let voicevoxSpeaker = 2;
    const vLower = voice.toLowerCase();
    if (vLower.includes('achernar') || vLower.includes('aoi')) voicevoxSpeaker = 8;
    else if (vLower.includes('zephyr') || vLower.includes('mei')) voicevoxSpeaker = 10;

    const voicevoxKeys = [
      process.env.VOICEVOX_API_KEY_1,
      process.env.VOICEVOX_API_KEY_2,
      process.env.VOICEVOX_API_KEY_3,
    ].filter(k => k && k.trim());

    console.log("[Backend TTS] VOICEVOX Speaker ID: " + voicevoxSpeaker + " / Keys available: " + voicevoxKeys.length);

    for (let i = 0; i < voicevoxKeys.length; i++) {
      try {
        console.log("[Backend TTS] Trying VOICEVOX Key #" + (i + 1));
        audioContent = await getVoicevoxAudioV1(speechReadyText, voicevoxSpeaker, voicevoxKeys[i]);
        console.log("[Backend TTS] Success with Key #" + (i + 1));
        break; // 成功したらループを抜ける
      } catch (err) {
        console.error("[Backend TTS] Key #" + (i + 1) + " failed:", err.message);
        if (i === voicevoxKeys.length - 1) {
          console.error("[Backend TTS] All VOICEVOX keys exhausted - text only response");
        }
      }
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        answer: answerText,
        audio: audioContent,
        mimeType: 'audio/mp3'
      })
    };

  } catch (err) {
    console.error('Handler error:', err);
    return { 
      statusCode: 500, 
      headers: corsHeaders, 
      body: JSON.stringify({ error: err.toString() }) 
    };
  }
};
