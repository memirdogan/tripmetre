/*
 * Trip Ölçer – ayarlar
 * --------------------
 * Yeni trip, çarpan, seviye veya efekt eklemek için sadece bu dosyayı düzenle.
 * script.js bu objeyi okur; mantık kısmına dokunmana gerek yok.
 *
 * NOT: Sözlük anahtarlarını küçük harf, noktalama/emoji olmadan yaz.
 *      (Yine de script.js anahtarları aynı şekilde normalize eder.)
 */

// Kalp emojileri: mesajda geçerse puan düşer (aşağıdaki "kalp" kuralı)
const HEART_EMOJIS = ['❤', '😘', '🥰', '😍', '💕', '💖', '💗', '💓', '💞', '💋', '♥', '😚', '😻'];

// Seviye başına meme grupları. Seviyeye her girişte AYNI gruptan rastgele biri seçilir.
// Tarayıcı klasör listeleyemediği için yeni dosyayı buraya da yazman gerekir.
// Kaynak ve lisanslar: assets/memes/CREDITS.md
const MEMES = {
  calm: [
    'assets/memes/calm/calm-01.jpg', 'assets/memes/calm/calm-02.jpg', 'assets/memes/calm/calm-03.jpg',
    'assets/memes/calm/calm-04.jpg', 'assets/memes/calm/calm-05.jpg', 'assets/memes/calm/calm-06.jpg',
    'assets/memes/calm/calm-07.jpg', 'assets/memes/calm/calm-08.jpg', 'assets/memes/calm/calm-09.jpg',
    'assets/memes/calm/calm-10.jpg', 'assets/memes/calm/calm-11.jpg',
  ],
  suspicious: [
    'assets/memes/suspicious/suspicious-01.jpg', 'assets/memes/suspicious/suspicious-02.jpg',
    'assets/memes/suspicious/suspicious-03.jpg', 'assets/memes/suspicious/suspicious-04.jpg',
    'assets/memes/suspicious/suspicious-05.jpg', 'assets/memes/suspicious/suspicious-06.jpg',
    'assets/memes/suspicious/suspicious-07.jpg', 'assets/memes/suspicious/suspicious-08.jpg',
  ],
  danger: [
    'assets/memes/danger/danger-01.jpg', 'assets/memes/danger/danger-02.jpg', 'assets/memes/danger/danger-03.jpg',
    'assets/memes/danger/danger-04.jpg', 'assets/memes/danger/danger-05.jpg', 'assets/memes/danger/danger-06.jpg',
    'assets/memes/danger/danger-07.jpg', 'assets/memes/danger/danger-08.jpg',
  ],
  explosion: [
    'assets/memes/explosion/explosion-01.jpg', 'assets/memes/explosion/explosion-02.jpg',
    'assets/memes/explosion/explosion-03.jpg', 'assets/memes/explosion/explosion-04.jpg',
    'assets/memes/explosion/explosion-05.jpg', 'assets/memes/explosion/explosion-06.jpg',
    'assets/memes/explosion/explosion-07.jpg', 'assets/memes/explosion/explosion-08.jpg',
    'assets/memes/explosion/explosion-09.jpg',
  ],
};

