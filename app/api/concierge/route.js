// ===================================================
// サロン・ド・ビューティー AIコンシェルジュ バックエンド (Next.js App Router)
// 【美容室専用・RAG・Gemini API・複数音声出し分け版】
// ===================================================

import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import https from 'https';

// CORSヘッダー定義
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// VOICEVOX 用の HTTP GET ユーティリティ
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

// VOICEVOX 音声合成 API 呼び出し
async function getVoicevoxAudioV1(text, speaker, apiKey) {
  const url = "https://api.tts.quest/v1/voicevox/?key=" + apiKey + "&text=" + encodeURIComponent(text) + "&speaker=" + speaker;
  const buffer = await httpGet(url);
  if (buffer.length > 0 && buffer[0] === 0x7B) {
    const json = JSON.parse(buffer.toString('utf-8'));
    if (json.error || json.errorMessage) {
      throw new Error(json.error || json.errorMessage);
    }
    const audioUrl = json.mp3StreamingUrl || json.mp3DownloadUrl || json.wavDownloadUrl;
    if (!audioUrl) {
      throw new Error("No download or streaming URL found in VOICEVOX response");
    }
    return audioUrl;
  }
  return buffer.toString('base64');
}

// ナレッジの動的ロードとフォールバック
function loadSalonKnowledge() {
  let knowledge = '';
  try {
    const kPath = path.join(process.cwd(), 'app/api/concierge/salon_knowledge.md');
    if (fs.existsSync(kPath)) {
      knowledge = fs.readFileSync(kPath, 'utf-8');
    }
  } catch (err) {
    console.error("[Backend Gemini] Failed to load salon_knowledge.md, using fallback:", err);
  }

  if (!knowledge) {
    knowledge = `
【サロン・ド・ビューティー（Salon de Beauty）の基本情報】
・店舗名：Salon de Beauty (サロン・ド・ビューティー)
・特徴：くせ毛特化の髪質改善専門サロンです。長年のくせ毛、広がり、パサつきなどの髪のお悩みを根本から解決します。
・AIコンシェルジュ：さくら（Sakura）🌸
・住所：〒150-0001 東京都渋谷区神宮前1-2-3 ビューティービル 2F
・アクセス：東京メトロ表参道駅 A2出口より徒歩3分
・営業時間：10:00 〜 20:00（最終受付 18:00）
・定休日：毎週火曜日
・電話番号：03-1234-5678

【メニュー・料金（税込）】
・プレミアム髪質改善エステ（人気No.1看板メニュー）：
  - 料金：22,000円（税込）
  - 施術時間：約180分
  - 特徴：従来の縮毛矯正とは異なり、特殊なトリートメント成分を髪の深部まで浸透させながらクセを優しく伸ばし、乾かすだけでまとまる艶髪にします。

【よくある質問への対応】
・くせ毛対応：何千人ものくせ毛に悩むお客様を施術してきた「くせ毛特化 of 独自メソッド」があるため、どんなにガンコなくせ毛やうねりでも自然で艶やかなストレートに導くことができます。
・髪のダメージ：髪の状態に合わせて薬剤をオーダーメイドで調合し、ダメージを最小限に抑えながら施術します。
・予約方法：ホットペッパービューティーからの「WEB予約」が可能です。またはお電話（03-1234-5678）でも承っております。
・施術環境：最初から最後まで一人のスタイリストが完全マンツーマンで担当するプライベート空間ですので、リラックスして施術を受けられます。
・駐車場：当サロン専用の無料駐車場はございません。お車でお越しの際は近隣の有料コインパーキングをご利用いただくか、表参道駅から徒歩3分ですので公共交通機関のご利用をおすすめします。
`;
  }
  return knowledge;
}

