// Header scroll
const header = document.getElementById('header');
window.addEventListener('scroll', () => {
  if (window.scrollY > 80) header.classList.add('scrolled');
  else header.classList.remove('scrolled');
});

// Intersection observer for fade-in
const fadeEls = document.querySelectorAll('.feature, .split-text, .split-img, .access-item, .news-item, .concept-lead, .concept-text');
fadeEls.forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(30px)';
  el.style.transition = 'opacity .9s ease, transform .9s ease';
});
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => {
        e.target.style.opacity = '1';
        e.target.style.transform = 'translateY(0)';
      }, i * 80);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.15 });
fadeEls.forEach(el => io.observe(el));

// ===================================================
// AI CONCIERGE — 多言語・消音・Gemini自由対話 ＆ 極上48kHz WAV
// ===================================================
(function() {
  let isMuted = localStorage.getItem('ai_concierge_muted') === 'true';
  let currentLang = localStorage.getItem('ai_concierge_lang') || 'ja';
  let history = [];
  let voiceList = [];

  function updateMuteIcon() {
    const icon = document.getElementById('muteIcon');
    const btn = document.getElementById('aiMuteBtn');
    if (isMuted) {
      btn.title = currentLang === 'en' ? 'Unmute voice' : '音声をオンにする';
      icon.innerHTML = `<line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"></line>
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>`;
      icon.style.opacity = '0.5';
    } else {
      btn.title = currentLang === 'en' ? 'Mute voice' : '音声をオフにする';
      icon.innerHTML = `<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>`;
      icon.style.opacity = '1';
    }
  }

  const UI_TEXT = {
    ja: { name: 'もりなすちゃん (AIコンシェルジュ)', status: 'オンライン', placeholder: 'テキストで質問する...', send: '送信', genderLabel: '性別', voiceLabel: '声質', speedLabel: '速度', speedNormal: '普通 (1.0x)', speedFast: '早く (1.25x)', speedFastest: '最速 (1.5x)', femaleBtn: '👩 女性', maleBtn: '👨 男性', chips: ['朝食は何時から？', 'おすすめの温泉は？', 'チェックインの時間', '駐車場はある？', '駅からの行き方', '部屋の設備は？'], greeting: 'こんにちは！那須ミッドシティホテル公式マスコットの「もりなすちゃん」です🍆 朝食・温泉・アクセスなど、どんなことでもお気軽にお尋ねくださいね。', def: 'ご質問ありがとうございます。その件につきましては、フロントのスタッフが喜んで詳しくご案内いたします。お電話は、0287-67-1400 まで、いつでもお気軽にお問い合わせください。' },
    en: { name: 'Mori-Nasu-chan (AI Concierge)', status: 'Online', placeholder: 'Ask a question in English...', send: 'Send', genderLabel: 'Gender', voiceLabel: 'Voice', speedLabel: 'Speed', speedNormal: 'Normal (1.0x)', speedFast: 'Fast (1.25x)', speedFastest: 'Fastest (1.5x)', femaleBtn: '👩 Female', maleBtn: '👨 Male', chips: ['Breakfast time?', 'Recommend Onsen?', 'Check-in time?', 'Is parking free?', 'How to go from station?', 'Room amenities?'], greeting: 'Hello! I\'m "Mori-Nasu-chan", the official mascot of Nasu Midcity Hotel🍆 Please feel free to ask about breakfast, hot springs, access, or anything else.', def: 'Thank you for your question. Our front desk staff will be happy to assist you in detail. Please feel free to call us at +81-287-67-1400 anytime.' }
  };

  const VOICES_DICT = {
    ja: { 
      female: [
        { value: 'ja-JP-Chirp3-HD-Aoede', label: 'さくら (明るく上品な妖精 🌸)' }, 
        { value: 'ja-JP-Chirp3-HD-Achernar', label: 'あおい (しっとり落ち着いた妖精 💎)' }, 
        { value: 'ja-JP-Chirp3-HD-Zephyr', label: 'めい (ふんわり愛らしい妖精 ❄️)' }
      ], 
      male: [
        { value: 'ja-JP-Chirp3-HD-Aoede', label: 'さくら (明るく上品な妖精 🌸)' }, 
        { value: 'ja-JP-Chirp3-HD-Achernar', label: 'あおい (しっとり落ち着いた妖精 💎)' }, 
        { value: 'ja-JP-Chirp3-HD-Zephyr', label: 'めい (ふんわり愛らしい妖精 ❄️)' }
      ] 
    },
    en: { 
      female: [
        { value: 'en-US-Chirp3-HD-Aoede', label: 'Emily (Bright & friendly fairy 🎀)' }, 
        { value: 'en-US-Chirp3-HD-Kore', label: 'Sophia (Elegant & professional 👑)' },
        { value: 'en-US-Neural2-F', label: 'Lily (Sweet & clear fairy 🌼)' }
      ], 
      male: [
        { value: 'en-US-Chirp3-HD-Aoede', label: 'Emily (Bright & friendly fairy 🎀)' }, 
        { value: 'en-US-Chirp3-HD-Kore', label: 'Sophia (Elegant & professional 👑)' },
        { value: 'en-US-Neural2-F', label: 'Lily (Sweet & clear fairy 🌼)' }
      ] 
    }
  };

  const QA_JA = [
    { id: 'breakfast', k: ['朝食', '朝ごはん', 'バイキング', 'メニュー', '食事', 'ごはん', '食べる'], a: '朝食は毎朝 6:30 から 9:00 まで、1階のレストランで無料の和洋バイキングをご提供しております。那須の特別なブランド卵「那須御養卵」を使った卵かけごはんや、地元野菜 of サラダ、焼きたてパンが大変好評です。那須エリアを動き出す活力として、ぜひたっぷりお召し上がりください。' },
    { id: 'checkin', k: ['チェックイン', 'チェックアウト', '時間', '何時まで', '荷物', '預かり', 'フロント'], a: 'チェックインは 15:00 から、チェックアウトは 11:00 まででございます。チェックイン前やチェックアウト後もお荷物はフロントにて無料でお預かりいたしますので、身軽に那須の観光やお仕事へお出かけいただけます。' },
    { id: 'onsen', k: ['温泉', 'お風呂', '日帰り', '大浴場', '近くの温泉', 'おすすめ', '源泉'], a: '館内に大浴場はございませんが、車で10分ほどの五ツ星源泉かけ流し「大鷹の湯」が大変おすすめです。まるで美容液のようなとろみある極上モール泉をお楽しみいただけます。詳細は温泉案内 (https://nasu-onsen-guide.netlify.app/) をご覧ください。' },
    { id: 'parking', k: ['駐車場', '車', 'パーキング', '駐車料金', '予約'], a: '無料の駐車場を完備しており、ご予約は不要でございます。しゃこうせいげんもございませんので、大型車も含めて安心してお停めいただけます。ここを拠点にして、那須高原や塩原温泉郷へ便利に動き出していただけます。' },
    { id: 'access', k: ['アクセス', '行き方', '駅', '新幹線', '徒歩', '場所', '住所', '近い', '東京'], a: '当ホテルはJR那須塩原駅の西口から徒歩わずか 3分 という大変便利な場所にございます。東京駅から新幹線で 約70分 でお越しいただけます。また、お車でお越しの場合は東北自動車道の黒磯板室インターチェンジから 約10分 でございます。' },
    { id: 'room', k: ['部屋', '客室', 'ベッド', 'wi-fi', 'ワイファイ', 'アメニティ', '個別空調', '防音', '設備', 'デスク'], a: '客室は全室にシモンズ製ベッドを採用しており、確かな休息をお約束いたします。また、全館無料のWi-Fi、全室個別に温度調節ができる個別空調、静かな環境を守る防音ペアガラス、お仕事に最適な幅 2メートル のワイドデスクを完備しております。' },
    { id: 'pet', k: ['ペット', '犬', '猫', '同伴', '盲導犬', '補助犬'], a: 'あいにく、ペットを同伴してのご宿泊はご遠慮いただいております。ただし、盲導犬や介助犬などの補助犬は同伴してご宿泊いただけます。何卒ご理解いただけますようお願いいたします。' }
  ];

  const QA_EN = [
    { id: 'breakfast', k: ['breakfast', 'morning', 'eat', 'buffet', 'food', 'restaurant', 'meal', 'bacon', 'egg'], a: 'Breakfast is served every morning from 6:30 AM to 9:00 AM. We offer a complimentary Japanese and Western buffet at the 1st-floor restaurant. Our guests highly recommend the egg-on-rice using Nasu\'s special brand eggs, fresh local salads, and freshly baked bread.' },
    { id: 'checkin', k: ['check', 'time', 'hours', 'front', 'baggage', 'luggage', 'leave', 'keep', 'store'], a: 'Check-in is from 3:00 PM, and check-out is by 11:00 AM. We can store your luggage at the front desk for free before check-in or after check-out, so you can enjoy sightseeing or business hands-free.' },
    { id: 'onsen', k: ['onsen', 'bath', 'hot spring', 'spa', 'public', 'recommend', 'discount', 'ticket'], a: 'We do not have a public bath inside the hotel, but we highly recommend "Ootaka no Yu" (10 minutes by car), a 5-star 100% natural hot spring known for its rich, thick water like a beauty serum. For more details, please visit our Hot Spring Guide (https://nasu-onsen-guide.netlify.app/).' },
    { id: 'parking', k: ['parking', 'car', 'fee', 'charge', 'reserve', 'space', 'tall', 'height'], a: 'We have a free parking lot available for all guests. No reservation is required. There are no height restrictions, so large vehicles can park safely without worry.' },
    { id: 'access', k: ['access', 'map', 'station', 'shinkansen', 'walk', 'address', 'location', 'tokyo', 'how to go', 'train'], a: 'Our hotel is located just a 3-minute walk from the West Exit of JR Nasushiobara Station. It takes about 70 minutes from Tokyo Station by Shinkansen. If you come by car, it is about 10 minutes from the Kuroiso-Itamuro Interchange on the Tohoku Expressway.' },
    { id: 'room', k: ['room', 'bed', 'wi-fi', 'wifi', 'amenity', 'ac', 'air', 'desk', 'quiet', 'soundproof'], a: 'All guest rooms are equipped with top-quality Simmons beds for a comfortable rest. We also provide free Wi-Fi, individual air conditioning, soundproof double-glazed windows, and a wide desk (2 meters wide) ideal for work.' },
    { id: 'pet', k: ['pet', 'dog', 'cat', 'stay', 'guide dog', 'animal'], a: 'We apologize, but pets are not allowed to stay with us. However, service dogs, guide dogs, and hearing dogs are welcome to stay with you. Thank you for your understanding.' }
  ];

  const modal = document.getElementById('aiModal'), closeBtn = document.getElementById('aiModalClose'), chatBody = document.getElementById('aiChatBody'), msgArea = document.getElementById('aiChatMessages'), vBtn = document.getElementById('aiVoiceBtn'), tInput = document.getElementById('aiTextInput'), sBtn = document.getElementById('aiSendBtn'), statusEl = document.getElementById('aiChatStatus'), allBtns = document.querySelectorAll('.ai-fab, .ai-concierge-banner .btn');
  let recognition = null, isListening = false, firstOpen = true, currentGender = 'female', currentVoice = 'ja-JP-Chirp3-HD-Aoede', lastBotAnswer = '';
  let currentAudio = new Audio(); // シングルトン化：自動再生ブロックを完全に避けるため最初から1つのインスタンスを使い回す！
  let currentPlaybackRate = parseFloat(localStorage.getItem('ai_concierge_speed') || '1.0');
  const voiceCache = {}; // キャッシュストア：一度ロードした音声データを保持して2回目以降の通信ラグを完全ゼロ（0秒）にする！

  function loadVoices() {
    if (window.speechSynthesis) {
      voiceList = window.speechSynthesis.getVoices();
    }
  }
  if (window.speechSynthesis) {
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }

  function unlockAudio() {
    if (window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance('');
      u.volume = 0;
      window.speechSynthesis.speak(u);
    }
    // 唯一のシングルトンインスタンス currentAudio の自動再生制限を、ユーザー操作イベント内で無音再生させて完全解除！！！
    try {
      currentAudio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA'; // 無音の極小WAV
      currentAudio.volume = 0;
      currentAudio.play().catch(e => console.log('[Audio Unlock] Singleton audio pre-unlocked', e));
    } catch(e) {
      console.warn('[Audio Unlock Error]', e);
    }
  }

  function getBestVoice(gender) {
    const langPrefix = (currentLang === 'ja') ? 'ja' : 'en';
    const femaleKeywords = (currentLang === 'ja') 
      ? ['Nanami Online', 'Nanami', 'Kyoko Premium', 'Kyoko', 'Google 日本語']
      : ['Zira', 'Samantha', 'Google US English', 'en-US'];
    const maleKeywords = (currentLang === 'ja')
      ? ['Keita Online', 'Keita', 'Otoya Premium', 'Otoya', 'Google 日本語']
      : ['David', 'Google US English', 'en-US'];

    const keywords = (gender === 'male') ? maleKeywords : femaleKeywords;
    for (const kw of keywords) {
      const v = voiceList.find(v => v.name.includes(kw) && v.lang.startsWith(langPrefix));
      if (v) return v;
    }
    return voiceList.find(v => v.lang.startsWith(langPrefix)) || null;
  }

  function speak(text, gender) {
    return new Promise((resolve) => {
      // 日本語の場合はロボット音声を絶対に鳴らさない（即座にスキップ）！！！
      if (currentLang === 'ja') {
        console.warn('[TTS System] Blocked local browser AI voice to prevent robotic sound fallback.');
        resolve();
        return;
      }
      
      // 英語の場合のみ、緊急フォールバックとしてブラウザのローカル英語音声を鳴らす
      if (!window.speechSynthesis || isMuted) { resolve(); return; }
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'en-US';
      u.rate = 0.95;
      u.pitch = 1.05;
      u.volume = 1.0;
      const voice = getBestVoice(gender);
      if (voice) u.voice = voice;
      
      // Web Speech API ガベージコレクションバグ対策：グローバルオブジェクトに参照保持して音声が途切れるのを100%完全防止！！！
      window.activeUtterance = u;
      
      const avatar = document.getElementById('aiLiveAvatar');
      if (avatar) avatar.classList.add('is-speaking');
      
      u.onend = () => { 
        statusEl.textContent = UI_TEXT[currentLang].status; 
        if (avatar) avatar.classList.remove('is-speaking');
        resolve(); 
      };
      u.onerror = () => { 
        statusEl.textContent = UI_TEXT[currentLang].status; 
        if (avatar) avatar.classList.remove('is-speaking');
        resolve(); 
      };
      statusEl.textContent = 'Speaking...';
      window.speechSynthesis.speak(u);
    });
  }

  function matchLocalAI(q) {
    const clean = q.toLowerCase();
    const qaList = (currentLang === 'ja') ? QA_JA : QA_EN;
    const match = qaList.find(item => item.k.some(key => clean.includes(key)));
    return match ? match.a : (currentLang === 'ja' ? UI_TEXT.ja.def : UI_TEXT.en.def);
  }

  window.toggleLanguage = function() {
    currentLang = (currentLang === 'ja') ? 'en' : 'ja';
    localStorage.setItem('ai_concierge_lang', currentLang);
    applyLanguage();
    const greeting = UI_TEXT[currentLang].greeting;
    lastBotAnswer = greeting;
    addMsg(greeting, 'bot');
    speakLastAnswerDynamic();
  };

  function applyLanguage() {
    document.getElementById('aiLangBtn').textContent = (currentLang === 'ja') ? 'English' : '日本語';
    document.getElementById('aiChatName').textContent = UI_TEXT[currentLang].name;
    statusEl.textContent = UI_TEXT[currentLang].status;
    document.getElementById('genderLabelEl').textContent = UI_TEXT[currentLang].genderLabel;
    document.getElementById('voiceLabelEl').textContent = UI_TEXT[currentLang].voiceLabel;
    document.getElementById('speedLabelEl').textContent = UI_TEXT[currentLang].speedLabel;
    document.getElementById('optSpeedNormal').textContent = UI_TEXT[currentLang].speedNormal;
    document.getElementById('optSpeedFast').textContent = UI_TEXT[currentLang].speedFast;
    document.getElementById('optSpeedFastest').textContent = UI_TEXT[currentLang].speedFastest;
    document.getElementById('voiceFemaleBtn').textContent = UI_TEXT[currentLang].femaleBtn;
    document.getElementById('voiceMaleBtn').textContent = UI_TEXT[currentLang].maleBtn;
    tInput.placeholder = UI_TEXT[currentLang].placeholder;
    sBtn.textContent = UI_TEXT[currentLang].send;
    if (recognition) recognition.lang = (currentLang === 'ja') ? 'ja-JP' : 'en-US';
    rebuildVoiceOptions();
    updateMuteIcon();
  }

  function rebuildVoiceOptions() {
    const select = document.getElementById('voiceSelect');
    if (!select) return;
    select.innerHTML = '';
    
    if (currentLang !== 'ja' && currentLang !== 'en') {
      currentLang = 'ja';
    }
    if (currentGender !== 'female' && currentGender !== 'male') {
      currentGender = 'female';
    }
    
    const list = VOICES_DICT[currentLang][currentGender] || VOICES_DICT.ja.female;
    
    list.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v.value; 
      opt.textContent = v.label;
      select.appendChild(opt);
    });
    
    const exists = list.some(v => v.value === currentVoice);
    if (!exists && list.length > 0) {
      currentVoice = list[0].value;
    }
    select.value = currentVoice;
  }

  window.setGender = function(gender, btn) {
    currentGender = gender;
    document.querySelectorAll('.voice-toggle-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    rebuildVoiceOptions();
    stopSpeaking();
    if (lastBotAnswer) speakLastAnswerDynamic();
  };

  window.updateVoice = function(voiceVal) {
    if (voiceVal) {
      currentVoice = voiceVal;
    }
    stopSpeaking();
    if (lastBotAnswer) speakLastAnswerDynamic();
  };

  window.updateVoiceSpeed = function(speedVal) {
    if (speedVal) {
      currentPlaybackRate = parseFloat(speedVal);
      localStorage.setItem('ai_concierge_speed', speedVal);
    }
    if (currentAudio) {
      currentAudio.playbackRate = currentPlaybackRate;
    }
  };

  function stopSpeaking() {
    if (currentAudio) { 
      try { 
        currentAudio.pause(); 
        currentAudio.src = ''; 
      } catch(e){} 
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    statusEl.textContent = UI_TEXT[currentLang].status;
    
    const avatar = document.getElementById('aiLiveAvatar');
    if (avatar) avatar.classList.remove('is-speaking');
  }

  async function speakLastAnswerDynamic() {
    if (!lastBotAnswer) return;
    stopSpeaking();
    statusEl.textContent = currentLang === 'en' ? 'Thinking...' : '応答を考えています...';
    try {
      const sentences = lastBotAnswer.split(/([。！\?\n])/).reduce((acc, cur) => {
        if (acc.length === 0) { acc.push(cur); } 
        else {
          const last = acc[acc.length - 1];
          if (last === '。' || last === '！' || last === '?' || last === '\n' || last === '？') { acc.push(cur); } 
          else { acc[acc.length - 1] += cur; }
        }
        return acc;
      }, []).filter(s => s.trim() !== '');

      let sentenceIndex = 0;
      async function playNext() {
        if (sentenceIndex >= sentences.length) {
          statusEl.textContent = UI_TEXT[currentLang].status;
          return;
        }
        const txt = sentences[sentenceIndex];
        let audioData = null;
        const cacheKey = `${currentVoice}_${txt}`;
        if (voiceCache[cacheKey]) {
          audioData = voiceCache[cacheKey];
        } else {
          try {
            const apiTarget = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
              ? '/api/concierge'
              : (location.protocol === 'file:')
                ? 'https://nasumidcityp.netlify.app/.netlify/functions/ai-concierge'
                : '/.netlify/functions/ai-concierge';
            const res = await fetch(apiTarget, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: txt, voice: currentVoice, ttsOnly: true }) });
            if (res.ok) {
              const data = await res.json();
              if (data.audio) {
                audioData = data.audio;
                voiceCache[cacheKey] = audioData;
              }
            }
          } catch(e){}
        }

        if (sentenceIndex + 1 < sentences.length) {
          const nextTxt = sentences[sentenceIndex + 1];
          const nextCacheKey = `${currentVoice}_${nextTxt}`;
          if (!voiceCache[nextCacheKey]) {
            (async () => {
              try {
                const apiTarget = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                  ? '/api/concierge'
                  : (location.protocol === 'file:')
                    ? 'https://nasumidcityp.netlify.app/.netlify/functions/ai-concierge'
                    : '/.netlify/functions/ai-concierge';
                const res = await fetch(apiTarget, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: nextTxt, voice: currentVoice, ttsOnly: true }) });
                if (res.ok) {
                  const data = await res.json();
                  if (data.audio) voiceCache[nextCacheKey] = data.audio;
                }
              } catch(e){}
            })();
          }
        }

        if (audioData) {
          await playGcpTtsAudio(audioData, 'audio/mp3');
        } else {
          await speak(txt, currentGender);
        }
        sentenceIndex++;
        await playNext();
      }
      await playNext();
    } catch(e) {
      await speak(lastBotAnswer, currentGender);
    }
  }

  function addMsg(text, type) {
    const d = document.createElement('div');
    d.className = 'ai-msg ai-msg-' + type;
    
    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    d.appendChild(bubble);
    msgArea.appendChild(d);
    chatBody.scrollTop = chatBody.scrollHeight;

    // ユーザーの発言や英語などの場合はアニメーションなしで一瞬で表示
    bubble.innerHTML = text;
    return d;
  }

  // ボットのタイピング用にあらかじめ空のコンテナを生成する
  function createBotMsgContainer() {
    const d = document.createElement('div');
    d.className = 'ai-msg ai-msg-bot';
    const bubble = document.createElement('div');
    bubble.className = 'ai-msg-bubble';
    d.appendChild(bubble);
    msgArea.appendChild(d);
    chatBody.scrollTop = chatBody.scrollHeight;
    return bubble;
  }

  // 特定のコンテナ（吹き出し）に対して、1文を追加でタイピング描画する
  function typewriteSentence(bubble, text) {
    return new Promise((resolve) => {
      if (currentLang !== 'ja') {
        // 日本語以外はタイピングせず直接追加して即終了
        bubble.innerHTML += text;
        chatBody.scrollTop = chatBody.scrollHeight;
        resolve();
        return;
      }

      let i = 0;
      const speed = Math.round(75 / currentPlaybackRate);
      
      function typeWriter() {
        if (i < text.length) {
          if (text.substr(i, 4) === '<a h') {
            const closeIdx = text.indexOf('</a>', i);
            if (closeIdx !== -1) {
              bubble.innerHTML += text.substring(i, closeIdx + 4);
              i = closeIdx + 4;
            } else {
              bubble.innerHTML += text.charAt(i);
              i++;
            }
          } else {
            bubble.innerHTML += text.charAt(i);
            i++;
          }
          chatBody.scrollTop = chatBody.scrollHeight;
          setTimeout(typeWriter, speed);
        } else {
          resolve(); // 1文のタイピング完了！
        }
      }
      typeWriter();
    });
  }

  function addChips() {
    const d = document.createElement('div');
    d.className = 'ai-suggestions';
    UI_TEXT[currentLang].chips.forEach(c => {
      const b = document.createElement('button');
      b.className = 'ai-chip'; b.textContent = c;
      b.onclick = () => { d.remove(); addMsg(c, 'user'); respond(c); };
      d.appendChild(b);
    });
    msgArea.appendChild(d);
    chatBody.scrollTop = chatBody.scrollHeight;
  }

  async function respond(q) {
    statusEl.textContent = currentLang === 'en' ? 'Thinking...' : '応答を考えています...';
    history.push({ role: 'user', text: q });

    let botAnswer = "";
    let sentences = [];

    // 1. まずは RAG (Gemini AI) を優先して呼び出し、動的に「大鷹の湯」などの詳細知識を検索して回答を生成！
    try {
      // file:/// (ダブルクリック) または localhost (ローカル開発) の場合は本番のAPIを直接叩く！
      const apiTarget = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
        ? '/api/concierge'
        : (location.protocol === 'file:')
          ? 'https://nasumidcityp.netlify.app/.netlify/functions/ai-concierge'
          : '/.netlify/functions/ai-concierge';

      const res = await fetch(apiTarget, { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text: q, voice: currentVoice }) // ユーザーの生の質問qを直接RAGに投げてリアルタイム対話！
      });
      
      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          botAnswer = data.answer;
        }
      }
      if (!botAnswer) throw new Error('RAG response not ok');
    } catch(e) {
      console.warn('[RAG Connection failed, falling back to local exact QA]', e);
      
      // 2. ネット接続エラーやオフライン時は、フロントの100%確実なローカルマッチで即座に救済！！！
      botAnswer = matchLocalAI(q);
    }

    // 回答を確定させて履歴に追加
    lastBotAnswer = botAnswer;
    history.push({ role: 'model', text: botAnswer });

    // 🟢 文章を句点「。」や感嘆符「！」や改行で「文単位」に極めて細かく分割！！！
    sentences = botAnswer.split(/([。！\?\n])/).reduce((acc, cur) => {
      if (acc.length === 0) {
        acc.push(cur);
      } else {
        const last = acc[acc.length - 1];
        if (last === '。' || last === '！' || last === '?' || last === '\n' || last === '？') {
          acc.push(cur);
        } else {
          acc[acc.length - 1] += cur;
        }
      }
      return acc;
    }, []).filter(s => s.trim() !== '');

    // 吹き出しのバブルコンテナを先行して画面に作成（中はまだ空）
    const bubbleContainer = createBotMsgContainer();
    let sentenceIndex = 0;

    // 🟢 順次ストリーミング再生ループ
    async function playNextSentence() {
      if (sentenceIndex >= sentences.length) {
        statusEl.textContent = UI_TEXT[currentLang].status;
        return;
      }

      const currentText = sentences[sentenceIndex];
      let audioData = null;
      const cacheKey = `${currentVoice}_${currentText}`;

      // 音声キャッシュ判定
      if (voiceCache[cacheKey]) {
        audioData = voiceCache[cacheKey];
      } else {
        // まだキャッシュになければ、今すぐネットから取得（最初の1文目はココが走るが、短いので0.15秒で終わる！）
        try {
          const apiTarget = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
            ? '/api/concierge'
            : (location.protocol === 'file:')
              ? 'https://nasumidcityp.netlify.app/.netlify/functions/ai-concierge'
              : '/.netlify/functions/ai-concierge';

          const res = await fetch(apiTarget, { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ text: currentText, voice: currentVoice, ttsOnly: true }) 
          });
          if (res.ok) {
            const data = await res.json();
            if (data.audio) {
              audioData = data.audio;
              voiceCache[cacheKey] = audioData; // キャッシュ！
            }
          }
        } catch(e) {
          console.warn('[Fetch sentence voice error]', e);
        }
      }

      // 🟢 【バックグラウンド先読み（プリフェッチ）】
      if (sentenceIndex + 1 < sentences.length) {
        const nextText = sentences[sentenceIndex + 1];
        const nextCacheKey = `${currentVoice}_${nextText}`;
        if (!voiceCache[nextCacheKey]) {
          (async () => {
            try {
              const apiTarget = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
                ? '/api/concierge'
                : (location.protocol === 'file:')
                  ? 'https://nasumidcityp.netlify.app/.netlify/functions/ai-concierge'
                  : '/.netlify/functions/ai-concierge';
              const res = await fetch(apiTarget, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ text: nextText, voice: currentVoice, ttsOnly: true }) 
              });
              if (res.ok) {
                const data = await res.json();
                if (data.audio) {
                  voiceCache[nextCacheKey] = data.audio;
                  console.log(`[Prefetch Success] Loaded next sentence: "${nextText}"`);
                }
              }
            } catch(e){}
          })();
        }
      }

      // 🟢 音声の再生と「完全に同時に」その文のタイピングを開始！！！
      if (audioData) {
        statusEl.textContent = currentLang === 'en' ? 'Speaking...' : '話しています...';
        // 音声再生とタイピング描画を並行して実行し、両方が終わるのを待つ
        await Promise.all([
          typewriteSentence(bubbleContainer, currentText),
          playGcpTtsAudio(audioData, 'audio/mp3')
        ]);
      } else {
        // 音声が取れなかった場合はブラウザのローカル音声でフォールバック
        await Promise.all([
          typewriteSentence(bubbleContainer, currentText),
          speak(currentText, currentGender)
        ]);
      }

      // 次の文へ進む！
      sentenceIndex++;
      await playNextSentence();
    }

    // 超爆速で最初の1文目をキック！！！
    await playNextSentence();
  }

  // Base64からBlobへ極めて高速にバイナリ変換するヘルパー
  function base64ToBlob(base64, mimeType) {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  async function playGcpTtsAudio(base64, mimeType = 'audio/mp3') {
    return new Promise((resolve) => {
      if (isMuted) { resolve(); return; }
      
      let objectUrl = null;
      let isResolved = false;
      
      // 確実に一度だけ resolve を呼ぶ安全なクリーンアップ関数
      const safeResolve = () => {
        if (isResolved) return;
        isResolved = true;
        
        // イベントリスナーの完全解除
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.onpause = null;
        
        const avatar = document.getElementById('aiLiveAvatar');
        if (avatar) avatar.classList.remove('is-speaking');
        
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch(e){}
        }
        resolve();
      };

      try {
        const blob = base64ToBlob(base64, mimeType);
        objectUrl = URL.createObjectURL(blob);
        
        // 新規の音声を設定する前に、前の音声の再生状態を確実に完全静止＆リセット！！！
        // onpauseをクリアしてからpauseする（そうしないと前のonpauseが誤発火する）
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.onpause = null;
        currentAudio.pause();
        
        // シングルトンインスタンス currentAudio を使い回す
        currentAudio.src = objectUrl;
        currentAudio.volume = 1.0; 
        currentAudio.playbackRate = currentPlaybackRate; 
        
        const avatar = document.getElementById('aiLiveAvatar');
        if (avatar) avatar.classList.add('is-speaking');
        
        currentAudio.onended = safeResolve;
        currentAudio.onerror = safeResolve;
        // onpauseは使用しない（stopSpeaking()によるpause時に誤発火してresolveされてしまうため）
        
        currentAudio.play().catch((err) => {
          console.warn('WAV Autoplay blocked on singleton', err);
          safeResolve();
        });

        // セーフティネット：15秒以上無応答になった場合は強制的にロック解除して進行を止めない
        setTimeout(safeResolve, 15000);
        
      } catch(e) {
        console.error('[Blob Play Error]', e);
        safeResolve();
      }
    });
  }

  document.getElementById('aiMuteBtn').addEventListener('click', () => { isMuted = !isMuted; localStorage.setItem('ai_concierge_muted', isMuted); updateMuteIcon(); if (isMuted) stopSpeaking(); });
  document.getElementById('aiLangBtn').addEventListener('click', () => { window.toggleLanguage(); });
  
  allBtns.forEach(b => b.addEventListener('click', (e) => { 
    e.preventDefault(); 
    unlockAudio();
    loadVoices();
    
    rebuildVoiceOptions();
    
    modal.classList.add('active'); 
    if(firstOpen){ 
      firstOpen=false; 
      applyLanguage(); 
      const greeting = UI_TEXT[currentLang].greeting;
      addMsg(greeting, 'bot');
      
      const shortGreeting = (currentLang === 'ja') 
        ? 'こんにちは！キャラクターのもりなすちゃんです。ご質問くださいね。' 
        : "Hello! I'm Mori-Nasu-chan. Please feel free to ask.";
      
      lastBotAnswer = shortGreeting;
      
      setTimeout(() => {
        speakLastAnswerDynamic();
      }, 150); 
      setTimeout(addChips, 450); 
    } 
  }));
  
  closeBtn.addEventListener('click', () => { stopSpeaking(); modal.classList.remove('active'); });
  modal.addEventListener('click', (e) => { if (e.target === modal) { stopSpeaking(); modal.classList.remove('active'); } });
  
  sBtn.addEventListener('click', () => { const t = tInput.value.trim(); if(t){ tInput.value=''; addMsg(t, 'user'); respond(t); }});
  tInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const t = tInput.value.trim(); if(t){ tInput.value=''; addMsg(t, 'user'); respond(t); } } });

  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (SR) {
    recognition = new SR();
    recognition.continuous = true; 
    recognition.interimResults = true; 
    
    let silenceTimer = null;
    let lastRecognizedText = '';

    recognition.onresult = (ev) => {
      let interimTranscript = '';
      let finalTranscript = '';
      for (let i = ev.resultIndex; i < ev.results.length; ++i) {
        if (ev.results[i].isFinal) {
          finalTranscript += ev.results[i][0].transcript;
        } else {
          interimTranscript += ev.results[i][0].transcript;
        }
      }
      
      const currentText = finalTranscript || interimTranscript;
      if (currentText.trim()) {
        lastRecognizedText = currentText;
        tInput.value = lastRecognizedText;
        
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          if (lastRecognizedText.trim() && isListening) {
            const queryText = lastRecognizedText.trim();
            tInput.value = '';
            recognition.stop(); 
            addMsg(queryText, 'user');
            respond(queryText);
          }
        }, 450);
      }
    };
    recognition.onend = () => {
      isListening = false;
      vBtn.classList.remove('listening');
      statusEl.textContent = UI_TEXT[currentLang].status;
      clearTimeout(silenceTimer);
    };
    recognition.onerror = () => {
      isListening = false;
      vBtn.classList.remove('listening');
      statusEl.textContent = UI_TEXT[currentLang].status;
      clearTimeout(silenceTimer);
    };
  } else {
    if (vBtn) vBtn.style.display = 'none';
  }

  if (vBtn && recognition) {
    vBtn.addEventListener('click', () => {
      if (isListening) { recognition.stop(); return; }
      stopSpeaking();
      unlockAudio(); 
      isListening = true;
      vBtn.classList.add('listening');
      statusEl.textContent = currentLang === 'en' ? 'Listening...' : '聞いています...';
      recognition.start();
    });
  }

  applyLanguage();
  
  const speedSelect = document.getElementById('voiceSpeedSelect');
  if (speedSelect) speedSelect.value = currentPlaybackRate.toString();
})();
