import { NextResponse } from 'next/server';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS'
};

export async function OPTIONS() {
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function GET() {
  const result = {
    timestamp: new Date().toISOString(),
    env: {
      hasGeminiKey: !!process.env.GEMINI_API_KEY,
      geminiKeyPrefix: process.env.GEMINI_API_KEY ? process.env.GEMINI_API_KEY.substring(0, 10) + '...' : 'none',
      hasGcpTtsKey: !!process.env.GCP_TTS_API_KEY,
      gcpTtsKeyPrefix: process.env.GCP_TTS_API_KEY ? process.env.GCP_TTS_API_KEY.substring(0, 10) + '...' : 'none',
    },
    geminiTest: {},
    gcpTtsTest: {}
  };

  // 1. Gemini API のテスト
  const geminiKey = process.env.GEMINI_API_KEY;
  if (geminiKey) {
    const models = ['gemini-2.5-flash', 'gemini-1.5-flash'];
    for (const model of models) {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 8000);
        
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: 'Hello' }] }]
          }),
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        result.geminiTest[model] = {
          status: res.status,
          ok: res.ok,
        };
        
        if (!res.ok) {
          result.geminiTest[model].errorBody = await res.text();
        } else {
          const data = await res.json();
          result.geminiTest[model].responsePreview = JSON.stringify(data).substring(0, 200) + '...';
        }
      } catch (e) {
        result.geminiTest[model] = {
          status: 'error',
          errorMessage: e.message,
          errorStack: e.stack
        };
      }
    }
  } else {
    result.geminiTest.error = 'GEMINI_API_KEY is not configured';
  }

  // 2. GCP TTS API のテスト
  const ttsKey = process.env.GCP_TTS_API_KEY;
  if (ttsKey) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${ttsKey}`;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          input: { text: 'テスト' },
          voice: { languageCode: 'ja-JP', name: 'ja-JP-Chirp3-HD-Aoede' },
          audioConfig: { audioEncoding: 'MP3' }
        }),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      result.gcpTtsTest = {
        status: res.status,
        ok: res.ok,
      };
      
      if (!res.ok) {
        result.gcpTtsTest.errorBody = await res.text();
      } else {
        const data = await res.json();
        result.gcpTtsTest.audioLength = data.audioContent ? data.audioContent.length : 0;
        result.gcpTtsTest.hasAudio = !!data.audioContent;
      }
    } catch (e) {
      result.gcpTtsTest = {
        status: 'error',
        errorMessage: e.message,
        errorStack: e.stack
      };
    }
  } else {
    result.gcpTtsTest.error = 'GCP_TTS_API_KEY is not configured';
  }

  return NextResponse.json(result, { headers: corsHeaders });
}