function optimizeTextForSpeech(text, isEnglish = false) {
  if (!text) return '';
  if (isEnglish) return text.replace(/:/g, ' ');

  let optimized = text;
  
  // 1. Specific phrases/words
  optimized = optimized.replace(/AI/gi, 'エーアイ');
  optimized = optimized.replace(/Salon de Beauty/gi, 'サロンドビューティー');
  optimized = optimized.replace(/Hot Pepper Beauty/gi, 'ホットペッパービューティー');
  optimized = optimized.replace(/WEB予約/gi, 'ウェブよやく');
  optimized = optimized.replace(/WEB/gi, 'ウェブ');
  optimized = optimized.replace(/No\.1/gi, 'ナンバーワン');
  optimized = optimized.replace(/RAG/gi, 'ラグ');
  optimized = optimized.replace(/Next\.js/gi, 'ネクストジェーエス');
  optimized = optimized.replace(/Netlify/gi, 'ネットリファイ');
  optimized = optimized.replace(/URL/gi, 'ユーアールエル');
  optimized = optimized.replace(/スタッフ一同心よりお待ちしております/g, 'スタッフ一同、心よりお待ちしております');
  
  // 2. Numbers, times and rates
  optimized = optimized.replace(/10:00/g, '十時');
  optimized = optimized.replace(/20:00/g, '二十時');
  optimized = optimized.replace(/18:00/g, '十八時');
  optimized = optimized.replace(/180分/g, 'ひゃくはちじゅっぷん');
  
  // 3. Ranges and symbols
  optimized = optimized.replace(/〜/g, 'から');
  optimized = optimized.replace(/・/g, '、');
  optimized = optimized.replace(/➔/g, ' ');
  
  // 4. Prices and currency symbols
  optimized = optimized.replace(/22,000円/g, 'にまんにせんえん');
  optimized = optimized.replace(/¥/g, '');
  optimized = optimized.replace(/,/g, '');
  
  // 5. Floor numbers
  optimized = optimized.replace(/2階/g, 'にかい');
  optimized = optimized.replace(/2F/g, 'にかい');
  
  // 6. Phone number & address hyphens
  optimized = optimized.replace(/03-1234-5678/g, 'れいさん、いちにーさんよん、ごーろくななはち');
  optimized = optimized.replace(/1-2-3/g, 'いちの、にの、さん');
  
  // 7. General cleanup of emojis and brackets
  optimized = optimized.replace(/[【】「」()（）『』\[\]]/g, '');
  optimized = optimized.replace(/[🌸💎❄️🎀👑🌼⭐🌟✨🦊💡🍀🎵👀👩👨🏨📞📱]/g, '');
  optimized = optimized.replace(/[\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF]/g, '');

  // 8. Safety fallback
  optimized = optimized.replace(/[-_]/g, ' ');

  // 9. Cleanup consecutive or leading/trailing commas
  optimized = optimized.replace(/、+/g, '、');
  optimized = optimized.replace(/^、|、$/g, '');

  return optimized;
}

