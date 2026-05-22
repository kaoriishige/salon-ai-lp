// ===================================================
// サクセス研究社 AI導入コンサルティング バックエンド (Next.js App Router)
// 【店舗系支援・RAG・Gemini API・複数音声出し分け版】
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
【サクセス研究社の基本情報】
・会社名：サクセス研究社
・代表者：田代 稔 (たしろ みのる)
・肩書：AI導入コンサルタント、AIエージェントマネージャー、AIエージェントマネージャー養成スクール校長
・住所：〒325-0026 栃木県那須塩原市上厚崎578-30
・メールアドレス：success.kks.ai@gmail.com
・お問い合わせフォーム：https://ssgform.com/s/3TQ1jL8kw53N
・事業内容：BtoC店舗系（美容室、整体院、飲食店、自動車販売等）へのAIエージェント（AIコンシェルジュ）導入コンサルティング、および自社でAIエージェントを運用できる人材を育成する「AIエージェントマネージャー養成スクール」の運営。

【提供サービス（税込）】
・AIエージェント導入コンサルティング：個別お見積もり（初回オンライン無料相談実施中）。24時間稼働のAI応答システムをWebサイトに組み込みます。
・AIエージェントマネージャー養成スクール：説明会にて個別にご案内。ノーコードでAIエージェントの構築や運用ができる人材を育成します。

