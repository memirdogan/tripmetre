# Trip Ölçer 😾

Sevgilinden gelen mesajı yaz, tribin seviyesini canlı olarak ölç. Yarım daire bir hız göstergesi, seviyeye göre değişen meme, ses ve efektler (sallanma, kırmızı yanıp sönen kenarlar, çatlak cam) içeren tamamen statik bir mini site.

- Sadece HTML + CSS + vanilla JavaScript. Backend, API, veritabanı, yapay zekâ yok.
- Her şey tarayıcıda çalışır. `index.html` dosyasını çift tıklayıp açarsan görsel ve efektler çalışır; ses dosyaları `fetch` ile okunduğu için ses için yerel sunucu (aşağıya bak) ya da Vercel/GitHub Pages gerekir.
- Mobil öncelikli: dikey telefon ekranında kaydırma gerektirmeden tek ekrana sığar.

## Nasıl puanlıyor?

1. **Sözlük:** "peki", "sen bilirsin", "hiçbir şey" gibi klasik tripler (ve "tamam anladım", "tm", "görüşürüz", "anlıyorum" gibi düz yazılan soğuk cevaplar) sabit puan alır. Birden fazla ifade eşleşirse **en uzun (en özel) olan** kazanır: "önemli değil, ben kendim hallederim" (78), içindeki "önemli değil"in (85) önüne geçer. Türkçe karakter yazılmasa da eşleşir ("gorusuruz").
2. **Sözlükte yoksa:** puan metnin hash'inden üretilir; aynı mesaj her zaman aynı puanı alır.
3. **Çarpanlar:** nokta, "...", 🙂, 👍, BÜYÜK HARF, kalpli emojiler puanı değiştirir. Sadece 😊 ya da 👍 atılıp yazılmamışsa da puan alır.
4. **Sevgi sözcüğü ya da uzatma varsa puan düşük kalır:** "canım", "aşkım", "bitanem", "yavrum", "güzelim" gibi sözcükler geçiyorsa tavan 25, "canımmm", "tamammm", "peeeki" gibi uzatmalarda tavan 20 olur. Yani "Peki." çok yüksek, "Peki canımmm" Sakin çıkar.
5. Sonuç 0-100 arasına sıkıştırılır ve 4 seviyeden birine düşer: Sakin, Şüpheli, Tehlike, PATLAMA.

Sevgi sözcüklerini `trips.js` içindeki `AFFECTION_WORDS` listesinden, tavan değerlerini `rules` içindeki `sevgi-sozcugu` ve `uzatma` kurallarından değiştirebilirsin.

## Video modu (ekran kaydı için)

Adrese `?video=1` eklenince site ekran kaydı için sadeleşir, örneğin `https://siteadresin.com/?video=1`:

- Gizlenir: alt başlık, paylaş butonu, "Hemen özür dile" butonu, ses düğmesi, göstergedeki küçük sayılar.
- Büyür: ibre, puan ("Trip seviyesi" üstte, rakam dev boyutta altta), seviye adı ve seviye yazısı. Meme (kedi) daha çok yer kaplar.
- Kalır: mesaj kutusu (yazarken görünsün diye), kedi, tüm efektler ve sesler.
- Puan 55'ten 100'e geçerken yerleşim zıplamaz; her şey sabit yerinde durur.

Gizlenenleri değiştirmek için `style.css` sonundaki `html.video-mode` bölümüne bak. Örneğin özür butonunu videoda göstermek için `.actions` satırını gizleme listesinden çıkar.

Videoda mesajların puanına dikkat: sonuna nokta koymak puanı +20 yapar. `sen bilirsin` 85 (Tehlike) iken `sen bilirsin.` 100 (PATLAMA) olur.

## Kendi versiyonunu yap

Bütün ayarlar `trips.js` içinde. Mantık dosyasına (`script.js`) dokunmana gerek yok.

1. Bu repoyu **fork'la** (GitHub'da sağ üstteki Fork düğmesi) ve bilgisayarına klonla.
2. `trips.js` içindeki değişiklikleri yap:
   - `dictionary`: yeni trip ifadesi ekle ya da puanı değiştir.
   - `rules`: yeni çarpan/ek puan kuralı ekle (`test`, `mul` veya `add`).
   - `levels`: seviye adı, yazısı, rengi, görsel ve ses yolunu değiştir.
   - `apologyUrl`: PATLAMA'da çıkan butonun gideceği adres.