// ==========================================
// Gemini APIを用いたRAG回答生成関数
// ==========================================
async function generateGeminiResponse(userText, isEnglish) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("[Backend Gemini] GEMINI_API_KEY is missing in .env");
    return isEnglish
      ? "I apologize, but my system is currently unavailable. Please contact the salon staff."
      : "申し訳ございません。システムエラーが発生しているため、店舗までお電話（03-1234-5678）にてお問い合わせください。";
  }

  const SALON_KNOWLEDGE = loadSalonKnowledge();

  const SYSTEM_INSTRUCTION_JA = `
あなたは髪質改善専門美容室「Salon de Beauty（サロン・ド・ビューティー）」の公式AIコンシェルジュ「さくら」です。
くせ毛やパサつきなど、髪に悩みを持つお客様に対して、親密になってフレンドリーかつ丁寧な日本語で回答してください。
語尾には「です🌸」「ます🌸」などを自然に使用し、親しみやすく明るい雰囲気を出してください。

【回答における絶対ルール】
1. 提供された【サロンナレッジ】に記載されている情報のみに基づいて回答してください。
2. 【サロンナレッジ】に記載のない情報については、絶対に勝手に推測したり、嘘の情報を創作して回答しないでください。
3. ナレッジに記載がないこと、あるいは答えられない質問（例：具体的な予約の空き状況の確認や、スタイリスト個人の指名料など）に対しては、曖昧に答えず、一律で以下のように回答して、店舗への電話やWEB予約に誘導してください：
   - 「ご質問ありがとうございます。その件につきましては、スタッフが詳しくご案内いたします。お電話は、03-1234-5678 までいつでもお気軽にお問い合わせくださいね🌸」
   - 「申し訳ありません、その質問にはお答えできかねます。詳しい内容につきましては、店舗（03-1234-5678）までお気軽にお問い合わせくださいませ🌸」
4. 回答は簡潔に、100〜150文字程度で分かりやすくまとめてください。
5. 音声合成（TTS）で読み上げるため、余計な記号や絵文字（🌸は除く）は最小限にし、読みやすい自然な日本語にしてください。
`;

  const SYSTEM_INSTRUCTION_EN = `
You are "Sakura", the official AI concierge of the hair salon "Salon de Beauty".
Please answer the user's questions in a friendly, polite, and welcoming tone in English.
Try to use "🌸" naturally in your response to show your friendly personality.

[Absolute Rules for Answering]
1. Answer the question based ONLY on the provided [Salon Knowledge].
2. Do NOT guess, assume, or create any information that is not explicitly written in the [Salon Knowledge].
3. For any questions where the information is not in the [Salon Knowledge], or if you cannot answer, reply with:
   "Thank you for your question. Our staff will be happy to assist you in detail. Please feel free to call us at +81-3-1234-5678 anytime!🌸"
4. Keep the answer concise (about 30-50 words).
5. Minimize extra symbols or emojis (except 🌸) so that Text-to-Speech reads it naturally.
`;

  const systemInstruction = isEnglish ? SYSTEM_INSTRUCTION_EN : SYSTEM_INSTRUCTION_JA;
  const promptText = `
【サロンナレッジ】
${SALON_KNOWLEDGE}

【ユーザーからの質問】
${userText}
`;

  const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
  let lastError = null;

  for (const model of models) {
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
    try {
      console.log(`[Backend Gemini] Trying model: ${model}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: promptText }]
            }
          ],
          systemInstruction: {
            parts: [{ text: systemInstruction }]
          },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1000
          }
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errText = await response.text();
        console.error(`[Backend Gemini] API error response for ${model}:`, errText);
        throw new Error(`Gemini API (${model}) returned status ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidateText) {
        throw new Error(`No text generated in Gemini response for ${model}`);
      }

      console.log(`[Backend Gemini] Success with model: ${model}`);
      return candidateText.trim();
    } catch (err) {
      console.error(`[Backend Gemini] Error with model ${model}:`, err);
      lastError = err;
    }
  }

  // すべてのモデルで失敗した場合、診断ファイルを書き出す
  try {
    const diagPath = path.join(process.cwd(), 'diagnostic_result.json');
    fs.writeFileSync(diagPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      errorType: 'Gemini API Error',
      error: lastError ? lastError.message : 'Unknown error',
      stack: lastError ? lastError.stack : '',
      apiKeyConfigured: !!apiKey,
      apiKeyPrefix: apiKey ? apiKey.substring(0, 10) : ''
    }, null, 2));
    console.log("[Backend Gemini] Saved diagnostic info to diagnostic_result.json");
  } catch (diagErr) {
    console.error("Failed to write diagnostic file:", diagErr);
  }

  return isEnglish
    ? "Thank you for your question. Our staff will be happy to assist you in detail. Please feel free to call us at +81-3-1234-5678 anytime!🌸"
    : "ご質問ありがとうございます。その件につきましては、スタッフが喜んで詳しくご案内いたします。お電話は、03-1234-5678 まで、いつでもお気軽にお問い合わせくださいね🌸";
}

// ==========================================
// OpenAI TTS (Audio API) 連携音声合成関数
// ==========================================
function mapVoiceToOpenAi(voiceName) {
  const v = voiceName.toLowerCase();
  if (v.includes('aoede') || v.includes('shimmer') || v.includes('neural2-f')) {
    return 'shimmer'; // 明るく上品
  }
  if (v.includes('zephyr') || v.includes('nova') || v.includes('kore')) {
    return 'nova'; // ふんわり愛らしい
  }
  if (v.includes('achernar') || v.includes('alloy') || v.includes('neural2-h')) {
    return 'alloy'; // しっとり落ち着いた
  }
  return 'shimmer'; // デフォルト
}

