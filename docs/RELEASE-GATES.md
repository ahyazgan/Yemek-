# İlk sürümden canlı yayına

Kod teslimi, çalışan çevrimdışı/demo ürün ve bağlantıya hazır e-posta hesabı/snapshot eşitlemesini kapsar. Mağazaya yayımlanmış canlı uygulama değildir.

**Bağlantı durumu güncellendi:** yemek projesinde veritabanı, katalog, Auth dönüş adresleri ve hesap silme sunucusu kuruldu. Canlı API/SQL kontrolleri geçti. SMTP teslimi, gerçek kullanıcı oturumu ve fiziksel cihaz kabulü hâlâ bekliyor. [Kurulum kaydı](YEMEK-CONNECTION.md).

**0.1.1 güvenlik sınırı:** Yeni yetki kısıtlama migration'ı ve ek oturum kontrolü içeren hesap silme sunucusu henüz canlıya uygulanmadı; somut kapsam için kullanıcı onayı bekleniyor. npm audit'teki 18 yüksek uyarı iki temel açıktan kaynaklanır; test edilmiş yerel koruma demo/CI içindir ve 25 Ekim 2026'da yeniden inceleme gerektirir. Yüksek/kritik uyarı varsa üretim derlemesi engellenir. [Güncel güvenlik raporu](SECURITY-HARDENING.md).

## Senin hesabında kurulacaklar

1. **Supabase:** yemek projesi, 11 migration, public anahtar, redirect adresleri ve delete-account kurulmuş durumda. Yerel seed 40, uzak katalog 26 tarif; bu aşamada uzak kataloğa yazılmadı. SMTP ve gerçek iki hesap/iki cihaz kabul testleri kullanıcının seçimiyle sona bırakıldı. Topluluk için üç hesapla görünürlük/engelleme testi gerekir.
2. **Mobil dağıtım:** EAS projesi bağlandı, demo kimliği ayrıldı. Güncel paket sonucu [telefon rehberinde](MOBILE-DELIVERY.md). Son marka, üretim kimliği, Apple/Google hesapları ve fiziksel kabul yayından önce tamamlanır. Kullanıcı Apple Developer hesabını kendisi bağlayacak.
3. **Şirket bilgileri:** destek adresi, yayımlanacak gizlilik/kullanım metinleri, hesap silme başvuru sayfası ve mağaza açıklamaları.
4. **Marketler:** izinli tüketici sepeti API sözleşmesi ve test ortamı. API bilgileri geldikten sonra her marketin gerçek ürün eşleme/sepet adaptörü ayrıca uygulanıp doğrulanacak. Yalnızca anahtar eklemek sipariş özelliğini açmaz.

## Cihaz kabul listesi

Ortak hane için gerçek hesaplı profil ve üç hesap/iki cihaz kabul tablosu [HOUSEHOLD-PILOT.md](HOUSEHOLD-PILOT.md) dosyasında. Genel telefon kabulü [DEVICE-ACCEPTANCE.md](DEVICE-ACCEPTANCE.md) ile kaydedilir. Mağaza açıklaması/çekim taslağı [STORE-DRAFT.md](STORE-DRAFT.md) dosyasında; mevcut tarayıcı ekranları mağaza kabulü sayılmaz.

- Android ve iPhone: ilk açılış, yeniden açma, klavye, geri hareketi, büyük yazı, ekran okuyucu, çevrimdışı tarif/menü/liste.
- SecureStore oturumu, e-posta doğrulaması, şifre yenileme ve uygulama bağlantıları.
- İki cihaz eşitlemesi: tek taraflı değişiklik, iki taraflı çakışma, onay sırasında yeni değişiklik, ağ kopması, hesap değiştirme.
- Yerel bildirim: izin ret/kabul, tek plan, saat/gün değişimi, kapatma, uygulama/telefon yeniden başlatma, hesap çıkışı.
- Native paylaşım, kullanıcının iptal etmesi, başka uygulamaya metin iletme.
- Yedek dosyası: Android/iPhone/iPad dosya seçimi ve kaydetme hedefi, iptal, Türkçe/fotoğraflı dosyanın başka cihazda geri yüklenmesi ve önbellek temizliği. [Dosya rehberi](BACKUP-FILES.md).
- Google/Apple tarayıcı oturumu, iptal, PKCE dönüşü; Apple yetki iptali geliştirmesi tamamlanmalı.
- Video yükleme/hata/duraklatma, yazdırma diyaloğu, ekranı açık tutma ve kayıtlı pişirme sayacını yeniden açma. Sayaç arka plan alarmı değildir.
- 38 görsel toplam 90,63 MiB. Paket indirme, bellek ve zayıf cihaz performansı ölçülmeli; thumbnail/sıkıştırma bu ölçüme göre uygulanmalı. Web ilk yükleme/ağsız yenileme destekleyen PWA değildir.
- Güncel bağımlılık denetimindeki kalan braces/node-forge bildirimleri yeniden değerlendirilmeli.

## Ayrı ürün geliştirmesi gerektirenler

Fotoğraftan yazı okuma (OCR), büyük fotoğraf/video dosyası Storage yükleme, uzaktan push, market fiyat/sepet/sipariş, ücretli üyelik, sadakat/davet ödülleri ve analiz servisi henüz uygulanmış değildir. Ortak hane/davet/liste, Google/Apple OAuth kodu, video URL oynatma ve Supabase topluluk modülü eklendi; gerçek servis kabulü bekler. Topluluk için moderatör ekranı ve rapor işleme süreci ayrıca tamamlanmalı. Tüm kapsam [Jow karşılaştırmasında](JOW-COVERAGE.md) tutulur.

Tarifler mutfakta denenmiş veya beslenme uzmanı onaylı olduğu iddiasını taşımaz. Tarif sınıfları yaklaşık beslenme tercihidir; gerçek ürün etiketlerinin yerini tutmaz. Besin bilgileri kaynaklı kullanıcı notlarıdır; otomatik doğrulanmış veri değildir. Pişirme adımı ve sayaç kayıtlı kalır; arka planda alarm çalmaz.

## Market adaptörü kabul sözleşmesi

Sunucu iş ortaklığı ve yetkiyi doğrulamalı; istemci bayrağı entegrasyonu açmamalı. Gerçek ürün kimliği/paket gramajı, stok ve konum, fiyatın zamanı, alternatif ürün onayı, sepetin yeniden hesaplanması ve resmî ödeme yönlendirmesi ayrı yanıtlar olmalı. Uygulama tahmini gramı kesin market fiyatı saymamalı. Tekrarlanan istek aynı sepeti oluşturmalı; iptal, zaman aşımı, yetki kaybı, stok yok ve eski fiyat senaryoları sınanmalı. Resmî sipariş onayı olmadan “sipariş verildi” durumu üretilemez. Market kimlik bilgileri ve tüketici oturumları sunucuda güvenli saklanmalı.

Tarif fotoğrafı galeri seçimi/yeniden açma/silme gerçek iPhone ve Android üzerinde doğrulanmalı. Bağlantıdan tarif aktarımı sunucu kodu hazırdır; 0009 migration, Edge Function, güvenilir kaynak izin listesi ve özel ağlara çıkış kısıtı kurulduktan sonra gerçek sayfalarda kabul testi gerekir. [Kurulum](RECIPE-MEDIA-IMPORT.md).