3. Görselleri ve sesleri değiştir (aşağıya bak).
4. Ücretsiz yayına al:

   **Vercel ile**
   1. [vercel.com](https://vercel.com) hesabına GitHub ile gir.
   2. **Add New → Project** de, fork'ladığın repoyu seç.
   3. Framework Preset: **Other**. Build komutu ve output klasörü boş kalsın.
   4. **Deploy**'a bas. Sonraki her `git push` otomatik yayına alınır.

   **GitHub Pages ile**
   1. Repoda **Settings → Pages**'e git.
   2. Source: **Deploy from a branch**, branch: **main**, klasör: **/ (root)**.
   3. **Save**. Birkaç dakika sonra `https://kullanici-adin.github.io/repo-adi/` adresinde yayında olur.

Yerelde denemek için klasörde `python3 -m http.server 8000` çalıştırıp `http://localhost:8000` adresini aç.

## Görseller ve sesler

Dosyalar yoksa site bozulmaz: görsel yerine büyük bir emoji (😺 😼 😾 🙀) gösterilir, ses sessizce atlanır.

| Klasör | Ne zaman gösterilir / çalar |
| --- | --- |
| `assets/memes/calm/` | 0-29 Sakin (ve mesaj boşken): sevimli, mutlu kediler |
| `assets/memes/suspicious/` | 30-59 Şüpheli: şüpheli bakan, küskün kediler |
| `assets/memes/danger/` | 60-89 Tehlike: somurtan, kızgın kediler (Grumpy Cat gibi) |
| `assets/memes/explosion/` | 90-100 PATLAMA: tıslayan, çığlık atan kediler |
| `assets/sounds/purr.mp3` | Sakin seviyesine geçince |
| `assets/sounds/dundun.mp3` | Şüpheli seviyesine geçince |
| `assets/sounds/siren.mp3` | Tehlike seviyesine geçince |
| `assets/sounds/glass.mp3` | PATLAMA seviyesine geçince |

Her seviyenin kendi meme grubu var; seviyeye her girişte **o gruptan** rastgele biri seçilir (art arda aynısı gelmez). Yani mesaj sakinken sevimli kedi, patlamada tıslayan kedi çıkar.

Yeni meme eklemek için:
1. Görseli ilgili seviyenin klasörüne koy (öneri: en uzun kenarı 900px, jpg).
2. `trips.js` en üstündeki `MEMES` listesine yolunu ekle. Tarayıcı klasör listeleyemediği için yolun listede de olması gerekir.
3. Kaynağı ve lisansı `assets/memes/CREDITS.md` dosyasına yaz.

Ses dosyalarının **ilk saniyesinde sessizlik olmamalı**; ses efekti dosyanın 0. saniyesinde başlamalı, yoksa efekt gecikmiş gibi çalar. (ffmpeg ile başı kırpmak için: `ffmpeg -i giris.mp3 -af "atrim=start=1.6,asetpts=PTS-STARTPTS" cikis.mp3`)

Notlar:
- Ses sadece seviye **değişince** çalar, her tuşta çalmaz.
- Tarayıcılar sesi ilk dokunuş/tuştan önce engellediği için ses ilk etkileşimden sonra aktif olur.
- Sağ üstteki 🔊 düğmesiyle ses kapatılabilir.
- İşletim sisteminde "hareketi azalt" açıksa sallanma ve yanıp sönme efektleri kapanır.

## Görsel kaynakları ve lisanslar

Memelerin çoğu Wikimedia Commons'tan alındı, yeniden boyutlandırılıp jpg'ye çevrildi. CC BY ve CC BY-SA lisansları kaynak belirtmeyi şart koştuğu için eser, yazar ve lisans listesi [`assets/memes/CREDITS.md`](assets/memes/CREDITS.md) dosyasında. Kendi versiyonunu yayınlıyorsan kullandığın görsellerin ve seslerin hakları sende olmalı.

## Dosya yapısı

```
index.html        sayfa iskeleti
style.css         tasarım ve seviye efektleri (sallanma, kırmızı kenar, çatlak cam)
script.js         puanlama motoru ve arayüz mantığı
trips.js          sözlük, çarpanlar, seviyeler (burayı düzenle)
assets/memes/     seviye görselleri (calm, suspicious, danger, explosion klasörleri) ve CREDITS.md
assets/sounds/    seviye sesleri
```
