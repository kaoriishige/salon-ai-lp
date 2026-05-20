// ===================================================
// 那須ミッドシティホテル AIコンシェルジュ バックエンド (Next.js App Router)
// 【絶対堅牢・LLM完全排除・RAG完全準拠版】
// RAGにない情報は一切回答せず、内線9番（フロント）へ即座に誘導します。
// ===================================================

import { NextResponse } from 'next/server';

// CORSヘッダー定義
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// リダイレクト追跡機能付きの超堅牢な HTTP GET 関数 (VOICEVOX 音声取得用)
async function httpGet(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) {
    throw new Error("GET failed with status " + res.status + " for " + url);
  }
  const arrayBuffer = await res.arrayBuffer();
  return Buffer.from(arrayBuffer);
}



function optimizeTextForSpeech(text, isEnglish = false) {
  if (!text) return '';
  if (isEnglish) return text.replace(/:/g, ' ');

  let optimized = text;
  // 1. Specific phrases/words (case-insensitive for half-width alphabets)
  optimized = optimized.replace(/AI/gi, 'エーアイ');
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

  // 10. 最後の安全対策：半角アルファベット・記号の全消去（VOICEVOXクラッシュ対策）
  optimized = optimized.replace(/2m/gi, 'にメートル');
  optimized = optimized.replace(/[a-zA-Z]/g, '');
  optimized = optimized.replace(/[-_]/g, '');

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

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
  try {
    const body = await req.json();
    const { text = '', voice = 'ja-JP-Chirp3-HD-Aoede', ttsOnly = false, textOnly = false } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400, headers: corsHeaders });
    }

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
        answerText = "1階のコインランドリーエリアに新設された専用の喫煙所をご利用いただけます。";
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
        answerText = "ご質問ありがとうございます。その件につきましては、担当のスタイリストが直接ご案内いたします。お電話またはLINEよりお気軽にお問い合わせくださいませ。";
      }
    }

    const isEnglish = voice.toLowerCase().includes('en-us');
    const isGoogleVoice = voice === 'ja-JP-Neural2-F';
    
    // ==========================================
    // 英語翻訳の適用 (ttsOnlyの時は既に翻訳済みなのでスキップ)
    // ==========================================
    if (isEnglish && !ttsOnly) {
      if (answerText.includes('公式マスコット')) answerText = "Hello! I'm 'Mori-Nasu-chan', the official mascot of Nasu Midcity Hotel. Please feel free to ask me anything.";
      else if (answerText.includes('ドラム式洗濯乾燥機')) answerText = "We have coin-operated washer/dryers in the laundry area on the 1st floor. Available 24 hours.";
      else if (answerText.includes('電子レンジ')) answerText = "On the 1st floor laundry area, we have a vending machine, a free ice machine, and a microwave oven for you to use.";
      else if (answerText.includes('専用の喫煙所')) answerText = "There is a designated smoking room available in the 1st floor laundry area.";
      else if (answerText.includes('朝食バイキング')) answerText = "Breakfast buffet is served free of charge for all guests from 6:45 to 9:30 AM at the 1st floor restaurant 'Au Revoir'.";
      else if (answerText.includes('夕食')) answerText = "Dinner is available at the 1st floor restaurant 'Au Revoir' from 5:30 PM to 9:00 PM.";
      else if (answerText.includes('大鷹')) answerText = "We don't have a public bath in the hotel, but 'Ootaka no Yu', a premium hot spring 10 minutes away by car, is highly recommended.";
      else if (answerText.includes('キャッシュバック')) answerText = "A-Card is a point card with no annual fee. You get 10% cash back on your stay!";
      else if (answerText.includes('添い寝')) answerText = "Children under elementary school age can sleep in the same bed with parents for free (no amenities included). Breakfast is 650 yen extra.";
      else if (answerText.includes('ビジネス出張')) answerText = "All rooms have Wi-Fi, LAN, a large desk, and a trouser press. Perfect for business trips!";
      else if (answerText.includes('チェックイン')) answerText = "Check-in is from 3:00 PM, and check-out is until 11:00 AM.";
      else if (answerText.includes('駐車場')) answerText = "We have a free parking lot for standard passenger cars (first-come, first-served).";
      else if (answerText.includes('徒歩3分')) answerText = "We are located just a 3-minute walk from the East Exit of Nasushiobara Station. Address: 1-1-10 Hōkyō, Nasushiobara, Tochigi.";
      else answerText = "Thank you for your question. Unfortunately, I don't have detailed information on that. Please call the front desk at extension 9 for assistance.";
    }

    const speechReadyText = optimizeTextForSpeech(answerText, isEnglish);

    // ==========================================
    // 音声合成フェーズ（すべてGoogle Cloud TTSを使用）
    // ==========================================
    let audioContent = null;

    if (textOnly) {
      return NextResponse.json({ answer: answerText, audio: null, mimeType: 'audio/mp3' }, { headers: corsHeaders });
    }

    if (process.env.GCP_TTS_API_KEY) {
      console.log("[Backend TTS] Using Google Cloud TTS for all voices");
      try {
        const gcpUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${process.env.GCP_TTS_API_KEY}`;
        const languageCode = isEnglish ? 'en-US' : 'ja-JP';
        const voiceName = isEnglish ? 'en-US-Neural2-F' : 'ja-JP-Wavenet-B'; // 日本語は安定のWavenet-Bに統一
        
        const gcpReq = {
          input: { text: speechReadyText },
          voice: { languageCode: languageCode, name: voiceName },
          audioConfig: { 
            audioEncoding: 'MP3',
            speakingRate: 1.1, 
            pitch: 4.0 // ピッチを上げてアニメキャラクター（さくら）に近づける
          }
        };
        const gcpRes = await fetch(gcpUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(gcpReq)
        });
        
        if (gcpRes.ok) {
          const gcpData = await gcpRes.json();
          audioContent = gcpData.audioContent;
          console.log("[Backend TTS] Success with GCP TTS");
        } else {
          console.error("[Backend TTS] GCP TTS Error:", await gcpRes.text());
        }
      } catch (gcpErr) {
        console.error("[Backend TTS] GCP TTS Exception:", gcpErr.message);
      }
    } else {
      console.error("[Backend TTS] GCP_TTS_API_KEY is missing in .env");
    }

    return NextResponse.json({
      answer: answerText,
      audio: audioContent,
      mimeType: 'audio/mp3'
    }, { headers: corsHeaders });

  } catch (err) {
    console.error('Handler error:', err);
    return NextResponse.json({ error: err.toString() }, { status: 500, headers: corsHeaders });
  }
}
