# Çarkıfelek Stüdyo

Tarayıcıda oynanan, ışıklı ve sesli Türkçe Çarkıfelek yarışma oyunu.

**Oyna:** https://adnanerdem2000-sudo.github.io/carkifelek/

- Tek, iki ve üç oyunculu yarışma; hızlı, standart ve uzun mod
- 14 dilimli çark (100–1000 puan, PAS, İFLAS), Web Audio ile üretilen sesler
- 30 kategoride 1.339 benzersiz bulmaca, tekrar etmeyen seçim (geçmiş tarayıcıda saklanır)
- Her el sonunda yenilenen ipucu marketi; ipuçları cevabı sızdırmaya karşı denetlenir

## Dosyalar
| Dosya | Görevi |
|---|---|
| `index.html` | Sayfa yapısı |
| `style.css` | Stüdyo görünümü ve animasyonlar |
| `script.js` | Oyun motoru: çark, puanlar, market, ses |
| `puzzles.js` | Bulmaca havuzu |
| `veri/` | Bulmaca kaynakları, doğrulayıcı ve birleştirme aracı |

## Bulmaca eklemek
1. `veri/parts/` içine yeni bir `.json` dosyası ekle:
   `{"cat":"Meslekler","a":"İTFAİYECİ","d":1,"sub":"...","mean":"...","theme":"..."}`
2. `node veri/validate.js veri/parts/yeni.json` ile denetle.
3. `node veri/build.js` ile `puzzles.js` dosyasını yeniden üret.

Bilgisayarda oynamak için `index.html` dosyasını tarayıcıda açman yeterli; internet gerekmez.
