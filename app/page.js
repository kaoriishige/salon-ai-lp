"use client";

import { useState, useEffect, useRef } from 'react';

const UI_TEXT = {
  ja: { 
    name: 'さくら (AIコンシェルジュ)', 
    status: 'オンライン', 
    placeholder: 'テキストで質問する...', 
    send: '送信', 
    genderLabel: '性別', 
    voiceLabel: '声質', 
    speedLabel: '速度', 
    speedNormal: '普通 (1.0x)', 
    speedFast: '早く (1.25x)', 
    speedFastest: '最速 (1.5x)', 
    femaleBtn: '👩 女性', 
    maleBtn: '👨 男性', 
    chips: ['髪質改善メニューは？', 'くせ毛でも大丈夫？', '料金はいくら？', '予約方法は？', '駐車場はある？'], 
    greeting: 'こんにちは！サロン・ド・ビューティーのAIコンシェルジュ「さくら」です🌸 くせ毛のお悩みやメニューについて、何でもお聞きくださいね。', 
    def: 'ご質問ありがとうございます。その件につきましては、スタッフが喜んで詳しくご案内いたします。お電話は、03-1234-5678 まで、いつでもお気軽にお問い合わせください。' 
  },
  en: { 
    name: 'Sakura (AI Concierge)', 
    status: 'Online', 
    placeholder: 'Ask a question in English...', 
    send: 'Send', 
    genderLabel: 'Gender', 
    voiceLabel: 'Voice', 
    speedLabel: 'Speed', 
    speedNormal: 'Normal (1.0x)', 
    speedFast: 'Fast (1.25x)', 
    speedFastest: 'Fastest (1.5x)', 
    femaleBtn: '👩 Female', 
    maleBtn: '👨 Male', 
    chips: ['Hair improvement menu?', 'Frizzy hair ok?', 'How much?', 'How to book?', 'Parking available?'], 
    greeting: 'Hello! I\'m "Sakura", the AI concierge of Salon de Beauty🌸 Please feel free to ask about our hair care menu, frizzy hair concerns, or anything else.', 
    def: 'Thank you for your question. Our staff will be happy to assist you in detail. Please feel free to call us at +81-3-1234-5678 anytime.' 
  }
};

