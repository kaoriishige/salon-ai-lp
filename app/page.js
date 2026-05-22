"use client";

import { useState, useEffect, useRef } from 'react';

const UI_TEXT = {
  ja: { 
    name: '田代 稔 (AIコンシェルジュ)', 
    status: 'オンライン', 
    placeholder: 'AI導入やスクールについて質問する...', 
    send: '送信', 
    voiceLabel: '声質', 
    speedLabel: '速度', 
    speedNormal: '普通 (1.0x)', 
    speedFast: '早く (1.25x)', 
    speedFastest: '最速 (1.5x)', 
    chips: ['AI導入で予約は増える？', '費用はいくら？', 'スクールで何が学べる？', '実績を見せて', '那須塩原のどこにある？'], 
    greeting: 'こんにちは！サクセス研究社 代表の田代稔です。店舗へのAIエージェント導入や、AIエージェントマネージャー養成スクールについて、何でもお気軽にご質問くださいね。', 
    def: 'ご質問ありがとうございます。その件につきましては、代表の田代、またはスタッフが詳しくご案内いたします。詳細につきましては、お問い合わせ入力ページ（https://ssgform.com/s/3TQ1jL8kw53N）またはメール（success.kks.ai@gmail.com）までいつでもお気軽にお問い合わせください。' 
  },
  en: { 
    name: 'Minoru Tashiro (AI Concierge)', 
    status: 'Online', 
    placeholder: 'Ask about AI implementation or school...', 
    send: 'Send', 
    voiceLabel: 'Voice', 
    speedLabel: 'Speed', 
    speedNormal: 'Normal (1.0x)', 
    speedFast: 'Fast (1.25x)', 
    speedFastest: 'Fastest (1.5x)', 
    chips: ['Will AI increase bookings?', 'How much does it cost?', 'What can I learn?', 'Show me your works', 'Where are you located?'], 
    greeting: 'Hello! I am Minoru Tashiro, the representative of Success Kenkyusha. Please feel free to ask about introducing AI agents to your store or our training school.', 
    def: 'Thank you for your question. Our team will be happy to assist you in detail. Please feel free to contact us via the contact page (https://ssgform.com/s/3TQ1jL8kw53N) or email (success.kks.ai@gmail.com) anytime.' 
  }
};

