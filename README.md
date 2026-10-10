# Sofra · Yazgan

Türkiye için Türkçe, çevrimdışı tarif → haftalık menü → akıllı alışveriş uygulaması. **Sofra geçici ürün adıdır; çatı şirket Yazgan.** iOS, Android ve web için React Native + Expo SDK 57 + TypeScript kullanır.

Jow'un yemek seçme/menü/alışveriş akışından esinlenir. Marka, Türkçe tarif metinleri ve yerel temsili yemek görselleri projeye aittir. Krem zemin, turuncu düğmeler, sarı vurgular ve yerel Outfit fontları tüm ekranlarda ortaktır.

## Çalışan özellikler

**0.1.1 güvenlik hazırlığı:** Bağımlılık korumaları, anahtar taraması, yayın öncesi güvenlik kapısı ve native oturum/yedek ayarları eklendi. Güncel durum, canlıya uygulanması bekleyen sunucu değişiklikleri ve sınırlar [güvenlik sağlamlaştırması raporunda](docs/SECURITY-HARDENING.md). Aşağıdaki ilk APK 0.1.0 sürümüdür; yeni paket sonucu telefon rehberinde ayrıca belirtilir.

**11 Ekim Android deneme paketi hazır:** [Sofra Deneme APK indir](https://expo.dev/artifacts/eas/5W1xp8QlvpCFmYI1Twtjcfhswi_J6S693uQPcDUyKd0.apk) · sürüm 0.1.0, yaklaşık 199 MB. Ayrı kimlikli demo, 40 tarif ve çevrimdışı çekirdek içerir. 325 birim/SQL testi, 73 tarayıcı senaryosu ve GitHub kontrolleri geçti; fiziksel telefon kabulü bekler. iPhone imzası için Apple hesabını kullanıcı bağlayacak. [Telefon kurulum rehberi](docs/MOBILE-DELIVERY.md), [cihaz kabul formu](docs/DEVICE-ACCEPTANCE.md) ve [resmî market erişimi araştırması](docs/MARKET-INTEGRATION-RESEARCH.md).

**11 Ekim katalog genişlemesi:** 14 yeni Türkçe tarifle toplam 40 tarif; kahvaltı, fırın ve soğuk sofra seçkileri, özgün temsili görseller. Porsiyon ve stok hesabı, eski kayıtların korunması ve yerel veritabanı seed'i güncellendi. [Tarif listesi ve kapsam](docs/CATALOG-EXPANSION.md).

**11 Ekim alışveriş modu:** Haftalık veya kayıtlı listeden sade mağaza görünümü; kalan/tüm ürünler, Türkçe arama, ek ürünlerle birlikte ilerleme, kaynak yemek ve gramaj dökümü, güvenli son işareti geri alma. [Kullanım ve sınırlar](docs/SHOPPING-MODE.md).

**10 Ekim bağlantı güncellemesi:** Kullanıcının seçtiği **yemek** Supabase projesi kuruldu. Bu bilgisayardaki `.env.local` gerçek hesap modunu açar; kaynak paketi varsayılan olarak demo kalır. [Kurulum, doğrulamalar ve kalan adımlar](docs/YEMEK-CONNECTION.md).

**Hesap ekranları:** Doğrulama bağlantısını tekrar isteme, 60 saniyelik bekleme, e-posta adresini düzeltme ve geçersiz bağlantıdan dönüş eklendi. Alan adı/SMTP ve gerçek hesap denemesi kullanıcının tercihiyle en sona bırakıldı. [Hesap e-postaları](docs/ACCOUNT-EMAIL.md).

**Ortak haftayı güncelleme:** Aktarmadan önce ürün/öğün farklarını incele; aynı kalan ürünlerin ortak alındı işaretlerini ve ev halkının eklediklerini koru. Değişen liste veya kişisel plan yeniden karşılaştırma gerektirir. [Kullanım ve sınırlar](docs/HOUSEHOLD-PUBLICATION.md).

- Türkçe hane büyüklüğü, beslenme, bütçe, süre, istenmeyen malzeme ve mutfak ekipmanı tercihleri.
- 40 tarif (iki airfryer tarifi dahil), 43 temel malzeme, 38 yerel görsel, altı kategori, sekiz seçki, arama, favoriler ve koleksiyonlar.
- Porsiyonlu tarif, hazırlık/pişirme/bekleme süresi, püf noktaları, adımlı pişirme, sayaç, kişisel puan/not ve geçmiş.
- Haftalık öğle/akşam planı; öneriyi değiştirip onaylama; mevcut öğünleri koruma.
- g/kg birleştirme, porsiyonla ölçekleme, evdeki miktarı bir kez düşme, ek ürünler, tamamlandı işareti ve kayıtlı listeler.
- Kişisel tarif oluşturma, kopyalama/düzenleme, kullanılmayan tarifi onayla silme; kontrollü metinden tarif aktarımı.
- Kişisel malzeme sözlüğü, isim/kategori doğrulaması, stok/arama/liste hesabına katılım, kullanılan malzemeyi koruma.
- Tarif, haftalık menü ve alışveriş listesini metin olarak paylaşma. Canlı ortak düzenleme değildir.
- Ortak hane: yerel iki rol denemesi; tek kullanımlık davet, yönetici/düzenleyen/görüntüleyen, üye çıkarma/ayrılma/devir. Açıkça paylaşılan menü ve ortak liste, sürüm çakışması denetimi. Gerçek Supabase bağlantısı varsayılan kapalıdır.
- Misafir ve demo hesap; giriş/kayıt/doğrulama/şifre yenileme/profil/çıkış/silme ekranları. Demo şifreleri saklanmaz veya doğrulanmaz.
- Tarihli JSON yedeği indirme/native dosya paylaşımı, dosyadan doğrulamalı geri yükleme, içerik karşılaştırması ve önceki kopyayı geri alma. İlk açılıştan yedeğe dönüş; eski metin yedekleri desteklenir. [Dosya taşıma rehberi](docs/BACKUP-FILES.md).
- Supabase e-posta Auth ve revizyon kontrollü snapshot eşitleme; yemek projesi kuruldu, canlı API/SQL kontrolleri geçti. Gerçek kullanıcı ve cihaz kabul testi bekler.
- iOS/Android yerel haftalık hatırlatma: kullanıcı izni, cihazdaki gerçek planı sorgulama ve hesap değişiminde iptal. Fiziksel cihaz kabul testi bekler; web yalnızca tercihi saklar.
- Haftalık TL hedefi, ek ürünlere pay ayırma, kullanıcının girdiği paket fiyatlarıyla tahmin ve harcama günlüğü. Eksik fiyat ücretsiz sayılmaz; gerçek market fiyatı getirilmez.
- Bütçeye göre menü önizlemesi, belirli Türkçe kalıpları anlayan yerel menü asistanı, öner/önerme tercihleri ve üç kontrollü malzeme alternatifi.
- Haftalık toplu hazırlık listesi, düzenli alınan ürün şablonları, stok tarih notları, alışverişten pişirmeye geçiş ve market sepetine hazırlık.
- Kaldığın pişirme adımı ve sayacı yeniden açınca sürdürme; telefonda pişirme sırasında ekranı açık tutma. Arka plan alarmı yoktur.
- Kaynak/tarih ile kişisel besin notu, kullanıcıya ait HTTPS video bağlantısını oynatma, tarif/menü/listeyi yazdırma veya işletim sisteminin PDF seçeneğiyle kaydetme.
- Google/Apple PKCE giriş kodu; izinli arkadaşlık, özel/açık profil, tarif paylaşımı, engelleme ve raporlama için Supabase modülü. Gerçek servis kurulumu ve kabul testi bekler; demoda sahte kullanıcı üretilmez.
- Galeriden kişisel yemek fotoğrafı ekleme/kaldırma; küçük JPEG kopyasının çevrimdışı kayıt ve yedekle taşınması.
- Kaynaklı Recipe JSON/JSON-LD aktarımı, birden çok tarif arasından seçim ve gramaj onayı. URL'den aktarım için Auth/kota/izinli kaynak kontrolü olan Supabase Edge Function kodu hazır; canlı kurulum bekler.

## Çalıştırma

Node.js 22.13+ ve npm gerekir; geliştirme/doğrulama Windows üzerinde Node 24.13.0 ile yapıldı.

```bash
git clone https://github.com/ahyazgan/Yemek-.git
cd Yemek-
npm ci
npm run web
```

Proje klasörü zaten açıksa ilk iki satırı atla. Kaynak ZIP kullanıyorsan içindeki `sofra` klasöründe çalıştır. Web geliştirme önizlemesi genellikle [localhost:8081](http://127.0.0.1:8081/) adresinde açılır. Dış hesap gerektirmez. Gerçek hesap için `.env.example` ve kurulum rehberini kullan; demo modunda gerçek şifreni girme.

GitHub deposunda gerçek ortam dosyaları, yerel servis denetim çıktıları, `node_modules`, geçici dosyalar ve derlenmiş paketler bulunmaz. `.env.example` boş bağlantı alanlarıyla demo başlangıcını gösterir. Ürün adı henüz kesinleşmedi; depo adı `Yemek-`, uygulamadaki Sofra adı geçicidir.

```bash
npm start        # Expo geliştirme sunucusu
npm run android  # Android emülatöründe
npm run ios      # macOS iOS simülatöründe
npm run verify   # TypeScript, lint, birim/SQL testleri ve içerik kontrolü
npm run export   # web + iOS/Android JS/Hermes paketleri
npm run export:demo # demo tarayıcı test paketi (work/demo-web)
npm run preview  # dışa aktarılmış web paketini 127.0.0.1:8181 üzerinde aç
npm run test:e2e # export:demo paketinde tarayıcı senaryoları
npm run test:connected # dist üzerinde gerçek hesap bağlantısı kontrolleri
npm run test:auth # e-posta göndermeden, taklit Auth yanıtlarıyla hesap ekranları
npm run backend:check # yapılandırılmış projede erişim kontrolleri
```

İlk Playwright kurulumu için `npx playwright install chromium`. Statik önizleme 8181, test sunucusu 8182 kullanır; testler açık önizlemeyi devralmaz. `SOFRA_PREVIEW_PORT` ve `SOFRA_TEST_PORT` ayrı ayrı değiştirilebilir. Başka bir uygulamanın kullandığı 8081 portunu kapatmak gerekmez; Expo geliştirme için `npm run web -- --port 8183` seçilebilir.

Expo Go temel geliştirme için kullanılabilir; özel URL scheme, SecureStore, bildirim ve native paylaşım kabul testlerini **preview build** üzerinde yap. JS/Hermes export imzalı APK/IPA değildir. Yerel uygulama kurulduktan sonra tarif/menü/liste çekirdeği çevrimdışı çalışır. Web PWA değildir; ağsız ilk açılış/yenileme vaat edilmez.

```bash
npm run build:android
npm run build:ios
```

Expo projesi `ahyazgan/sofra` hesabına bağlandı; demo kimliği `com.yazgan.sofra.preview`. Güncel paket sonucu ve komutlar [telefon rehberinde](docs/MOBILE-DELIVERY.md). Apple hesabı kullanıcı tarafından bağlanacak. `app.config.ts`, üretimde eksik ayarları, demo hesap modunu, yanlış dönüş şemasını ve sunucu gizli Supabase anahtarını reddeder. Gerçek telefon testi ve mağaza yayını ayrıca tamamlanır.

## İçerik ve mimari

`src/data/catalog.ts`, ayrıntı/ekipman verileri ve `src/data/stories.ts` düzenlenebilir katalog kaynaklarıdır. Kullanıcı düzenlemeleri cihaz/hesap durumunda saklanır; ortak kataloğa otomatik yayınlanmaz.

```bash
npm run content:check
npm run db:seed:generate
```

On bir Supabase/PostgreSQL migration, katalog seed'i, RLS, hesap silme ve tarif aktarım Edge Function kodu hazırdır. Kişisel menü/liste/bütçe/fotoğraf akışı kullanıcıya özel `app_snapshots` kopyasını eşitler; bu alanları normalize tablolara otomatik yazmaz. Topluluk, açık paylaşım işlemleriyle kendi RLS korumalı tablolarını kullanır.

`vendor/` klasörü ve içindeki yamalı decoder arşivi kuruluma dahildir; silme. Dependency override, lisans ve bakım notları güvenlik raporundadır.

## Henüz canlı olmayanlar

Ortak hane kurulumu, gerçek hesap/cihaz kabul tablosu ve mobil pilot profilleri: [HOUSEHOLD-PILOT.md](docs/HOUSEHOLD-PILOT.md). Mağaza açıklaması ve çekim taslağı: [STORE-DRAFT.md](docs/STORE-DRAFT.md).

Statik Sofra önizlemesi artık **http://127.0.0.1:8181**, test sunucusu **8182** kullanır. 8081 başka bir uygulamaya ait olabilir; o süreç durdurulmaz. `SOFRA_PREVIEW_PORT` / `SOFRA_TEST_PORT` ile değiştirilebilir. Testler mevcut rastgele bir sunucuyu yeniden kullanmaz. Canlı web Auth dönüş temelini kullandığın gerçek adrese göre ayarla.

Tarayıcı depolaması port başına ayrıdır. Yeni 8181 adresinde onboarding yeniden görünebilir; eski 8081 deposu silinmedi veya otomatik taşınmadı. Eski Sofra oturumundan dışa aktarılmış bir yedeğin varsa yeni adreste Yedek ve geri yükleme üzerinden içeri alabilirsin.

Migros, Trendyol ve CarrefourSA bağlantıları yalnızca resmî siteleri açar. Otomatik sepet, gerçek fiyat/komisyon, teslimat, sipariş veya ödeme yoktur. Adaptörlerin etkinleşmesi izinli resmî API ve ayrıca sağlayıcı uygulaması gerektirir.

Ortak hane, Google/Apple giriş kodu, topluluk ve URL tarif aktarımı yapılandırma/kabul testini bekler; Apple için hesap silmede sağlayıcı yetki iptali ayrıca tamamlanmalıdır. Uzaktan push, büyük fotoğraf/video dosyası Storage yükleme, fotoğraftan yazı okuma (OCR), ücretli üyelik, kampanya/sadakat ve analitik uygulanmış değildir. Küçük kişisel fotoğraf çevrimdışı çalışır. Jowzi benzeri genel amaçlı AI asistanı yoktur; yerel menü asistanı sınırlı kalıplarla çalışır.

Bu teslim Jow'un tüm özellikleriyle eşdeğer değildir. Doğrulanan kapsam ve kalan işler tek belgede tutulur: [Jow özellik karşılaştırması](docs/JOW-COVERAGE.md).

## Teslim belgeleri

- [Doğrulama ve açık sınırlar](docs/TEST-REPORT.md)
- [Senin kuracağın servisler](docs/SETUP-HANDOFF.md)
- [Canlı yayın kapıları ve sonraki işler](docs/RELEASE-GATES.md)
- [Güvenlik incelemesi](docs/SECURITY-REVIEW.md)
- [Mimari ve veri modeli](docs/ARCHITECTURE.md)
- [Ekipman, tarif aktarımı ve eşitleme](docs/EQUIPMENT-IMPORT-SYNC.md)
- [Paylaşım, içerik ve yerel hatırlatma](docs/SHARING-REMINDERS-CONTENT.md)
- [Tamamlama planı](docs/RELEASE-PLAN.md)
- [Jow özellik araştırması](docs/MOBILE-RESEARCH.md)
- [Jow kapsamı: çalışanlar, bağlantı bekleyenler ve eksikler](docs/JOW-COVERAGE.md)
- [Fotoğraf ve kaynaklı tarif aktarımı](docs/RECIPE-MEDIA-IMPORT.md)

Görsel kökeni/istemleri `docs/*image-provenance.json` dosyalarında; ekran görüntüleri `docs/screenshots/` altında. Fontun OFL lisansı `assets/fonts/` içindedir. Yemek görselleri AI ile üretilmiş temsili içeriktir; gerçek pişirme testi yapılmış olduğu iddia edilmez.