async function generateOpenAiTts(text, voiceName) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("[Backend TTS] OPENAI_API_KEY is missing in env");
    return null;
  }

  const openAiVoice = mapVoiceToOpenAi(voiceName);
  const openAiUrl = 'https://api.openai.com/v1/audio/speech';

  const reqBody = {
    model: 'tts-1',
    input: text,
    voice: openAiVoice,
    response_format: 'mp3'
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(openAiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(reqBody),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      return Buffer.from(arrayBuffer).toString('base64');
    } else {
      const errText = await response.text();
      console.error("[Backend TTS] OpenAI TTS Error:", errText);
      return null;
    }
  } catch (err) {
    console.error("[Backend TTS] OpenAI TTS fetch failed or timed out:", err);
    return null;
  }
}

// ==========================================
// Google Cloud TTS 連携音声合成関数
// ==========================================
async function generateGcpTts(text, voiceName, languageCode) {
  const apiKey = process.env.GCP_TTS_API_KEY;
  if (!apiKey) {
    console.error("[Backend TTS] GCP_TTS_API_KEY is missing in .env");
    return null;
  }

  const gcpUrl = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`;
  
  // Chirp 音声 (Chirp3-HDなど) は現時点でピッチパラメータをサポートしていないため除外する
  const audioConfig = { 
    audioEncoding: 'MP3',
    speakingRate: 1.1
  };
  
  if (!voiceName.toLowerCase().includes('chirp')) {
    audioConfig.pitch = 4.0; 
  }

  const gcpReq = {
    input: { text },
    voice: { languageCode, name: voiceName },
    audioConfig
  };

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    
    const gcpRes = await fetch(gcpUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(gcpReq),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (gcpRes.ok) {
      const gcpData = await gcpRes.json();
      return gcpData.audioContent;
    } else {
      const errText = await gcpRes.text();
      console.error("[Backend TTS] GCP TTS Error:", errText);
      return null;
    }
  } catch (err) {
    console.error("[Backend TTS] GCP TTS fetch failed or timed out:", err);
    return null;
  }
}

// ==========================================
// 初回起動時の静的挨拶音声自動生成
// ==========================================
async function ensureGreetingAudios() {
  const publicDir = path.join(process.cwd(), 'public');
  const jaPath = path.join(publicDir, 'greeting_ja.mp3');
  const enPath = path.join(publicDir, 'greeting_en.mp3');

  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }

  const jaGreetingText = 'こんにちは！サロン・ド・ビューティーのAIコンシェルジュ、さくらです。くせ毛のお悩みやメニューについて、何でもお聞きくださいね。';
  const enGreetingText = "Hello! I'm Sakura, the AI concierge of Salon de Beauty. Please feel free to ask about our hair care menu, frizzy hair concerns, or anything else.";

  if (!fs.existsSync(jaPath)) {
    console.log("[Backend Initialize] Generating static greeting_ja.mp3...");
    try {
      let audio = null;
      if (process.env.OPENAI_API_KEY) {
        audio = await generateOpenAiTts(jaGreetingText, 'ja-JP-Chirp3-HD-Aoede');
      }
      if (!audio) {
        audio = await generateGcpTts(jaGreetingText, 'ja-JP-Chirp3-HD-Aoede', 'ja-JP');
      }
      
      // GCP TTS が失敗した場合は VOICEVOX (スピーカーID: 2 = 四国めたん) を試す
      if (!audio) {
        const voicevoxKeys = [
          process.env.VOICEVOX_API_KEY_1,
          process.env.VOICEVOX_API_KEY_2,
          process.env.VOICEVOX_API_KEY_3,
        ].filter(k => k && k.trim());

        console.log("[Backend Initialize] Static greeting: falling back to VOICEVOX.");
        for (let i = 0; i < voicevoxKeys.length; i++) {
          try {
            audio = await getVoicevoxAudioV1(optimizeTextForSpeech(jaGreetingText, false), 2, voicevoxKeys[i]);
            console.log("[Backend Initialize] VOICEVOX Success for greeting with Key #" + (i + 1));
            break;
          } catch (err) {
            console.error("[Backend Initialize] VOICEVOX Key #" + (i + 1) + " failed:", err.message);
          }
        }
      }

      if (audio) {
        fs.writeFileSync(jaPath, Buffer.from(audio, 'base64'));
        console.log("[Backend Initialize] Saved greeting_ja.mp3 successfully.");
      } else {
        console.error("[Backend Initialize] Failed to generate greeting_ja.mp3 from both GCP and VOICEVOX.");
      }
    } catch (e) {
      console.error("Failed to generate static greeting_ja.mp3:", e);
    }
  }

  if (!fs.existsSync(enPath)) {
    console.log("[Backend Initialize] Generating static greeting_en.mp3...");
    try {
      let audio = null;
      if (process.env.OPENAI_API_KEY) {
        audio = await generateOpenAiTts(enGreetingText, 'en-US-Chirp3-HD-Aoede');
      }
      if (!audio) {
        audio = await generateGcpTts(enGreetingText, 'en-US-Chirp3-HD-Aoede', 'en-US');
      }
      if (audio) {
        fs.writeFileSync(enPath, Buffer.from(audio, 'base64'));
        console.log("[Backend Initialize] Saved greeting_en.mp3 successfully.");
      }
    } catch (e) {
      console.error("Failed to generate static greeting_en.mp3:", e);
    }
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req) {
  try {
    // 挨拶音声の存在確認と自動生成
    await ensureGreetingAudios();

    const body = await req.json();
    const { text = '', voice = 'ja-JP-Chirp3-HD-Aoede', ttsOnly = false, textOnly = false } = body;

    if (!text) {
      return NextResponse.json({ error: 'Text required' }, { status: 400, headers: corsHeaders });
    }

    const isEnglish = voice.toLowerCase().includes('en-us');
    let answerText = "";

    if (ttsOnly) {
      answerText = text;
    } else {
      answerText = await generateGeminiResponse(text, isEnglish);
    }

    if (textOnly) {
      return NextResponse.json({ answer: answerText, audio: null, mimeType: 'audio/mp3' }, { headers: corsHeaders });
    }

    const speechReadyText = optimizeTextForSpeech(answerText, isEnglish);
    const languageCode = isEnglish ? 'en-US' : 'ja-JP';

    console.log(`[Backend TTS] Synthesizing for voice: ${voice}`);
    let audioContent = null;
    if (process.env.OPENAI_API_KEY) {
      audioContent = await generateOpenAiTts(speechReadyText, voice);
    }
    if (!audioContent) {
      audioContent = await generateGcpTts(speechReadyText, voice, languageCode);
    }

    // GCP TTS が失敗した場合は VOICEVOX (日本語のみ) を試す
    if (!audioContent && !isEnglish) {
      let voicevoxSpeaker = 2;
      const vLower = voice.toLowerCase();
      if (vLower.includes('achernar') || vLower.includes('aoi')) voicevoxSpeaker = 8;
      else if (vLower.includes('zephyr') || vLower.includes('mei')) voicevoxSpeaker = 10;

      const voicevoxKeys = [
        process.env.VOICEVOX_API_KEY_1,
        process.env.VOICEVOX_API_KEY_2,
        process.env.VOICEVOX_API_KEY_3,
      ].filter(k => k && k.trim());

      console.log("[Backend TTS] Falling back to VOICEVOX. Speaker ID: " + voicevoxSpeaker + " / Keys available: " + voicevoxKeys.length);

      for (let i = 0; i < voicevoxKeys.length; i++) {
        try {
          console.log("[Backend TTS] Trying VOICEVOX Key #" + (i + 1));
          audioContent = await getVoicevoxAudioV1(speechReadyText, voicevoxSpeaker, voicevoxKeys[i]);
          console.log("[Backend TTS] VOICEVOX Success with Key #" + (i + 1));
          break;
        } catch (err) {
          console.error("[Backend TTS] VOICEVOX Key #" + (i + 1) + " failed:", err.message);
        }
      }
    }

    if (audioContent) {
      return NextResponse.json({
        answer: answerText,
        audio: audioContent,
        mimeType: 'audio/mp3'
      }, { headers: corsHeaders });
    } else {
      return NextResponse.json({
        answer: answerText,
        audio: null,
        error: "TTS Synthesis failed"
      }, { headers: corsHeaders });
    }

  } catch (err) {
    console.error('Handler error:', err);
    return NextResponse.json({ error: err.toString() }, { status: 500, headers: corsHeaders });
  }
}