const VOICES_DICT = {
  ja: { 
    female: [
      { value: 'ja-JP-Chirp3-HD-Aoede', label: 'さくら (明るく上品な妖精 🌸)' }, 
      { value: 'ja-JP-Chirp3-HD-Achernar', label: 'あおい (しっとり落ち着いた妖精 💎)' }, 
      { value: 'ja-JP-Chirp3-HD-Zephyr', label: 'めい (ふんわり愛らしい妖精 ❄️)' },
      { value: 'ja-JP-Neural2-F', label: 'みどり (安定・高音質 🍀)' }
    ], 
    male: [
      { value: 'ja-JP-Chirp3-HD-Aoede', label: 'さくら (明るく上品な妖精 🌸)' }, 
      { value: 'ja-JP-Chirp3-HD-Achernar', label: 'あおい (しっとり落ち着いた妖精 💎)' }, 
      { value: 'ja-JP-Chirp3-HD-Zephyr', label: 'めい (ふんわり愛らしい妖精 ❄️)' },
      { value: 'ja-JP-Neural2-F', label: 'みどり (安定・高音質 🍀)' }
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

export default function Home() {
  const [isScrolled, setIsScrolled] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai_concierge_muted') === 'true';
    }
    return false;
  });
  const [currentLang, setCurrentLang] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('ai_concierge_lang') || 'ja';
    }
    return 'ja';
  });
  const [currentGender, setCurrentGender] = useState('female');
  const [currentVoice, setCurrentVoice] = useState('ja-JP-Chirp3-HD-Aoede');
  const [playbackRate, setPlaybackRate] = useState(() => {
    if (typeof window !== 'undefined') {
      return parseFloat(localStorage.getItem('ai_concierge_speed') || '1.0');
    }
    return 1.0;
  });
  const [messages, setMessages] = useState([]);
  
  const [currentTypingText, setCurrentTypingText] = useState('');
  const [inputText, setInputText] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [statusText, setStatusText] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedLang = localStorage.getItem('ai_concierge_lang') || 'ja';
      return savedLang === 'en' ? 'Online' : 'オンライン';
    }
    return 'オンライン';
  });

  const chatBodyRef = useRef(null);
  const audioRef = useRef(null);
  const recognitionRef = useRef(null);
  const voiceCacheRef = useRef({});
  const lastAnswerRef = useRef('');
  
  const activeTypingSessionRef = useRef(0);
  const isMutedRef = useRef(false);
  const currentLangRef = useRef('ja');
  const currentVoiceRef = useRef('ja-JP-Chirp3-HD-Aoede');
  const playbackRateRef = useRef(1.0);
  const handleUserSendRef = useRef(null);

  useEffect(() => { isMutedRef.current = isMuted; }, [isMuted]);
  useEffect(() => { currentLangRef.current = currentLang; }, [currentLang]);
  useEffect(() => { currentVoiceRef.current = currentVoice; }, [currentVoice]);
  useEffect(() => { playbackRateRef.current = playbackRate; }, [playbackRate]);

  useEffect(() => {
    audioRef.current = new Audio();

    const fadeEls = document.querySelectorAll('.feature, .split-text, .split-img, .access-item, .news-item, .concept-lead, .concept-text');
    fadeEls.forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity .9s ease, transform .9s ease';
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e, i) => {
        if (e.isIntersecting) {
          setTimeout(() => {
            e.target.style.opacity = '1';
            e.target.style.transform = 'translateY(0)';
          }, i * 80);
          observer.unobserve(e.target);
        }
      });
    }, { threshold: 0.15 });

    fadeEls.forEach(el => observer.observe(el));

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.continuous = true;
      rec.interimResults = true;
      
      let silenceTimer = null;
      let lastText = '';

      rec.onresult = (ev) => {
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
          lastText = currentText;
          setInputText(lastText);
          
          clearTimeout(silenceTimer);
          silenceTimer = setTimeout(() => {
            if (lastText.trim()) {
              setInputText('');
              rec.stop();
              handleUserSendRef.current?.(lastText);
            }
          }, 2000); 
        }
      };

      rec.onend = () => {
        setIsListening(false);
        setStatusText(UI_TEXT[currentLangRef.current].status);
        clearTimeout(silenceTimer);
      };

      rec.onerror = () => {
        setIsListening(false);
        setStatusText(UI_TEXT[currentLangRef.current].status);
        clearTimeout(silenceTimer);
      };

      recognitionRef.current = rec;
    }

    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    setIsScrolled(window.scrollY > 50);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      observer.disconnect();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = currentLang === 'ja' ? 'ja-JP' : 'en-US';
    }
  }, [currentLang]);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messages, currentTypingText]);

  const unlockAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAAA';
        audioRef.current.volume = 0;
        audioRef.current.play().catch(() => {});
      } catch (e) {}
    }
    if (window.speechSynthesis) {
      try {
        const u = new SpeechSynthesisUtterance('');
        u.volume = 0;
        window.speechSynthesis.speak(u);
      } catch (e) {}
    }
  };

  const stopSpeaking = () => {
    activeTypingSessionRef.current += 1;
    setCurrentTypingText('');
    
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.src = '';
      } catch (e) {}
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsSpeaking(false);
    setStatusText(UI_TEXT[currentLangRef.current].status);
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    localStorage.setItem('ai_concierge_muted', nextMuted);
    if (nextMuted) {
      stopSpeaking();
    }
  };

  const handleToggleLanguage = () => {
    const nextLang = currentLang === 'ja' ? 'en' : 'ja';
    const nextVoice = VOICES_DICT[nextLang][currentGender][0].value;
    
    setCurrentLang(nextLang);
    setCurrentVoice(nextVoice);
    localStorage.setItem('ai_concierge_lang', nextLang);
    setStatusText(UI_TEXT[nextLang].status);
    stopSpeaking();
    
    const greeting = UI_TEXT[nextLang].greeting;
    lastAnswerRef.current = greeting;
    setMessages([]);
    
    setTimeout(() => {
      speakLastAnswerDynamic(greeting, nextLang, nextVoice, true);
    }, 150);
  };

  const playGcpTtsAudio = (audioData, rate = playbackRateRef.current) => {
    return new Promise((resolve) => {
      if (isMutedRef.current || !audioRef.current || !audioData) { resolve(); return; }
      
      let objectUrl = null;
      let isResolved = false;

      const safeResolve = () => {
        if (isResolved) return;
        isResolved = true;
        
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onpause = null;
        
        setIsSpeaking(false);
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        }
        resolve();
      };

      try {
        audioRef.current.pause();

        if (audioData.startsWith('http://') || audioData.startsWith('https://') || audioData.startsWith('data:')) {
          audioRef.current.src = audioData;
        } else {
          const byteCharacters = atob(audioData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          const blob = new Blob([byteArray], { type: 'audio/mp3' });
          objectUrl = URL.createObjectURL(blob);
          audioRef.current.src = objectUrl;
        }
        
        audioRef.current.volume = 1.0;
        audioRef.current.playbackRate = rate;
        
        setIsSpeaking(true);
        
        audioRef.current.onended = safeResolve;
        audioRef.current.onerror = safeResolve;
        audioRef.current.onpause = safeResolve;
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.error("Audio playback failed:", e);
            safeResolve();
          });
        }

        setTimeout(safeResolve, 15000);
      } catch (e) {
        safeResolve();
      }
    });
  };

  const typewriteSentence = (sentenceText, sessionId, rate = playbackRateRef.current) => {
    return new Promise((resolve) => {
      const charArray = Array.from(sentenceText);

      if (currentLangRef.current !== 'ja') {
        if (activeTypingSessionRef.current !== sessionId) { resolve(); return; }
        setCurrentTypingText(prev => prev + sentenceText);
        resolve();
        return;
      }

      let i = 0;
      const speed = Math.round(75 / rate);
      
      const typeWriter = () => {
        if (activeTypingSessionRef.current !== sessionId) {
          resolve();
          return;
        }

        if (i < charArray.length) {
          const char = charArray[i];
          setCurrentTypingText(prev => prev + char);
          i++;
          setTimeout(typeWriter, speed);
        } else {
          resolve();
        }
      };
      typeWriter();
    });
  };

  const prefetchSentence = async (text, voice) => {
    const cacheKey = `${voice}_${text}`;
    if (voiceCacheRef.current[cacheKey]) return;

    try {
      const res = await fetch('/api/concierge', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text, voice, ttsOnly: true }) 
      });
      if (res.ok) {
        const data = await res.json();
        if (data.audio) {
          voiceCacheRef.current[cacheKey] = data.audio;
        }
      }
    } catch (e) {}
  };

  const speakLastAnswerDynamic = async (fullText, lang = currentLang, voice = currentVoice, isGreeting = false) => {
    if (!fullText) return;
    
    stopSpeaking();
    
    const mySessionId = activeTypingSessionRef.current;
    
    if (!isGreeting) {
      setStatusText(lang === 'en' ? 'Thinking...' : '考え中・・・');
    } else {
      setStatusText(lang === 'en' ? 'Speaking...' : 'お話し中...');
    }

    const sentences = [fullText];
    let sentenceIndex = 0;
    
    const playNext = async () => {
      if (activeTypingSessionRef.current !== mySessionId) return;

      if (sentenceIndex >= sentences.length) {
        if (activeTypingSessionRef.current === mySessionId) {
          setMessages(prev => [...prev, { role: 'bot', text: fullText }]);
          setCurrentTypingText('');
        }
        setStatusText(UI_TEXT[lang].status);
        return;
      }

      const txt = sentences[sentenceIndex];
      const cacheKey = `${voice}_${txt}`;
      let audioData = voiceCacheRef.current[cacheKey];

      if (!audioData) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 20000);

          const res = await fetch('/api/concierge', { 
            method: 'POST', 
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({ text: txt, voice, ttsOnly: true }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (res.ok) {
            const data = await res.json();
            if (data.audio) {
              audioData = data.audio;
              voiceCacheRef.current[cacheKey] = audioData;
            }
          }
        } catch (e) {
          console.warn("TTS generation timed out or failed, falling back to text-only typing:", e);
        }
      }

      if (sentenceIndex + 1 < sentences.length) {
        prefetchSentence(sentences[sentenceIndex + 1], voice);
      }

      if (activeTypingSessionRef.current !== mySessionId) return;

      setIsThinking(false);
      setStatusText(lang === 'en' ? 'Speaking...' : 'お話し中...');

      if (audioData) {
        setIsSpeaking(true);
        await Promise.all([
          typewriteSentence(txt, mySessionId),
          playGcpTtsAudio(audioData)
        ]);
      } else {
        if (lang === 'en') {
          setIsSpeaking(true);
          const fallbackPromise = new Promise(resolve => {
            if (!window.speechSynthesis) { resolve(); return; }
            const utterance = new SpeechSynthesisUtterance(txt);
            utterance.lang = 'en-US';
            utterance.rate = 1.1;
            utterance.onend = resolve;
            utterance.onerror = resolve;
            window.speechSynthesis.speak(utterance);
          });
          await Promise.all([
            typewriteSentence(txt, mySessionId),
            fallbackPromise
          ]);
        } else {
          await typewriteSentence(txt, mySessionId);
        }
      }

      sentenceIndex++;
      await playNext();
    };

    await playNext();
  };

  const handleUserSend = async (textToSend) => {
    const query = textToSend || inputText.trim();
    if (!query) return;

    setInputText('');
    stopSpeaking();
    
    setMessages(prev => [...prev, { role: 'user', text: query }]);
    setStatusText(currentLang === 'en' ? 'Thinking...' : '応答を考えています...');
    setIsThinking(true);

    let botAnswer = '';
    try {
      const res = await fetch('/api/concierge', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ text: query, voice: currentVoice, textOnly: true }) 
      });
      if (res.ok) {
        const data = await res.json();
        if (data.answer) {
          botAnswer = data.answer;
        }
      }
    } catch (e) {}

    if (!botAnswer) {
      botAnswer = currentLang === 'ja' ? UI_TEXT.ja.def : UI_TEXT.en.def;
    }

    setIsThinking(false);
    lastAnswerRef.current = botAnswer;
    await speakLastAnswerDynamic(botAnswer);
  };
  
  useEffect(() => {
    handleUserSendRef.current = handleUserSend;
  }, [handleUserSend]);

  const openModal = () => {
    unlockAudio();
    setIsModalOpen(true);
    if (messages.length === 0 && !currentTypingText) {
      const greeting = UI_TEXT[currentLang].greeting;
      speakLastAnswerDynamic(greeting, undefined, undefined, true);
    }
  };

  const closeModal = () => {
    stopSpeaking();
    setIsModalOpen(false);
  };

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) recognitionRef.current.stop();
      return;
    }
    stopSpeaking();
    unlockAudio();
    setIsListening(true);
    setStatusText(currentLang === 'en' ? 'Listening...' : '聞いています...');
    if (recognitionRef.current) recognitionRef.current.start();
  };

  const handleChipClick = (chipText) => {
    handleUserSend(chipText);
  };

  return (
    <>
      <header className={`header ${isScrolled ? 'scrolled' : ''}`} id="header">
        <a href="#" className="logo-link">
          Salon de Beauty
        </a>
        <nav className="nav">
          <a href="#concept">CONCEPT<small>コンセプト</small></a>
          <a href="#features">FEATURES<small>特徴</small></a>
          <a href="#menu">MENU<small>メニュー</small></a>
          <a href="#before-after">BEFORE/AFTER<small>改善事例</small></a>
          <a href="#access">ACCESS<small>アクセス</small></a>
        </nav>
        <a href="https://beauty.hotpepper.jp/slnH000000000/" target="_blank" rel="noopener noreferrer" className="btn-book">WEB予約はこちら</a>
        <button className="menu-toggle"><span></span><span></span><span></span></button>
      </header>

      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <p className="hero-tag">Hair Quality Improvement</p>
          <h1 className="hero-title">
            <strong>くせ毛特化</strong>の髪質改善<br />
            あなたの髪を、理想の艶髪へ。
          </h1>
          <p className="hero-sub">
            長年のくせ毛、広がり、パサつきのお悩みを根本から解決。<br />
            当サロン独自の髪質改善エステで、乾かすだけでまとまる美しい髪へ導きます。
          </p>
          <div className="hero-ctas">
            <a href="https://beauty.hotpepper.jp/slnH000000000/" target="_blank" rel="noopener noreferrer" className="btn primary">HOT PEPPER Beautyで予約</a>
            <a href="#concept" className="btn">CONCEPTを見る</a>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="hero-ai-btn ai-fab" onClick={openModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
              AIコンシェルジュに相談
            </button>
          </div>
        </div>
      </section>

      <section className="concept" id="concept">
        <div className="section-head">
          <p className="section-en">CONCEPT</p>
          <h2 className="section-jp">もう、くせ毛で悩まない。</h2>
        </div>
        <p className="concept-lead">
          毎日アイロンで伸ばしても、夕方には元通り。<br />
          そんな<em>「くせ毛の悩み」</em>に特化した専門サロンです。
        </p>
        <p className="concept-text">
          当店では、一人ひとりの髪質やダメージの状態を丁寧にカウンセリングし、最適な髪質改善プログラムをご提案します。ただ真っ直ぐにする縮毛矯正ではなく、髪の内部から栄養を満たし、しなやかで自然なストレートヘアを実現します。「自分の髪じゃないみたい！」という感動を、ぜひご体験ください。
        </p>
      </section>

      <section className="features" id="features">
        <div className="section-head">
          <p className="section-en">FEATURES</p>
          <h2 className="section-jp">選ばれる3つの理由</h2>
        </div>
        <div className="feature-grid">
          <div className="feature">
            <p className="feature-num">01</p>
            <div className="feature-icon">✨</div>
            <h3>くせ毛特化の<br />独自メソッド</h3>
            <p>何千人ものくせ毛に悩むお客様を施術してきた経験と技術で、どんなガンコなくせ毛も自然で艶やかなストレートに導きます。</p>
          </div>
          <div className="feature">
            <p className="feature-num">02</p>
            <div className="feature-icon">🌿</div>
            <h3>髪を傷めない<br />オーダーメイド調合</h3>
            <p>お客様の髪の状態に合わせて薬剤をミリ単位で調合。ダメージを最小限に抑えながら、髪の芯まで栄養を届けます。</p>
          </div>
          <div className="feature">
            <p className="feature-num">03</p>
            <div className="feature-icon">🛋️</div>
            <h3>完全マンツーマンの<br />プライベート空間</h3>
            <p>最初から最後まで一人のスタイリストが担当。周りの目を気にせず、リラックスしてお悩みをご相談いただけます。</p>
          </div>
        </div>
      </section>

      <section className="split" id="menu">
        <div className="split-inner">
          <div className="split-img">
            <img src="/japanese_salon_menu.png" alt="サロンのメニュー" />
          </div>
          <div className="split-text">
            <p className="section-en">MENU</p>
            <h2><small>人気No.1メニュー</small>プレミアム髪質改善エステ</h2>
            <p>
              当サロンの看板メニュー。従来の縮毛矯正とは違い、特殊なトリートメント成分を髪の深部まで浸透させながらクセを優しく伸ばします。
              <br /><br />
              <strong>【料金】 22,000円（税込）</strong><br />
              <strong>【時間】 約180分</strong>
            </p>
            <a href="https://beauty.hotpepper.jp/slnH000000000/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-accent)', fontWeight: 'bold', textDecoration: 'underline' }}>詳細・ご予約はこちら ➔</a>
          </div>
        </div>
      </section>

      <section className="split reverse" id="before-after">
        <div className="split-inner">
          <div className="split-img">
            <img src="/before_after_hair.png" alt="劇的な変化" />
          </div>
          <div className="split-text">
            <p className="section-en">BEFORE / AFTER</p>
            <h2><small>驚きの変化</small>乾かすだけで、このツヤ感。</h2>
            <p>
              パサつきやうねりで広がっていた髪も、施術後は乾かすだけでまとまる美しい艶髪に。朝のスタイリングにかかる時間が劇的に短縮されます。
              毎日のアイロンから解放され、雨の日でも広がらない感動を体験してください。
            </p>
            <a href="https://beauty.hotpepper.jp/slnH000000000/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--c-accent)', fontWeight: 'bold', textDecoration: 'underline' }}>もっと事例を見る ➔</a>
          </div>
        </div>
      </section>

      <section className="ai-concierge-banner" style={{ padding: '80px 20px', background: 'linear-gradient(to right, var(--c-bg2), #fff)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ flex: '1 1 400px' }}>
            <h2 className="ai-banner-title" style={{ textAlign: 'left', marginBottom: '16px', fontSize: 'clamp(24px, 4vw, 32px)' }}>
              AIコンシェルジュが<br />予約を増やすお手伝いをします。
            </h2>
            <p className="ai-banner-text" style={{ textAlign: 'left', marginBottom: '24px', fontSize: '15px', lineHeight: '1.8' }}>
              「私の髪質でも効果ある？」「どのメニューを選べばいい？」<br />
              24時間いつでも、当サロンのAIコンシェルジュ「さくら」がお答えします。<br />
              音声でもテキストでも、お気軽に質問してください。
            </p>
            <button onClick={openModal} className="btn primary" style={{ borderRadius: '30px', fontSize: '16px', padding: '16px 40px', boxShadow: '0 4px 15px rgba(229, 158, 178, 0.4)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              AIに質問する
            </button>
            
            <div style={{ marginTop: '40px', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid var(--c-line)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '16px', color: 'var(--c-ink)', fontSize: '15px' }}>予約導線はどちらでも可能です。</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a href="https://beauty.hotpepper.jp/slnH000000000/" target="_blank" rel="noopener noreferrer" className="btn" style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ddd', flex: '1', minWidth: '200px', fontSize: '13px', textAlign: 'center', padding: '12px' }}>ホットペッパービューティーで予約</a>
                <a href="#access" className="btn primary" style={{ flex: '1', minWidth: '200px', fontSize: '13px', textAlign: 'center', padding: '12px' }}>お店に直接予約</a>
              </div>
            </div>
          </div>
          
          <div style={{ flex: '1 1 300px', textAlign: 'center' }}>
            <img src="/stylist_avatar.png" alt="AIコンシェルジュ さくら" style={{ maxWidth: '100%', height: 'auto', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' }} />
          </div>
        </div>
      </section>

      <section className="access" id="access" style={{ background: 'var(--c-bg2)', padding: '100px 40px', textAlign: 'center' }}>
        <div className="section-head">
          <p className="section-en">ACCESS</p>
          <h2 className="section-jp">アクセス</h2>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '16px', color: 'var(--c-ink)' }}>Salon de Beauty</h3>
          <p style={{ lineHeight: '2', color: 'var(--c-sub)' }}>
            〒150-0001<br />
            東京都渋谷区神宮前1-2-3 ビューティービル 2F<br />
            東京メトロ表参道駅 A2出口より徒歩3分<br />
            <br />
            営業時間：10:00 〜 20:00（最終受付 18:00）<br />
            定休日：毎週火曜日
          </p>
          <a href="https://beauty.hotpepper.jp/slnH000000000/" target="_blank" rel="noopener noreferrer" className="btn primary" style={{ marginTop: '32px' }}>WEB予約はこちら</a>
        </div>
      </section>

      {/* ============== B2B CLOSING ============== */}
      <section className="b2b-closing" id="b2b-closing" style={{ background: '#2a2325', color: '#fff', padding: '120px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: 'var(--c-accent)', fontSize: '14px', letterSpacing: '0.2em', marginBottom: '16px', fontWeight: 'bold' }}>FOR SALON OWNERS</p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: '24px', letterSpacing: '0.1em', fontFamily: '"Noto Serif JP", serif', lineHeight: '1.6' }}>
            このランディングページを、<br />あなたのサロンにも。
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '2.2', marginBottom: '48px', color: 'rgba(255,255,255,0.8)' }}>
            ここまでご覧いただいたような、洗練されたデザインと<br />24時間対応のAIコンシェルジュを搭載したランディングページを作成しませんか？<br />
            サロンの魅力を最大限に伝え、予約率の向上に貢献します。
          </p>
          
          <div style={{ background: '#fff', color: '#333', padding: '48px 32px', borderRadius: '16px', textAlign: 'left', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '22px', textAlign: 'center', marginBottom: '32px', color: 'var(--c-ink)', fontFamily: '"Noto Serif JP", serif' }}>無料相談申し込み</h3>
            <form action="https://ssgform.com/s/jCKanDfgQdB9" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--c-text)' }}>会社名 または 店舗名 <span style={{ color: '#e53e3e', fontSize: '12px', marginLeft: '4px' }}>必須</span></label>
                <input type="text" name="会社名or店舗名" required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', background: '#fafafa' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--c-text)' }}>氏名 <span style={{ color: '#e53e3e', fontSize: '12px', marginLeft: '4px' }}>必須</span></label>
                <input type="text" name="氏名" required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', background: '#fafafa' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--c-text)' }}>メールアドレス <span style={{ color: '#e53e3e', fontSize: '12px', marginLeft: '4px' }}>必須</span></label>
                <input type="email" name="メールアドレス" required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', background: '#fafafa' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--c-text)' }}>住所 <span style={{ color: '#e53e3e', fontSize: '12px', marginLeft: '4px' }}>必須</span></label>
                <input type="text" name="住所" required style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', background: '#fafafa' }} />
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="submit" className="btn primary" style={{ width: '100%', maxWidth: '320px', fontSize: '16px', padding: '18px', borderRadius: '40px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(229, 158, 178, 0.4)' }}>無料相談申し込み</button>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '20px' }}>※2営業日以内に担当者よりご連絡いたします。</p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <h2 className="footer-logo">Salon de Beauty</h2>
            <p className="footer-info">
              くせ毛特化の髪質改善専門サロン<br />
              あなたの髪を、理想の艶髪へ。
            </p>
          </div>
          <div>
            <h4 style={{ fontFamily: '"Cormorant Garamond", serif', letterSpacing: '0.2em', marginBottom: '16px', fontSize: '14px' }}>MENU</h4>
            <ul style={{ listStyle: 'none', lineHeight: '2.4', fontSize: '13px' }}>
              <li><a href="#concept">コンセプト</a></li>
              <li><a href="#features">当サロンの特徴</a></li>
              <li><a href="#menu">髪質改善メニュー</a></li>
              <li><a href="#before-after">改善事例</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ fontFamily: '"Cormorant Garamond", serif', letterSpacing: '0.2em', marginBottom: '16px', fontSize: '14px' }}>CONTACT</h4>
            <ul style={{ listStyle: 'none', lineHeight: '2.4', fontSize: '13px' }}>
              <li><a href="#access">アクセス</a></li>
              <li><a href="https://beauty.hotpepper.jp/slnH000000000/" target="_blank" rel="noopener noreferrer">WEB予約</a></li>
              <li><a href="#">よくある質問</a></li>
              <li><a href="#">プライバシーポリシー</a></li>
            </ul>
          </div>
        </div>
        <p className="copyright">© {new Date().getFullYear()} Salon de Beauty. All Rights Reserved.</p>
      </footer>

      {/* ============== AI CONCIERGE MODAL ============== */}
      <div className={`ai-modal-overlay ${isModalOpen ? 'open' : ''}`} id="aiModal" onClick={(e) => e.target.id === 'aiModal' && closeModal()}>
        <div className="ai-modal">
          <div className="ai-modal-header">
            <div className="ai-header-info">
              <div className={`ai-live-avatar ${isSpeaking ? 'speaking' : ''}`} style={{ background: 'transparent', overflow: 'hidden' }}>
                <img src="/stylist_avatar.png" alt="さくら" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
              <div className="ai-header-text">
                <h3>{UI_TEXT[currentLang].name}</h3>
                <div className="ai-status">
                  {(statusText.includes('考え中') || statusText.includes('Thinking') || statusText.includes('考えています')) ? (
                    <span style={{ display: 'inline-flex', gap: '3px', alignItems: 'center' }}>
                      <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--c-accent)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                      <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--c-accent)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.16s' }}></span>
                      <span style={{ width: '6px', height: '6px', backgroundColor: 'var(--c-accent)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s' }}></span>
                    </span>
                  ) : (
                    <span>{statusText}</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="ai-controls">
              <button className="ai-icon-btn" onClick={toggleMute} title="消音切替" style={{ opacity: isMuted ? 0.5 : 1 }}>
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                  {!isMuted && <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>}
                  {isMuted && <line x1="1" y1="1" x2="23" y2="23" stroke="currentColor" strokeWidth={2} strokeLinecap="round"></line>}
                </svg>
              </button>
              
              <button className="ai-icon-btn" onClick={handleToggleLanguage} style={{ fontSize: '11px', fontWeight: 'bold' }}>
                {currentLang === 'ja' ? 'EN' : 'JP'}
              </button>

              <button className="ai-icon-btn" onClick={closeModal}>
                <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>
            </div>
          </div>

          <div style={{ background: 'var(--c-bg2)', padding: '10px 24px', display: 'flex', flexDirection: 'column', gap: '8px', borderBottom: '1px solid var(--c-line)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--c-sub)', fontSize: '12px', letterSpacing: '0.1em', minWidth: '35px' }}>{UI_TEXT[currentLang].voiceLabel}</span>
              <select value={currentVoice} onChange={(e) => setCurrentVoice(e.target.value)} style={{ flex: 1, background: '#fff', color: 'var(--c-ink)', border: '1px solid var(--c-line)', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                {VOICES_DICT[currentLang][currentGender].map(v => (
                  <option key={v.value} value={v.value}>{v.label}</option>
                ))}
              </select>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ color: 'var(--c-sub)', fontSize: '12px', letterSpacing: '0.1em', minWidth: '35px' }}>{UI_TEXT[currentLang].speedLabel}</span>
              <select value={playbackRate.toString()} onChange={(e) => {
                const speed = parseFloat(e.target.value);
                setPlaybackRate(speed);
                localStorage.setItem('ai_concierge_speed', speed.toString());
              }} style={{ flex: 1, background: '#fff', color: 'var(--c-ink)', border: '1px solid var(--c-line)', padding: '6px 12px', borderRadius: '4px', fontSize: '13px', outline: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <option value="1.0">{UI_TEXT[currentLang].speedNormal}</option>
                <option value="1.25">{UI_TEXT[currentLang].speedFast}</option>
                <option value="1.5">{UI_TEXT[currentLang].speedFastest}</option>
              </select>
            </div>
          </div>

          <div className="ai-chat-body" ref={chatBodyRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`ai-msg ${m.role}`}>
                <div className="ai-bubble" dangerouslySetInnerHTML={{ __html: m.text }}></div>
              </div>
            ))}
            
            {currentTypingText && (
              <div className="ai-msg bot">
                <div className="ai-bubble" dangerouslySetInnerHTML={{ __html: currentTypingText }}></div>
              </div>
            )}

            {isThinking && (
              <div className="ai-msg bot">
                <style>{`
                  @keyframes bounce {
                    0%, 80%, 100% { transform: scale(0); }
                    40% { transform: scale(1.0); }
                  }
                `}</style>
                <div className="ai-bubble" style={{ display: 'flex', gap: '4px', alignItems: 'center', height: '36px' }}>
                  <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--c-ink)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both' }}></span>
                  <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--c-ink)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.16s' }}></span>
                  <span style={{ width: '8px', height: '8px', backgroundColor: 'var(--c-ink)', borderRadius: '50%', animation: 'bounce 1.4s infinite ease-in-out both', animationDelay: '0.32s' }}></span>
                </div>
              </div>
            )}

            {!currentTypingText && !isThinking && (
              <div className="ai-chips">
                {UI_TEXT[currentLang].chips.map((chip, idx) => (
                  <button key={idx} className="ai-chip" onClick={() => handleChipClick(chip)}>{chip}</button>
                ))}
              </div>
            )}
          </div>

          <div className="ai-input-area">
            <button className="ai-icon-btn" onClick={toggleListening} title="音声で質問" style={{ color: isListening ? 'var(--c-accent)' : 'var(--c-sub)' }}>
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
            </button>
            <input 
              type="text" 
              className="ai-text-input"
              value={inputText} 
              onChange={(e) => setInputText(e.target.value)} 
              onKeyDown={(e) => e.key === 'Enter' && handleUserSend()} 
              placeholder={UI_TEXT[currentLang].placeholder} 
            />
            <button className="ai-send-btn" onClick={() => handleUserSend()}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13"></line>
                <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
