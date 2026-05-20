const fs = require('fs');

async function checkGcpGeminiTts() {
  console.log('--- STARTING GCP GEMINI TTS DIAGNOSTIC (WAV FILE EXPORT) ---');
  try {
    const res = await fetch('https://nasumidcityp.netlify.app/.netlify/functions/ai-concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'こんにちは！那須ミッドシティホテルへようこそ。最高の温泉と美味しい朝食をご用意しております。',
        voice: 'ja-JP-Chirp3-HD-Aoede'
      })
    });
    
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    
    const hasAudio = !!data.audio;
    let audioLength = 0;
    
    if (hasAudio) {
      // Base64データをデコードして本物のWAVファイルとしてローカルへ書き出す！
      const audioBuffer = Buffer.from(data.audio, 'base64');
      audioLength = audioBuffer.length;
      fs.writeFileSync('c:\\Users\\user\\Desktop\\nasumid\\diagnostic_audio.wav', audioBuffer);
      console.log('--- WAV AUDIO FILE EXPORTED TO c:\\Users\\user\\Desktop\\nasumid\\diagnostic_audio.wav ---');
    }

    const diagnosticResult = {
      timestamp: new Date().toISOString(),
      httpStatus: res.status,
      hasAudio: hasAudio,
      audioLength: audioLength,
      errorDetail: data.error || null,
      rawResponse: {
        error: data.error || null,
        audioPrefix: data.audio ? data.audio.substring(0, 100) + '...' : null
      }
    };

    fs.writeFileSync('c:\\Users\\user\\Desktop\\nasumid\\diagnostic_result.json', JSON.stringify(diagnosticResult, null, 2));
    console.log('--- DIAGNOSTIC COMPLETED: check c:\\Users\\user\\Desktop\\nasumid\\diagnostic_result.json ---');
  } catch (e) {
    const errResult = {
      timestamp: new Date().toISOString(),
      error: e.message,
      stack: e.stack
    };
    fs.writeFileSync('c:\\Users\\user\\Desktop\\nasumid\\diagnostic_result.json', JSON.stringify(errResult, null, 2));
    console.error('Diagnostic failed:', e);
  }
}

checkGcpGeminiTts();
