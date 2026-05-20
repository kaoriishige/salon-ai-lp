const fs = require('fs');
const env = fs.readFileSync('.env', 'utf-8');
const gcpKey = env.split('\n').find(l => l.startsWith('GCP_TTS_API_KEY=')).split('=')[1].trim();

async function test() {
  console.log("Testing with key:", gcpKey.substring(0, 10) + "...");
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + gcpKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      input: { text: 'おはようございます' },
      voice: { languageCode: 'ja-JP', name: 'ja-JP-Neural2-B' },
      audioConfig: { audioEncoding: 'MP3' }
    })
  });
  const data = await res.json();
  if (data.error) {
    console.log("ERROR:", data.error.message);
  } else {
    console.log("SUCCESS! Audio content length:", data.audioContent.length);
  }
}
test();
