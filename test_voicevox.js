const https = require('https');

function test() {
  const url = "https://api.tts.quest/v1/voicevox/?key=v9W-c2V449G7q79&text=" + encodeURIComponent("こんにちは") + "&speaker=2";
  console.log("Requesting: " + url);
  https.get(url, (res) => {
    console.log("Status: " + res.statusCode);
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
      console.log("Response: " + data);
    });
  }).on('error', (e) => {
    console.error("Error: ", e);
  });
}
test();
