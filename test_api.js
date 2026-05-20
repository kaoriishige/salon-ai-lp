const fs = require('fs');

async function testLocalApi() {
  console.log('--- STARTING LOCAL API DIAGNOSTIC (VERIFYING VOICE FIX) ---');
  try {
    const res = await fetch('http://localhost:3000/api/concierge', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: 'こんにちは！那須ミッドシティホテルです。',
        voice: 'ja-JP-Chirp3-HD-Aoede',
        ttsOnly: true
      })
    });
    
    console.log('HTTP Status:', res.status);
    const data = await res.json();
    
    if (data.audio) {
      console.log('Success! Received Base64 Audio of length:', data.audio.length);
      console.log('Audio data prefix:', data.audio.substring(0, 100) + '...');
    } else {
      console.log('Failed. Audio is null. Error:', data.error);
    }

    fs.writeFileSync('c:\\Users\\user\\Desktop\\nasumid\\diagnostic_api_error.json', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch failed:', e);
    fs.writeFileSync('c:\\Users\\user\\Desktop\\nasumid\\diagnostic_api_error.json', JSON.stringify({
      error: e.message,
      stack: e.stack
    }, null, 2));
  }
}

testLocalApi();