window.TRIP_CONFIG = {

  // ---------------------------------------------------------------
  // 1) Klasik trip sözlüğü: "ifade": puan (0-100)
  //    Mesajda bu ifadeler KELİME OLARAK geçiyorsa puan alınır.
  //    Birden fazla ifade eşleşirse en yüksek puan geçerli olur.
  // ---------------------------------------------------------------
  dictionary: {
    'tamam': 30,
    'ok': 35,
    'k': 60,
    'peki': 45,
    'iyi': 50,
    'hı': 40,
    'hıhı': 40,
    'haklısın': 65,
    'nasıl istersen': 70,
    'sen bilirsin': 80,
    'boşver': 80,
    'önemli değil': 85,
    'uykum var': 75,
    'yok bir şey': 100,
    'bir şey yok': 100,
    'eğlenmene bak': 100,
    'seni seviyorum': 0,
  },

  // Bu ifadeler geçerse puan her şeye rağmen 0 olur ve ekranda kalpler uçuşur
  lovePhrases: ['seni seviyorum'],

  // ---------------------------------------------------------------
  // 2) Çarpan / ek puan kuralları
  //    - test(raw): ORİJİNAL metne (baş/son boşluğu silinmiş) bakar
  //    - mul: puanı çarpar   - add: puana ekler (negatif olabilir)
  //    Önce tüm "mul"lar uygulanır, sonra tüm "add"ler eklenir,
  //    sonuç 0-100 arasına sıkıştırılır.
  //    Yeni kural eklemek için listeye bir obje daha ekle.
  // ---------------------------------------------------------------
  rules: [
    { id: 'tek-nokta',    test: (raw) => /[^.…]\.$/.test(raw),                          add: 20 },
    { id: 'uc-nokta',     test: (raw) => raw.includes('...') || raw.includes('…'),      add: 15 },
    { id: 'saskin-gulus', test: (raw) => raw.includes('🙂'),                            mul: 1.5 },
    { id: 'basparmak',    test: (raw) => raw.includes('👍'),                            add: 25 },
    {
      // Tamamı büyük harf (en az 3 harf)
      id: 'bagirma',
      test: (raw) => (raw.match(/\p{L}/gu) || []).length >= 3 && !/\p{Ll}/u.test(raw),
      add: 30,
    },
    { id: 'kalp',         test: (raw) => HEART_EMOJIS.some((e) => raw.includes(e)),     add: -40 },
  ],

  // ---------------------------------------------------------------
  // 3) Özel durum: erkenden "iyi geceler"
  //    Saat afterHour ile beforeHour arasındaysa direkt 100.
  //    (Gece 02:00'de "iyi geceler" demek normal; o yüzden afterHour var.)
  // ---------------------------------------------------------------
  goodNight: {
    phrase: 'iyi geceler',
    afterHour: 6,
    beforeHour: 21,
    score: 100,
    extraText: 'Saat daha {saat}. Kaç.',
  },

  // ---------------------------------------------------------------
  // 4) Seviyeler (min-max dahil). Görsel/ses dosyası yoksa site bozulmaz:
  //    görsel yerine emoji gösterilir, ses sessizce atlanır.
  //    `meme` tek yol (string) ya da yol listesi (array) olabilir; liste verirsen
  //    seviyeye her girişte rastgele biri seçilir (art arda aynısı gelmez).
  //    Efektler (sallanma, kırmızı kenar, çatlak cam) style.css içinde
  //    body.level-<id> sınıflarına bağlı.
  // ---------------------------------------------------------------
  levels: [
    {
      id: 'calm', min: 0, max: 29,
      name: 'Sakin', text: 'Rahat ol, sorun yok.',
      emoji: '😺', color: '#22c55e',
      meme: MEMES.calm, sound: 'assets/sounds/purr.mp3',
    },
    {
      id: 'suspicious', min: 30, max: 59,
      name: 'Şüpheli', text: 'Bir şeyler dönüyor...',
      emoji: '😼', color: '#facc15',
      meme: MEMES.suspicious, sound: 'assets/sounds/dundun.mp3',
    },
    {
      id: 'danger', min: 60, max: 89,
      name: 'Tehlike', text: 'Şu an düşünüyor. Dikkat.',
      emoji: '😾', color: '#fb923c',
      meme: MEMES.danger, sound: 'assets/sounds/siren.mp3',
    },
    {
      id: 'explosion', min: 90, max: 100,
      name: 'PATLAMA', text: 'ÇİÇEK AL. HEMEN.',
      emoji: '🙀', color: '#ef4444',
      meme: MEMES.explosion,
      sound: 'assets/sounds/glass.mp3',
    },
  ],

  // Input boşken gösterilen "bekleme" durumu (ses çalmaz)
  idle: {
    id: 'idle',
    name: 'Hazır', text: 'Mesajı yaz, ibre oynasın.',
    emoji: '😺', color: '#c4b5fd',
    meme: MEMES.calm,
  },

  // PATLAMA seviyesinde çıkan buton
  apologyUrl: 'https://ozur.memir.codes',
  apologyLabel: 'Hemen özür dile 🙏',

  // Paylaşım metni ({puan} ve {link} otomatik doldurulur)
  shareText: 'Gelen mesajın trip seviyesi: {puan}/100 😾 Sen de ölç: {link}',

  // Yazarken hesaplama gecikmesi (ms)
  debounceMs: 120,
};