【AIエージェント導入実績】
・サロンドビューティー AIコンシェルジュ (https://salon-ai-lp.netlify.app/)
・adtown診断 (https://adtownshindan.netlify.app/)
・沼井農園 (https://numainoen.netlify.app/)
・Hikarino休日 (https://hikarino-seitai.netlify.app/)
・自動車販売 (https://zidosyahanbai.netlify.app/)
・ラーメンHP (https://ramenhp.netlify.app/)
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
  optimized = optimized.replace(/サクセス研究社/g, 'サクセスケンキュウシャ');
  optimized = optimized.replace(/田代\s*稔/g, 'タシロミノル');
  optimized = optimized.replace(/AI導入コンサルタント/g, 'エーアイどうにゅうコンサルタント');
  optimized = optimized.replace(/AIエージェントマネージャー/g, 'エーアイエージェントマネージャー');
  optimized = optimized.replace(/養成スクール/g, 'ようせいスクール');
  optimized = optimized.replace(/Salon de Beauty/gi, 'サロンドビューティー');
  optimized = optimized.replace(/Hot Pepper Beauty/gi, 'ホットペッパービューティー');
  optimized = optimized.replace(/WEB予約/gi, 'ウェブよやく');
  optimized = optimized.replace(/WEB/gi, 'ウェブ');
  optimized = optimized.replace(/No\.1/gi, 'ナンバーワン');
  optimized = optimized.replace(/RAG/gi, 'ラグ');
  optimized = optimized.replace(/Next\.js/gi, 'ネクストジェーエス');
  optimized = optimized.replace(/Netlify/gi, 'ネットリファイ');
  optimized = optimized.replace(/URL/gi, 'ユーアールエル');
  
  // 実績名
  optimized = optimized.replace(/adtown診断/g, 'アドタウンシンダン');
  optimized = optimized.replace(/沼井農園/g, 'ヌマイノウエン');
  optimized = optimized.replace(/Hikarino休日/g, 'ヒカリノキュウジツ');
  optimized = optimized.replace(/自動車販売/g, 'ジドウシャハンバイ');
  optimized = optimized.replace(/ラーメンHP/g, 'ラーメンホームページ');

  // URLを読み上げから除外
  optimized = optimized.replace(/https?:\/\/[\w!\?/\+\-_~=;\.,\*&@#\$%\(\)'"\+]+/g, ' ');

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
  optimized = optimized.replace(/¥/g, '');
  optimized = optimized.replace(/,/g, '');
  
  // 5. Floor numbers
  optimized = optimized.replace(/2階/g, 'にかい');
  optimized = optimized.replace(/2F/g, 'にかい');
  
  // 6. Phone number & address hyphens
  optimized = optimized.replace(/03-1234-5678/g, 'れいさん、いちにーさんよん、ごーろくななはち');
  optimized = optimized.replace(/325-0026/g, 'さんにいごの、れいれいにーろく');
  optimized = optimized.replace(/578-30/g, 'ごーななはちの、さんじゅう');
  optimized = optimized.replace(/那須塩原市上厚崎/g, 'ナスシオバラシカミアツサキ');
  
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
      ? "I apologize, but my system is currently unavailable. Please contact the consultant team."
      : "申し訳ございません。システムエラーが発生しているため、サクセス研究社のお問い合わせページまたはメール（success.kks.ai@gmail.com）にてお問い合わせください。";
  }

  const SALON_KNOWLEDGE = loadSalonKnowledge();

  const SYSTEM_INSTRUCTION_JA = `
あなたはサクセス研究社の代表であり、AI導入コンサルタント、AIエージェントマネージャー養成スクール校長を務める「田代 稔 (たしろ みのる)」をモデルにした公式AIエージェントです。
店舗のAI導入やスクールに興味をお持ちのお客様に対し、親切で知的、かつ信頼感のあるビジネス丁寧語（「です」「ます」調）で回答してください。
親しみやすさを持ちつつ、プロフェッショナルとしての説得力がある口調を心がけてください。

【回答における絶対ルール】
1. 提供された【ナレッジ】に記載されている情報のみに基づいて回答してください。
2. 【ナレッジ】に記載のない情報については、絶対に勝手に推測したり、嘘の情報を創作して回答しないでください。
3. ナレッジに記載がないこと、あるいは答えられない質問に対しては、一律で以下のように回答して、公式のお問い合わせ入力ページやメールアドレスに誘導してください：
   - 「ご質問ありがとうございます。その件につきましては、代表の田代、またはスタッフが詳しくご案内いたします。詳細につきましては、お問い合わせ入力ページ（https://ssgform.com/s/3TQ1jL8kw53N）またはメール（success.kks.ai@gmail.com）までいつでもお気軽にお問い合わせください。」
4. 回答は簡潔に、100〜150文字程度で分かりやすくまとめてください。
5. 音声合成（TTS）で読み上げるため、余計な記号や絵文字は最小限にしてください。
`;

  const SYSTEM_INSTRUCTION_EN = `
You are the official AI agent modeled after Minoru Tashiro, the representative of Success Kenkyusha and AI implementation consultant.
Please answer the user's questions in a friendly, polite, and professional business tone in English.

[Absolute Rules for Answering]
1. Answer the question based ONLY on the provided [Success Kenkyusha Knowledge].
2. Do NOT guess, assume, or create any information that is not explicitly written in the [Knowledge].
3. For any questions where the information is not in the [Knowledge], or if you cannot answer, reply with:
   "Thank you for your question. Our team will be happy to assist you in detail. Please feel free to contact us via the contact page (https://ssgform.com/s/3TQ1jL8kw53N) or email (success.kks.ai@gmail.com) anytime."
4. Keep the answer concise (about 30-50 words).
5. Minimize extra symbols or emojis so that Text-to-Speech reads it naturally.
`;

  const systemInstruction = isEnglish ? SYSTEM_INSTRUCTION_EN : SYSTEM_INSTRUCTION_JA;
  const promptText = `
【ナレッジ】
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
    ? "Thank you for your question. Our team will be happy to assist you in detail. Please feel free to contact us via the contact page (https://ssgform.com/s/3TQ1jL8kw53N) or email (success.kks.ai@gmail.com) anytime."
    : "ご質問ありがとうございます。その件につきましては、代表の田代、またはスタッフが詳しくご案内いたします。詳細につきましては、お問い合わせ入力ページ（https://ssgform.com/s/3TQ1jL8kw53N）またはメール（success.kks.ai@gmail.com）までいつでもお気軽にお問い合わせください。";
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
    audioConfig.pitch = 0.0; // 男性音声なのでピッチ調整を元に戻す(または適切なピッチに設定)
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

  const jaGreetingText = 'こんにちは！サクセス研究社の代表、AI導入コンサルタントの田代稔です。店舗へのAIエージェント導入や、AIエージェントマネージャー養成スクールについて、何でもお気軽にご質問くださいね。';
  const enGreetingText = "Hello! I am Minoru Tashiro, the representative of Success Kenkyusha and AI implementation consultant. Please feel free to ask about introducing AI agents to your store or our training school.";

  if (!fs.existsSync(jaPath)) {
    console.log("[Backend Initialize] Generating static greeting_ja.mp3...");
    try {
      // 男性デフォルトボイス「ja-JP-Chirp3-HD-Sadachbia」
      let audio = await generateGcpTts(jaGreetingText, 'ja-JP-Chirp3-HD-Sadachbia', 'ja-JP');
      
      // GCP TTS が失敗した場合は VOICEVOX (スピーカーID: 13 = 青山龍星) を試す
      if (!audio) {
        const voicevoxKeys = [
          process.env.VOICEVOX_API_KEY_1,
          process.env.VOICEVOX_API_KEY_2,
          process.env.VOICEVOX_API_KEY_3,
        ].filter(k => k && k.trim());

        console.log("[Backend Initialize] Static greeting: falling back to VOICEVOX.");
        for (let i = 0; i < voicevoxKeys.length; i++) {
          try {
            audio = await getVoicevoxAudioV1(optimizeTextForSpeech(jaGreetingText, false), 13, voicevoxKeys[i]);
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
      // 英語男性ボイス「en-US-Chirp3-HD-Umbriel」
      const audio = await generateGcpTts(enGreetingText, 'en-US-Chirp3-HD-Umbriel', 'en-US');
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
    const { text = '', voice = 'ja-JP-Chirp3-HD-Sadachbia', ttsOnly = false, textOnly = false } = body;

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
    let audioContent = await generateGcpTts(speechReadyText, voice, languageCode);

    // GCP TTS が失敗した場合は VOICEVOX (日本語のみ・男性青山龍星など) を試す
    if (!audioContent && !isEnglish) {
      let voicevoxSpeaker = 13; // 青山龍星
      const vLower = voice.toLowerCase();
      if (vLower.includes('alnilam')) voicevoxSpeaker = 13;
      else if (vLower.includes('sadachbia')) voicevoxSpeaker = 7; // 記者

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
