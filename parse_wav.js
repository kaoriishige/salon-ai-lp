const fs = require('fs');

function parseWavHeader() {
  const filePath = 'c:\\Users\\user\\Desktop\\nasumid\\diagnostic_audio.wav';
  console.log('--- ANALYZING WAV HEADER ---');
  
  if (!fs.existsSync(filePath)) {
    console.error('File not found:', filePath);
    return;
  }

  const buffer = fs.readFileSync(filePath);
  const fileSize = buffer.length;

  // RIFF ヘッダーの検証
  const riff = buffer.toString('ascii', 0, 4);
  const wave = buffer.toString('ascii', 8, 12);
  const fmt = buffer.toString('ascii', 12, 16);

  if (riff !== 'RIFF' || wave !== 'WAVE') {
    console.error('Not a valid RIFF/WAVE file.');
    return;
  }

  // FMT チャンクの解析
  const formatType = buffer.readUInt16LE(20); // 1 = PCM
  const channels = buffer.readUInt16LE(22);   // 1 = Mono, 2 = Stereo
  const sampleRate = buffer.readUInt32LE(24); // サンプリング周波数 (Hz)
  const byteRate = buffer.readUInt32LE(28);   // 1秒あたりのバイト数
  const bitsPerSample = buffer.readUInt16LE(34); // 8, 16, 24, 32

  const report = {
    fileSize: fileSize,
    riffHeader: riff,
    waveHeader: wave,
    fmtHeader: fmt,
    formatType: formatType === 1 ? 'PCM (Non-compressed)' : 'Other/Compressed (' + formatType + ')',
    channels: channels === 1 ? 'Mono' : channels === 2 ? 'Stereo' : channels,
    sampleRateHz: sampleRate,
    bitsPerSample: bitsPerSample,
    byteRate: byteRate,
    durationSeconds: (fileSize - 44) / byteRate
  };

  fs.writeFileSync('c:\\Users\\user\\Desktop\\nasumid\\wav_analysis_report.json', JSON.stringify(report, null, 2));
  console.log('--- WAV ANALYSIS REPORT WRITTEN TO c:\\Users\\user\\Desktop\\nasumid\\wav_analysis_report.json ---');
  console.log(report);
}

parseWavHeader();
