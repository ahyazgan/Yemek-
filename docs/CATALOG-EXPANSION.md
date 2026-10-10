# Genişletilmiş tarif kataloğu

11 Ekim 2026 · Sofra geçici ürün adı, çatı şirket Yazgan.

Katalog 26'dan **40 tarife** çıktı. 14 yeni tarif; 43 ortak malzeme, altı kategori ve toplam sekiz editoryal seçki kullanır. Kahvaltı, fırın ve soğuk sofra seçkileri eklendi; çorba seçkisi altı tarife genişledi.

| Kategori  | Eklenen tarifler                                                                                               |
| --------- | -------------------------------------------------------------------------------------------------------------- |
| Kahvaltı  | Sarımsaklı yoğurtlu çılbır; maydanozlu peynirli krep; domatesli peynirli biber                                 |
| Çorba     | Sütlü domates çorbası; sebzeli pirinç çorbası                                                                  |
| Ana yemek | Fırında limonlu tavuk ve patates; zeytinyağlı kabak dolması; fırında peynirli makarna; nohutlu sebze tenceresi |
| Salata    | Limonlu fasulye piyazı; bol yeşillikli nohut salatası                                                          |
| Yan yemek | Yoğurtlu havuç tarator; naneli cacık                                                                           |
| Tatlı     | Zeytinyağlı un helvası                                                                                         |

## İçerik ve hesap

- Her tarifte temel porsiyon, gramaj, hazırlık/pişirme/bekleme ayrımı, ekipman, özgün adımlar, iki püf noktası ve servis fikri var.
- Tarifler düzenlenebilir, favoriye/koleksiyona eklenebilir, seçilen porsiyonla menüde ve alışverişte kullanılabilir.
- 1 kişilik çılbır (150 g yoğurt) + 2 kişilik cacık (250 g yoğurt) = 400 g ihtiyaç. Evde 150 g varsa tek alışveriş satırında 250 g kalır.
- Bakliyat pişmiş ve süzülmüş, yumurta kabuksuz ağırlıkla hesaplanır. Kabak dolmasında oyma öncesi ayıklanmış kabak ağırlığı kullanılır; kuru/pişmiş dönüşümü yapılmaz.
- 20 dakika ve altındaki tarifler dokuz seçeneğe, tatlılar üç seçeneğe çıktı. Seçkiler beslenme, süre, hariç malzeme ve ekipman tercihlerine uyar.

## Kayıtların korunması

`src/data/catalog-expansion.ts` tariflerin kaynağıdır. Mevcut katalog yükseltmesi yeni kimlikleri ekler; kişisel tarif, not, malzeme, stok, öğün, favori, koleksiyon ve kayıtlı listeyi korur. İkinci açılışta tarif çoğalmaz. Eski 26 tarifin sırası/kimliği korundu, ortak malzeme sözlüğüne yeni kimlik eklenmedi.

`supabase/seed.sql` yerel dosyası 40 tarif için yeniden üretildi. Yeni migration gerekmez. Uzak **yemek** veritabanına bu aşamada yazılmadı; oradaki katalog önceki 26 satırdır. Uygulamanın yerel kataloğu açılışta genişler. Seed mevcut kimlikleri güncellemeden eksikleri ekler.

## Görseller ve içerik kontrolü

14 özgün temsili yemek görseli yerleşik imagegen ile üretildi. Toplam 38 PNG, iki airfryer tarifinin mevcut görsel eşlemesiyle 40 tarifi kapsar. Fotoğraflar çevrimdışı pakette bulunur; dış görsel hizmeti gerekmez. Görsel toplamı 90,63 MiB. [Üretim yöntemi ve tüm promptlar](CATALOG-IMAGE-PROMPTS.md).

Tarifler bu proje için yazılmış örnek anlatımlardır; mutfakta denenmiş veya uzman onaylı oldukları ileri sürülmez. Yayından önce tariflerin temel ve yüksek porsiyonlarla mutfak denemesi yapılmalı. Bütçe sınıfları yaklaşık içerik gruplamasıdır, güncel market fiyatı değildir.

Tavuk tarifinde termometreyle en az 74 °C iç sıcaklık, çılbırda tamamen katı beyaz/sarı kontrolü yer alır. Bu kontrollerin kaynağı [FoodSafety.gov pişirme sıcaklıkları](https://www.foodsafety.gov/food-safety-charts/safe-minimum-internal-temperatures); tarif metni bu kaynaktan kopyalanmadı.

## Sıradaki aşama

Fiziksel iOS/Android telefonlar hazır olduğunda yükleme, dokunma/klavye, kamera/galeri, bildirim, paylaşım, çevrimdışı yeniden açılış ve veri kalıcılığı kabul testleri yapılacak. Web/Hermes çıktısı bu testlerin yerine geçmez. Ardından resmî market API erişimi ve ortaklık koşulları konuşulacak. Alan adı/SMTP ve gerçek hesap denemesi kullanıcının seçimiyle son aşamada.
