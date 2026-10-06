/*
 * Trip Ölçer – ana mantık
 * Ayarlar (sözlük, kurallar, seviyeler) trips.js içinde; burası sadece motor.
 * Bölümler: 1) metin yardımcıları  2) puanlama  3) arayüz
 */
(function () {
  'use strict';

  const CFG = window.TRIP_CONFIG;

  // ===============================================================
  // 1) METİN YARDIMCILARI
  // ===============================================================

  // Türkçe'ye uygun küçük harf: "İ"→"i", "I"→"ı"
  // (toLowerCase tek başına "İ"yi "i̇" yapıp eşleşmeyi bozar, o yüzden elle çeviriyoruz)
  function trLower(s) {
    return s.replace(/İ/g, 'i').replace(/I/g, 'ı').toLowerCase();
  }

  // Eşleştirme için: küçük harf + noktalama/emoji temizliği + tek boşluk
  function cleanForMatch(s) {
    return trLower(s).replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim();
  }

  // cyrb53: hızlı, iyi dağılımlı 53-bit hash. Aynı metin → hep aynı sayı.
  function cyrb53(str, seed) {
    let h1 = 0xdeadbeef ^ (seed || 0);
    let h2 = 0x41c6ce57 ^ (seed || 0);
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  // Türkçe karakterleri sadeleştir: ç→c, ğ→g, ı→i, ö→o, ş→s, ü→u (â/î/û de)
  // Sadece sözlük eşleştirmesinde kullanılır: "gorusuruz" yazan da "görüşürüz"ü yakalasın.
  function fold(s) {
    return s.replace(/ç/g, 'c').replace(/ğ/g, 'g').replace(/ı/g, 'i').replace(/ö/g, 'o')
      .replace(/ş/g, 's').replace(/ü/g, 'u').replace(/â/g, 'a').replace(/î/g, 'i').replace(/û/g, 'u');
  }

  // Art arda tekrarlanan harfleri teke indir: "canımmm" → "canım", "peeekii" → "peki"
  function squash(s) {
    return s.replace(/(\p{L})\1+/gu, '$1');
  }

  // Eşleştirme formu: küçük harf + temiz + katlanmış + tekrarsız
  const matchForm = (s) => squash(fold(cleanForMatch(s)));

  // "ifade", temizlenmiş metinde tam kelime(ler) olarak geçiyor mu?
  function hasPhrase(cleaned, phrase) {
    return (' ' + cleaned + ' ').includes(' ' + phrase + ' ');
  }

  // ===============================================================
  // 2) PUANLAMA
  // ===============================================================

  // Sözlük anahtarlarını bir kez normalize et (kelime sayısı: "en uzun eşleşme kazanır" için)
  const DICT = Object.keys(CFG.dictionary).map((k) => {
    const phrase = matchForm(k);
    return { phrase, pts: CFG.dictionary[k], words: phrase.split(' ').length };
  });
  const LOVE = new Set(CFG.lovePhrases.map(matchForm));

  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function getLevel(score) {
    return CFG.levels.find((l) => score >= l.min && score <= l.max) || CFG.levels[CFG.levels.length - 1];
  }

  /**
   * Mesajın trip puanını hesaplar.
   * @param {string} text  Kullanıcının yazdığı mesaj
   * @param {Date}   [now] Saat kontrolü için (test edilebilsin diye parametre)
   * @returns {null | {score:number, hearts:boolean, extra:string|null, rules:string[]}}
   *          Boş mesajda null döner.
   */
  function computeTrip(text, now) {
    const raw = text.trim();
    if (!raw) return null;

    const cleaned = cleanForMatch(raw);

    // Kurallara ve sözlüğe verilen yardımcı: metnin katlanmış/tekrarsız hali ve kelime kontrolü
    const squashed = squash(fold(cleaned));
    const t = {
      cleaned,
      squashed,
      hasWord: (word) => hasPhrase(squashed, matchForm(word)),
    };

    // --- Özel durum: erken saatte "iyi geceler" → direkt 100 ---
    const gn = CFG.goodNight;
    if (gn && t.hasWord(gn.phrase)) {
      const d = now || new Date();
      const hour = d.getHours();
      if (hour >= gn.afterHour && hour < gn.beforeHour) {
        const saat = String(hour).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
        return { score: gn.score, hearts: false, extra: gn.extraText.replace('{saat}', saat), rules: ['iyi-geceler'] };
      }
    }

    // --- Taban puan: önce sözlük, yoksa sadece-emoji tablosu, yoksa hash ---
    const matches = DICT.filter((d) => hasPhrase(squashed, d.phrase));
    let base;
    let hearts = false;
    if (matches.length) {
      hearts = matches.some((m) => LOVE.has(m.phrase));
      // En uzun (en özel) eşleşme kazanır: "önemli değil, ben kendim hallederim", "önemli değil"in
      // önüne geçer. Eşitlikte en yüksek puan.
      matches.sort((x, y) => y.words - x.words || y.pts - x.pts);
      base = hearts ? 0 : matches[0].pts;
    } else if (!cleaned && CFG.emojiOnly && Object.keys(CFG.emojiOnly).some((e) => raw.includes(e))) {
      // Yazı yok, sadece emoji (😊 / 👍 atıp arkasından yazmamak)
      base = Math.max(...Object.keys(CFG.emojiOnly).filter((e) => raw.includes(e)).map((e) => CFG.emojiOnly[e]));
    } else {
      // Sözlükte yok: metnin hash'inden 0-100 üret (hep aynı metin = aynı puan).
      // Metin sadece emoji/noktalamaysa temizlenmiş hali boş kalır, ham metni hash'le.
      base = cyrb53(cleaned || trLower(raw)) % 101;
    }

    // --- Kurallar (orijinal metne bakar): önce mul, sonra add, en son cap (tavan) ---
    let mul = 1;
    let add = 0;
    let cap = 100;
    const applied = [];
    for (const rule of CFG.rules) {
      if (!rule.test(raw, t)) continue;
      applied.push(rule.id);
      if (rule.mul) mul *= rule.mul;
      if (rule.add) add += rule.add;
      if (rule.cap != null) cap = Math.min(cap, rule.cap);
    }

    const score = Math.round(clamp(Math.min(base * mul + add, cap), 0, 100));
    return { score, hearts, extra: null, rules: applied };
  }

  // Node/test ortamı için dışarı aç (tarayıcıda zararsız)
  window.TripScore = { computeTrip, cleanForMatch, cyrb53, getLevel, fold, squash };

  // ===============================================================
  // 3) ARAYÜZ
  // ===============================================================

  function initUI() {
    const $ = (id) => document.getElementById(id);
    const els = {
      app: $('app'), msg: $('msg'), score: $('score'), needle: $('needle'), ticks: $('ticks'),
      levelName: $('levelName'), levelText: $('levelText'), levelExtra: $('levelExtra'),
      meme: $('meme'), memeImg: $('memeImg'), memeEmoji: $('memeEmoji'),
      share: $('shareBtn'), apology: $('apologyBtn'), sound: $('soundBtn'), hearts: $('hearts'),
    };

    const state = {
      levelId: null,      // şu an gösterilen seviye (sadece DEĞİŞİNCE ses çalar)
      shown: 0,           // ekranda görünen (animasyonlu) puan
      score: 0,           // son hesaplanan gerçek puan
      hasResult: false,
      love: false,        // kalp efekti zaten tetiklendi mi
      soundOn: true,
      current: null,      // şu an çalan ses kaynağı (Web Audio)
      soundToken: 0,      // her yeni ses isteğinde artar; geç kalan eski istekleri iptal eder
      raf: 0,
      timer: 0,
    };

    // ---------- Gösterge çizgileri ve sayıları ----------
    function buildTicks() {
      const NS = 'http://www.w3.org/2000/svg';
      for (let i = 0; i <= 10; i++) {
        const major = i % 5 === 0;
        const line = document.createElementNS(NS, 'line');
        line.setAttribute('x1', 100); line.setAttribute('x2', 100);
        line.setAttribute('y1', major ? 33 : 35); line.setAttribute('y2', major ? 43 : 40);
        line.setAttribute('transform', `rotate(${-90 + i * 18} 100 100)`);
        line.setAttribute('class', major ? 'tick major' : 'tick');
        els.ticks.appendChild(line);
      }
      [0, 50, 100].forEach((val) => {
        const a = ((-90 + val * 1.8) * Math.PI) / 180;
        const t = document.createElementNS(NS, 'text');
        t.setAttribute('x', 100 + 42 * Math.sin(a));
        t.setAttribute('y', 100 - 42 * Math.cos(a) + 3 - (val === 50 ? 0 : 12));
        t.setAttribute('class', 'tick-label');
        t.textContent = val;
        els.ticks.appendChild(t);
      });
    }

    const setNeedle = (score) => { els.needle.style.transform = `rotate(${-90 + score * 1.8}deg)`; };

    // Puan sayısını yumuşakça sayarak değiştir (ibreyle uyumlu)
    function animateScore(to) {
      cancelAnimationFrame(state.raf);
      const from = state.shown;
      const start = performance.now();
      const dur = 500;
      const step = (t) => {
        const p = Math.min(1, (t - start) / dur);
        const eased = 1 - Math.pow(1 - p, 3);
        state.shown = from + (to - from) * eased;
        els.score.textContent = Math.round(state.shown);
        if (p < 1) state.raf = requestAnimationFrame(step);
      };
      state.raf = requestAnimationFrame(step);
    }

    // ---------- Ses (Web Audio API) ----------
    // Neden Web Audio? <audio> ögeleri iOS/Safari'de her seferinde "kullanıcı dokunuşu" ister,
    // başlama anı da biraz oynak olur. AudioContext tek bir etkileşimle açılır, sonra
    // sesler istenen anda gecikmesiz başlar.
    // Ses dosyaları sayfa açılırken indirilir; çözme (decode) ilk etkileşimde yapılır.
    const rawSounds = {};   // seviye id → Promise<ArrayBuffer|null>
    const buffers = {};     // seviye id → Promise<AudioBuffer|null>
    let ctx = null;

    CFG.levels.forEach((level) => {
      if (!level.sound) return;
      rawSounds[level.id] = fetch(level.sound)
        .then((r) => (r.ok ? r.arrayBuffer() : null))
        .catch(() => null);          // dosya yok (ya da file:// ile açıldı): sessizce devam
    });

    function ensureContext() {
      if (ctx) return ctx;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
      // iOS: sessiz anahtar (ringer) açıkken Web Audio sustuğu için sesi "oynatma" kategorisine al
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch (e) { /* desteklenmiyor */ }
      Object.keys(rawSounds).forEach((id) => {
        buffers[id] = rawSounds[id].then((data) => (data
          ? new Promise((resolve) => ctx.decodeAudioData(data, resolve, () => resolve(null)))
          : null)).catch(() => null);
      });
      return ctx;
    }

    // AudioContext çalışmıyorsa (ilk açılış ya da sekme/uygulama arka plana gidip askıya alındıysa)
    // her etkileşimde yeniden uyandırmayı dener. Sadece gerçekten "etkileşim sayılan" olaylara
    // bağlıyız: dokunmatikte pointerdown sayılmaz, pointerup/touchend/click sayılır.
    function unlockAudio() {
      if (ctx && ctx.state === 'running') return;
      const c = ensureContext();
      if (!c) return;
      c.resume().catch(() => {});
      try {   // iOS: etkileşim anında çalan sessiz bir ses, sesin kilidini açar
        const src = c.createBufferSource();
        src.buffer = c.createBuffer(1, 1, 22050);
        src.connect(c.destination);
        src.start(0);
      } catch (e) { /* önemli değil */ }
    }
    ['pointerup', 'touchend', 'click', 'keydown'].forEach((ev) => document.addEventListener(ev, unlockAudio));

    function stopSound() {
      state.soundToken++;
      if (state.current) {
        try { state.current.stop(); } catch (e) { /* zaten bitmiş */ }
        state.current = null;
      }
    }

    function playLevelSound(level) {
      stopSound();
      const token = state.soundToken;
      if (!state.soundOn || !ctx || !buffers[level.id]) return;
      buffers[level.id].then((buf) => {
        // Çözme sürerken seviye/ses ayarı değiştiyse eski isteği çalma
        if (!buf || token !== state.soundToken || !state.soundOn) return;
        const start = () => {
          if (token !== state.soundToken) return;
          const src = ctx.createBufferSource();
          src.buffer = buf;
          src.connect(ctx.destination);
          src.onended = () => { if (state.current === src) state.current = null; };
          state.current = src;
          src.start(0);
        };
        if (ctx.state === 'running') start();
        else ctx.resume().then(start).catch(() => {});   // askıdaysa uyandırıp çal
      });
    }

    // Seviyede birden fazla meme varsa rastgele birini seç; aynı seviyede art arda aynısı gelmesin
    const lastMeme = {};
    function pickMeme(level) {
      const list = Array.isArray(level.meme) ? level.meme : [level.meme];
      if (list.length === 1) return list[0];
      let pick;
      do { pick = list[Math.floor(Math.random() * list.length)]; } while (pick === lastMeme[level.id]);
      lastMeme[level.id] = pick;
      return pick;
    }

    // ---------- Seviye değişimi ----------
    // Yazı, görsel, renk, body sınıfı (efektler CSS'te) ve ses burada güncellenir.
    function applyLevel(level, withSound) {
      document.body.className = 'level-' + level.id;
      document.documentElement.style.setProperty('--lvl', level.color);
      els.levelName.textContent = level.name;
      els.levelText.textContent = level.text;
      els.meme.setAttribute('aria-label', level.name);
      els.memeEmoji.textContent = level.emoji;
      els.meme.classList.remove('fallback');
      els.memeImg.alt = level.name;
      els.memeImg.src = pickMeme(level);   // dosya yoksa onerror → emoji göster
      els.meme.classList.remove('pop');
      void els.meme.offsetWidth;      // animasyonu yeniden başlat
      els.meme.classList.add('pop');
      if (withSound) playLevelSound(level); else stopSound();
      syncViewport();                 // body sınıfı sıfırlandı, compact sınıflarını geri koy
    }

    els.memeImg.addEventListener('error', () => els.meme.classList.add('fallback'));

    // ---------- Kalp yağmuru ("seni seviyorum") ----------
    function spawnHearts(count) {
      const faces = ['❤️', '💖', '💕', '💗'];
      for (let i = 0; i < count; i++) {
        const h = document.createElement('span');
        h.className = 'heart';
        h.textContent = faces[Math.floor(Math.random() * faces.length)];
        h.style.left = Math.random() * 100 + '%';
        h.style.fontSize = 22 + Math.random() * 28 + 'px';
        h.style.animationDuration = 2 + Math.random() * 1.8 + 's';
        h.style.animationDelay = Math.random() * 0.6 + 's';
        h.addEventListener('animationend', () => h.remove());
        els.hearts.appendChild(h);
      }
    }

    // ---------- Ana güncelleme ----------
    function update() {
      const result = computeTrip(els.msg.value);

      // Boş mesaj: bekleme durumu
      if (!result) {
        state.hasResult = false;
        state.love = false;
        state.score = 0;
        setNeedle(0);
        animateScore(0);
        els.levelExtra.hidden = true;
        els.apology.hidden = true;
        els.share.disabled = true;
        if (state.levelId !== CFG.idle.id) { state.levelId = CFG.idle.id; applyLevel(CFG.idle, false); }
        return;
      }

      const level = getLevel(result.score);
      state.hasResult = true;
      state.score = result.score;

      setNeedle(result.score);
      animateScore(result.score);

      // Seviye SADECE değişince güncellenir ve ses çalar
      if (level.id !== state.levelId) {
        state.levelId = level.id;
        applyLevel(level, true);
      }

      els.levelExtra.textContent = result.extra || '';
      els.levelExtra.hidden = !result.extra;
      els.apology.hidden = result.score < 90;
      els.share.disabled = false;

      // Kalpler: "seni seviyorum" ilk göründüğünde bir kez uçuşsun
      if (result.hearts && !state.love) spawnHearts(18);
      state.love = result.hearts;
    }

    els.msg.addEventListener('input', () => {
      clearTimeout(state.timer);
      state.timer = setTimeout(update, CFG.debounceMs);
    });

    // ---------- Paylaş ----------
    async function copyText(text) {
      try {
        await navigator.clipboard.writeText(text);
        return true;
      } catch (e) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        let ok = false;
        try { ok = document.execCommand('copy'); } catch (err) { /* yok say */ }
        ta.remove();
        return ok;
      }
    }

    els.share.addEventListener('click', async () => {
      if (!state.hasResult) return;
      const link = location.href.split(/[?#]/)[0];
      const text = CFG.shareText.replace('{puan}', state.score).replace('{link}', link);

      if (navigator.share) {
        try { await navigator.share({ text }); return; } catch (e) {
          if (e && e.name === 'AbortError') return; // kullanıcı vazgeçti
          // başka hata: panoya kopyalamaya düş
        }
      }
      const label = els.share.textContent;
      const ok = await copyText(text);
      els.share.textContent = ok ? 'Kopyalandı ✓' : 'Kopyalanamadı';
      setTimeout(() => { els.share.textContent = label; }, 1800);
    });

    // ---------- Ses aç/kapa ----------
    els.sound.addEventListener('click', () => {
      state.soundOn = !state.soundOn;
      els.sound.textContent = state.soundOn ? '🔊' : '🔇';
      els.sound.setAttribute('aria-pressed', String(state.soundOn));
      els.sound.setAttribute('aria-label', state.soundOn ? 'Sesi kapat' : 'Sesi aç');
      if (!state.soundOn) stopSound();
    });

    // ---------- Klavye / ekran yüksekliği ----------
    // Mobilde klavye açılınca görünen alan küçülür. visualViewport ile gerçek
    // yüksekliği alıp uygulamayı ona sabitliyoruz; böylece gösterge ve input hep görünür.
    function syncViewport() {
      const vv = window.visualViewport;
      const h = vv ? vv.height : window.innerHeight;
      const top = vv ? vv.offsetTop : 0;
      const root = document.documentElement;
      root.style.setProperty('--vvh', h + 'px');
      root.style.setProperty('--vvtop', top + 'px');
      document.body.classList.toggle('compact', h < 600);
      document.body.classList.toggle('tiny', h < 440);
    }
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', syncViewport);
      window.visualViewport.addEventListener('scroll', syncViewport);
    }
    window.addEventListener('resize', syncViewport);
    window.addEventListener('orientationchange', syncViewport);

    // ---------- Başlangıç ----------
    els.apology.href = CFG.apologyUrl;
    els.apology.textContent = CFG.apologyLabel;
    buildTicks();
    state.levelId = CFG.idle.id;
    applyLevel(CFG.idle, false);
    setNeedle(0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initUI);
  } else {
    initUI();
  }
})();