const VOICES_DICT = {
  ja: {
    male: [
      { value: 'ja-JP-Chirp3-HD-Sadachbia', label: '田代 (落ち着いた知性 👨)' }
    ]
  },
  en: {
    male: [
      { value: 'en-US-Chirp3-HD-Umbriel', label: 'Minoru (Male 👔)' }
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
  const currentGender = 'male';
  const [currentVoice, setCurrentVoice] = useState('ja-JP-Chirp3-HD-Sadachbia');
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
  const currentVoiceRef = useRef('ja-JP-Chirp3-HD-Sadachbia');
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

  const openModal = () => {
    setIsModalOpen(true);
    unlockAudio();
    if (messages.length === 0) {
      setTimeout(() => {
        playGreetingStatic(currentLangRef.current, currentVoiceRef.current);
      }, 150);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    stopSpeaking();
  };

  const playGreetingStatic = async (lang = currentLang, voice = currentVoice) => {
    stopSpeaking();
    const mySessionId = activeTypingSessionRef.current;
    setStatusText(lang === 'en' ? 'Speaking...' : 'お話し中...');

    const greetingText = UI_TEXT[lang].greeting;
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const mp3Url = lang === 'en' ? `${origin}/greeting_en.mp3` : `${origin}/greeting_ja.mp3`;

    setIsThinking(false);
    setIsSpeaking(true);

    const playPromise = playGcpTtsAudio(mp3Url).then(async (success) => {
      if (!success && activeTypingSessionRef.current === mySessionId) {
        console.warn("Static greeting play failed, requesting dynamic TTS fallback...");
        try {
          const res = await fetch('/api/concierge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text: greetingText, voice, ttsOnly: true })
          });
          if (res.ok) {
            const data = await res.json();
            if (data.audio && activeTypingSessionRef.current === mySessionId) {
              await playGcpTtsAudio(data.audio);
            }
          }
        } catch (err) {
          console.error("Failed to fetch dynamic greeting TTS fallback:", err);
        }
      }
    });

    await Promise.all([
      typewriteSentence(greetingText, mySessionId),
      playPromise
    ]);

    if (activeTypingSessionRef.current === mySessionId) {
      setMessages(prev => [...prev, { role: 'bot', text: greetingText }]);
      setCurrentTypingText('');
      setStatusText(UI_TEXT[lang].status);
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
      playGreetingStatic(nextLang, nextVoice);
    }, 150);
  };

  const playGcpTtsAudio = (audioData, rate = playbackRateRef.current) => {
    return new Promise((resolve) => {
      if (isMutedRef.current || !audioRef.current || !audioData) { resolve(false); return; }
      
      let objectUrl = null;
      let isResolved = false;

      const safeResolve = (success = true) => {
        if (isResolved) return;
        isResolved = true;
        
        audioRef.current.onended = null;
        audioRef.current.onerror = null;
        audioRef.current.onpause = null;
        
        setIsSpeaking(false);
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        }
        resolve(success);
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
        
        audioRef.current.onended = () => safeResolve(true);
        audioRef.current.onerror = () => {
          console.warn("Audio playback error occurred in playGcpTtsAudio");
          safeResolve(false);
        };
        audioRef.current.onpause = () => safeResolve(true);
        
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          playPromise.catch((e) => {
            console.error("Audio playback failed:", e);
            safeResolve(false);
          });
        }

        setTimeout(() => safeResolve(false), 15000);
      } catch (e) {
        safeResolve(false);
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

  const toggleListening = () => {
    if (!recognitionRef.current) {
      alert(currentLang === 'ja' ? 'お使いのブラウザは音声認識に対応していません。' : 'Speech recognition not supported in this browser.');
      return;
    }
    unlockAudio();
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      stopSpeaking();
      setIsListening(true);
      setStatusText(currentLang === 'ja' ? '音声入力中...' : 'Listening...');
      recognitionRef.current.start();
    }
  };

  const handleChipClick = (text) => {
    handleUserSend(text);
  };

  return (
    <>
      <header className={`header ${isScrolled ? 'scrolled' : ''}`} id="header">
        <a href="#" className="logo-link">
          サクセス研究社
        </a>
        <nav className="nav">
          <a href="#concept">CONCEPT<small>コンセプト</small></a>
          <a href="#features">FEATURES<small>特長</small></a>
          <a href="#services">SERVICES<small>サービス内容</small></a>
          <a href="#portfolio">PORTFOLIO<small>導入実績</small></a>
          <a href="#company">COMPANY<small>会社概要</small></a>
        </nav>
        <a href="#contact" className="btn-book">無料相談はこちら</a>
        <button className="menu-toggle"><span></span><span></span><span></span></button>
      </header>

      <section className="hero">
        <div className="hero-bg"></div>
        <div className="hero-content">
          <p className="hero-tag">BtoC Store AI Agent</p>
          <h1 className="hero-title">
            <strong>BtoC店舗専門</strong>のAI導入支援<br />
            24時間働くAIエージェントを店舗に。
          </h1>
          <p className="hero-sub">
            美容室、整体院、飲食店、農家、自動車販売など、店舗ビジネスに特化したAIコンシェルジュの設計から導入までをトータルサポート。<br />
            自動応答で予約の取りこぼしを防ぎ、店舗運営の効率化と売上最大化を実現します。
          </p>
          <div className="hero-ctas">
            <a href="#contact" className="btn primary">無料相談に申し込む</a>
            <a href="#portfolio" className="btn">導入実績を見る</a>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button className="hero-ai-btn ai-fab" onClick={openModal}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"></path>
                <line x1="12" y1="19" x2="12" y2="22"></line>
              </svg>
              AIエージェント「田代稔」に相談
            </button>
          </div>
        </div>
      </section>

      <section className="concept" id="concept">
        <div className="section-head">
          <p className="section-en">CONCEPT</p>
          <h2 className="section-jp">AIが店舗運営の「あたりまえ」を変える。</h2>
        </div>
        <p className="concept-lead">
          深夜の予約取りこぼしや、施術中・接客中の電話対応に悩んでいませんか？<br />
          これからは<em>「AIエージェント」</em>が24時間体制でお客様をご案内します。
        </p>
        <p className="concept-text">
          サクセス研究社では、店舗独自のQ&Aやメニュー情報を学習させ、音声とテキストの両方で対話できるAIコンシェルジュをWebサイトやLPに導入します。ただ自動返信するだけのチャットボットとは異なり、代表・田代稔が長年培った店舗支援のノウハウをもとに、お客様を自然に予約やお問い合わせへと導く仕組みを構築します。
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
            <div className="feature-icon">🎯</div>
            <h3>BtoC店舗に特化した<br />独自対話設計</h3>
            <p>美容室や整体院、農家直売など、BtoC店舗ビジネスにおける顧客の心理と購買動線を分析し、予約率を高める対話シナリオを設計します。</p>
          </div>
          <div className="feature">
            <p className="feature-num">02</p>
            <div className="feature-icon">🗣️</div>
            <h3>音声とテキストの<br />ハイブリッド対話</h3>
            <p>テキストチャットはもちろん、高精度で自然な日本語音声での対話にも対応。スマートフォンからどなたでも簡単にご利用いただけます。</p>
          </div>
          <div className="feature">
            <p className="feature-num">03</p>
            <div className="feature-icon">🏫</div>
            <h3>内製化を支援する<br />養成スクール運営</h3>
            <p>導入して終わりではなく、自社でAIの対話ナレッジの調整や改善ができる「AIエージェントマネージャー」を育成し、長期的な自立運用をサポートします。</p>
          </div>
        </div>
      </section>

      {/* ============== SERVICES ============== */}
      <section className="split" id="services">
        <div className="split-inner">
          <div className="split-img">
            <img src="/ai_consulting_service.png" alt="AI導入コンサルティング" />
          </div>
          <div className="split-text">
            <p className="section-en">SERVICE 01</p>
            <h2><small>24時間365日の自動応答</small>AIエージェント導入コンサルティング</h2>
            <p>
              お客様の店舗独自のメニューやよくある質問（ナレッジベース）をもとに、音声とテキストで自動対応する高性能AIを構築します。<br />
              ホームページやLPに数行のコードを埋め込むだけで、深夜の予約取りこぼしや施術中の電話対応コストを削減します。
              <br /><br />
              <strong>【料金】 個別お見積もり（初回オンライン無料相談受付中）</strong>
            </p>
            <a href="#contact" style={{ color: 'var(--c-accent)', fontWeight: 'bold', textDecoration: 'underline' }}>無料相談のお申し込みはこちら ➔</a>
          </div>
        </div>
      </section>

      <section className="split reverse">
        <div className="split-inner">
          <div className="split-img">
            <img src="/ai_school_service.png" alt="AIエージェントマネージャー養成スクール" />
          </div>
          <div className="split-text">
            <p className="section-en">SERVICE 02</p>
            <h2><small>AIの設計・運用スキルを習得</small>AIエージェントマネージャー養成スクール</h2>
            <p>
              プログラミングの専門知識ゼロから、AIエージェントの設計、ナレッジ構築、プロンプトの調整、日々の改善運用までができる専門人材「AIエージェントマネージャー」を育成します。<br />
              校長の田代稔がマンツーマンで直接指導し、店舗でのAI内製化や新たなAIビジネスの立ち上げを支援します。
              <br /><br />
              <strong>【料金】 説明会にて個別にご案内</strong>
            </p>
            <a href="#contact" style={{ color: 'var(--c-accent)', fontWeight: 'bold', textDecoration: 'underline' }}>スクール説明会へ申し込む ➔</a>
          </div>
        </div>
      </section>

      {/* ============== PORTFOLIO (実績セクション) ============== */}
      <section className="portfolio" id="portfolio" style={{ padding: '100px 20px', background: 'var(--c-bg2)' }}>
        <div className="section-head">
          <p className="section-en">PORTFOLIO</p>
          <h2 className="section-jp">AIエージェント導入実績</h2>
        </div>
        
        <div className="portfolio-grid">
          <div className="portfolio-card">
            <img src="/portfolio_salon.png" className="portfolio-img" alt="サロンドビューティー" />
            <div className="portfolio-info">
              <span className="portfolio-tag">美容室LP実績</span>
              <h3>サロンドビューティー</h3>
              <p>髪質改善専門サロンのLPにAIコンシェルジュを導入。くせ毛の悩み、メニュー料金、予約方法に24時間対応し、予約導線を自動化しました。</p>
              <a href="https://salon-ai-lp.netlify.app/" target="_blank" rel="noopener noreferrer" className="portfolio-link">デモサイトを見る ➔</a>
            </div>
          </div>

          <div className="portfolio-card">
            <img src="/portfolio_adtown.png" className="portfolio-img" alt="adtown診断" />
            <div className="portfolio-info">
              <span className="portfolio-tag">診断・提案実績</span>
              <h3>adtown診断</h3>
              <p>ユーザーの悩みやニーズに応じた最適なプランをAIが自動診断して提案。対話形式でコンバージョンへとスムーズに導きます。</p>
              <a href="https://adtownshindan.netlify.app/" target="_blank" rel="noopener noreferrer" className="portfolio-link">デモサイトを見る ➔</a>
            </div>
          </div>

          <div className="portfolio-card">
            <img src="/portfolio_numai.png" className="portfolio-img" alt="沼井農園" />
            <div className="portfolio-info">
              <span className="portfolio-tag">お米農家・直売実績</span>
              <h3>沼井農園</h3>
              <p>那須町のお米農家「沼井農園」にAI案内を導入。コシヒカリやゆうだい21の品種の特徴、お米の美味しい炊き方、直売所へのアクセス等に自動回答します。</p>
              <a href="https://numainoen.netlify.app/" target="_blank" rel="noopener noreferrer" className="portfolio-link">デモサイトを見る ➔</a>
            </div>
          </div>

          <div className="portfolio-card">
            <img src="/portfolio_hikarino.png" className="portfolio-img" alt="Hikarino休日" />
            <div className="portfolio-info">
              <span className="portfolio-tag">整体院実績</span>
              <h3>Hikarino休日</h3>
              <p>筋膜整体院「Hikarino休日」のサイトにAI案内システムを導入。MS式筋膜整体の特徴、施術メニュー、アクセス、予約方法などの質問に24時間自動対応します。</p>
              <a href="https://hikarino-seitai.netlify.app/" target="_blank" rel="noopener noreferrer" className="portfolio-link">デモサイトを見る ➔</a>
            </div>
          </div>

          <div className="portfolio-card">
            <img src="/portfolio_car.png" className="portfolio-img" alt="自動車販売" />
            <div className="portfolio-info">
              <span className="portfolio-tag">自動車ディーラー実績</span>
              <h3>自動車販売</h3>
              <p>自動車販売店のWebサイトにAIエージェントを導入。取扱車種の特徴や購入手続き、試乗予約、車検、アクセス情報などに自動で答えます。</p>
              <a href="https://zidosyahanbai.netlify.app/" target="_blank" rel="noopener noreferrer" className="portfolio-link">デモサイトを見る ➔</a>
            </div>
          </div>

          <div className="portfolio-card">
            <img src="/portfolio_ramen.png" className="portfolio-img" alt="ラーメンHP" />
            <div className="portfolio-info">
              <span className="portfolio-tag">飲食店実績</span>
              <h3>ラーメンHP</h3>
              <p>ラーメン店のWebサイトにAI案内を導入。おすすめラーメンやトッピング、営業時間、混雑時間、アクセスなどお客様からの質問に自動で答えます。</p>
              <a href="https://ramenhp.netlify.app/" target="_blank" rel="noopener noreferrer" className="portfolio-link">デモサイトを見る ➔</a>
            </div>
          </div>
        </div>
      </section>

      {/* ============== AI CONCIERGE BANNER ============== */}
      <section className="ai-concierge-banner" style={{ padding: '80px 20px', background: 'linear-gradient(to right, var(--c-bg2), #fff)' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '40px', maxWidth: '1000px', margin: '0 auto' }}>
          <div style={{ flex: '1 1 400px' }}>
            <h2 className="ai-banner-title" style={{ textAlign: 'left', marginBottom: '16px', fontSize: 'clamp(24px, 4vw, 32px)' }}>
              AIコンシェルジュ「田代 稔」デモに<br />何でも質問してください。
            </h2>
            <p className="ai-banner-text" style={{ textAlign: 'left', marginBottom: '24px', fontSize: '15px', lineHeight: '1.8' }}>
              「AI導入にいくらかかる？」「スクールでは何が学べる？」「那須塩原の拠点の住所は？」など、サクセス研究社やAIエージェントに関するご質問に、田代稔をモデルにしたAIが今すぐ音声とテキストでお答えします。
            </p>
            <button onClick={openModal} className="btn primary" style={{ borderRadius: '30px', fontSize: '16px', padding: '16px 40px', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg>
              AIに質問する
            </button>
            
            <div style={{ marginTop: '40px', padding: '24px', background: '#fff', borderRadius: '12px', border: '1px solid var(--c-line)', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
              <p style={{ fontWeight: 'bold', marginBottom: '16px', color: 'var(--c-ink)', fontSize: '15px' }}>まずはお気軽に無料オンライン相談から</p>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                <a href="#contact" className="btn primary" style={{ flex: '1', minWidth: '200px', fontSize: '13px', textAlign: 'center', padding: '12px' }}>無料相談を申し込む</a>
                <a href="#portfolio" className="btn" style={{ background: '#f5f5f5', color: '#333', border: '1px solid #ddd', flex: '1', minWidth: '200px', fontSize: '13px', textAlign: 'center', padding: '12px' }}>導入実績を見る</a>
              </div>
            </div>
          </div>
          
          <div style={{ flex: '1 1 300px', textAlign: 'center' }}>
            <img src="/tashiro_avatar.jpg" alt="AI導入コンサルタント 田代稔" style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '16px', objectFit: 'cover', filter: 'drop-shadow(0 20px 30px rgba(0,0,0,0.15))' }} />
          </div>
        </div>
      </section>

      {/* ============== COMPANY & ACCESS ============== */}
      <section className="access" id="company" style={{ background: 'var(--c-bg2)', padding: '100px 40px', textAlign: 'center' }}>
        <div className="section-head">
          <p className="section-en">COMPANY</p>
          <h2 className="section-jp">会社概要</h2>
        </div>
        <div style={{ maxWidth: '800px', margin: '0 auto', background: '#fff', padding: '40px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
          <h3 style={{ fontSize: '20px', marginBottom: '24px', color: 'var(--c-ink)', fontWeight: 'bold' }}>サクセス研究社</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', lineHeight: '2', color: 'var(--c-sub)', fontSize: '15px' }}>
            <tbody>
              <tr style={{ borderBottom: '1px solid var(--c-line)' }}>
                <th style={{ padding: '12px 0', width: '120px', fontWeight: 'bold', color: 'var(--c-ink)' }}>代表者</th>
                <td style={{ padding: '12px 0' }}>田代 稔 (AI導入コンサルタント / AIエージェントマネージャー)</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--c-line)' }}>
                <th style={{ padding: '12px 0', fontWeight: 'bold', color: 'var(--c-ink)' }}>所在地</th>
                <td style={{ padding: '12px 0' }}>〒325-0026 栃木県那須塩原市上厚崎578-30</td>
              </tr>
              <tr style={{ borderBottom: '1px solid var(--c-line)' }}>
                <th style={{ padding: '12px 0', fontWeight: 'bold', color: 'var(--c-ink)' }}>メール</th>
                <td style={{ padding: '12px 0' }}>success.kks.ai@gmail.com</td>
              </tr>
              <tr>
                <th style={{ padding: '12px 0', fontWeight: 'bold', color: 'var(--c-ink)' }}>事業内容</th>
                <td style={{ padding: '12px 0' }}>
                  BtoC店舗向けAIエージェントの導入コンサルティング<br />
                  AIエージェントマネージャー養成スクールの運営
                </td>
              </tr>
            </tbody>
          </table>
          <a href="#contact" className="btn primary" style={{ marginTop: '32px' }}>無料オンライン相談はこちら</a>
        </div>
      </section>

      {/* ============== CONTACT (無料相談フォーム) ============== */}
      <section className="b2b-closing" id="contact" style={{ background: '#0f172a', color: '#fff', padding: '120px 40px', textAlign: 'center' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <p style={{ color: 'var(--c-accent)', fontSize: '14px', letterSpacing: '0.2em', marginBottom: '16px', fontWeight: 'bold' }}>FREE CONSULTATION</p>
          <h2 style={{ fontSize: 'clamp(24px, 4vw, 36px)', marginBottom: '24px', letterSpacing: '0.1em', fontFamily: '"Noto Serif JP", serif', lineHeight: '1.6' }}>
            店舗へのAI導入・スクールに関する<br />無料相談はこちらから。
          </h2>
          <p style={{ fontSize: '15px', lineHeight: '2.2', marginBottom: '48px', color: 'rgba(255,255,255,0.8)' }}>
            サクセス研究社では、店舗へのAIコンシェルジュ導入の個別お見積もりや、<br />
            AIエージェントマネージャー養成スクールの説明会予約を無料で承っております。<br />
            以下のフォームよりお気軽にお申し込みください。
          </p>
          
          <div style={{ background: '#fff', color: '#333', padding: '48px 32px', borderRadius: '16px', textAlign: 'left', boxShadow: '0 10px 30px rgba(0,0,0,0.5)' }}>
            <h3 style={{ fontSize: '22px', textAlign: 'center', marginBottom: '32px', color: 'var(--c-ink)', fontFamily: '"Noto Serif JP", serif' }}>無料相談申し込み</h3>
            <form action="https://ssgform.com/s/3TQ1jL8kw53N" method="POST" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: 'bold', color: 'var(--c-text)' }}>お問い合わせ内容 <span style={{ color: '#e53e3e', fontSize: '12px', marginLeft: '4px' }}>必須</span></label>
                <textarea name="お問い合わせ内容" required rows="4" style={{ width: '100%', padding: '14px', border: '1px solid #ddd', borderRadius: '6px', fontSize: '16px', background: '#fafafa', fontFamily: 'inherit' }} placeholder="AI導入について相談したい、スクール説明会に参加したい、などをご記入ください。"></textarea>
              </div>
              <div style={{ textAlign: 'center', marginTop: '16px' }}>
                <button type="submit" className="btn primary" style={{ width: '100%', maxWidth: '320px', fontSize: '16px', padding: '18px', borderRadius: '40px', fontWeight: 'bold', boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)' }}>無料相談申し込み</button>
                <p style={{ fontSize: '13px', color: '#888', marginTop: '20px' }}>※2営業日以内に担当者よりご連絡いたします。</p>
              </div>
            </form>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <h2 className="footer-logo">サクセス研究社</h2>
            <p className="footer-info">
              BtoC店舗専門のAI導入支援・コンサルティング<br />
              店舗運営の自動化と売上最大化を実現します。
            </p>
          </div>
          <div>
            <h4 style={{ letterSpacing: '0.2em', marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>MENU</h4>
            <ul style={{ listStyle: 'none', lineHeight: '2.4', fontSize: '13px' }}>
              <li><a href="#concept">コンセプト</a></li>
              <li><a href="#features">当社の特長</a></li>
              <li><a href="#services">提供サービス</a></li>
              <li><a href="#portfolio">導入実績</a></li>
            </ul>
          </div>
          <div>
            <h4 style={{ letterSpacing: '0.2em', marginBottom: '16px', fontSize: '14px', fontWeight: 'bold' }}>CONTACT</h4>
            <ul style={{ listStyle: 'none', lineHeight: '2.4', fontSize: '13px' }}>
              <li><a href="#company">会社概要</a></li>
              <li><a href="#contact">無料相談・お問い合わせ</a></li>
            </ul>
          </div>
        </div>
        <p className="copyright">© {new Date().getFullYear()} サクセス研究社. All Rights Reserved.</p>
      </footer>

      {/* ============== AI CONCIERGE MODAL ============== */}
      <div className={`ai-modal-overlay ${isModalOpen ? 'open' : ''}`} id="aiModal" onClick={(e) => e.target.id === 'aiModal' && closeModal()}>
        <div className="ai-modal">
          <div className="ai-modal-header">
            <div className="ai-header-info">
              <div className={`ai-live-avatar ${isSpeaking ? 'speaking' : ''}`} style={{ background: 'transparent', overflow: 'hidden' }}>
                <img src="/tashiro_avatar.jpg" alt="田代 稔" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
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
