# Sofra teslim ve kapsam kaydı

11 Ekim 2026. Ürün adı henüz seçilmedi; Sofra geçici ad, çatı şirket Yazgan.

## Teslim kapsamı

Çalışan çevrimdışı/demo çekirdek ve kapsam genişletmesi teslim edilir. Jow karşılaştırmasının tek güncel listesi [JOW-COVERAGE.md](JOW-COVERAGE.md) dosyasındadır. Canlı servis ve fiziksel cihaz kabul testleri bekler; tüm Jow özellikleri veya mağaza yayını tamamlandı denmez.

## Tamamlanan işler

- [x] Onboarding, keşif, haftalık menü, gramaj birleştirme, stok düşümü, ek ürün ve kayıtlı listeler.
- [x] 40 Türkçe tarif, 38 temsili görsel, ayrıntılar, sekiz seçki, favoriler, koleksiyonlar ve pişirme modu.
- [x] Ekipman profili, kontrollü metinden aktarım ve kişisel malzeme sözlüğü.
- [x] Hesap ekranları, e-posta Auth adaptörü, yedek/geri yükleme/geri alma ve revizyon kontrollü bulut eşitleme kodu.
- [x] Porsiyonlu tarif, menü ve alışveriş paylaşımı; canlı ortak hane sınırının açıklanması.
- [x] Tarif kopyalama/düzenleme, güvenli silme ve katalog/seed doğrulama aracı.
- [x] Yerel haftalık hatırlatma denetleyicisi, native adaptör, web sınırı ve hesap değişimi koruması.
- [x] Küçük ekran/erişilebilir etiket/yerel görsel kontrolleri; içerik boyutu ölçümü ve cihaz QA kapıları.
- [x] Kapalı market adaptörleri ve resmî bağlantıların uçtan uca doğrulanması; izinli gerçek adaptör kabul sözleşmesi.
- [x] Production config denetimi, bağımlılık yamaları, temiz kurulum, güncel README/kurulum/test raporu ve kaynak paketi.

## Doğrulama

Güncel sayılar ve çalıştırma sınırları [TEST-REPORT.md](TEST-REPORT.md) dosyasındadır. İlk sürümdeki temiz kurulum/decoder kontrolü geçmiş doğrulamadır; eklenen native paketlerin imzalı cihaz kabulü ayrıca bekler.

## Kapsam genişlemesinde eklenenler

- [x] Haftalık TL bütçesi, fiyat notları, paket hesabı, harcama günlüğü ve bütçeli menü önizlemesi.
- [x] Sınırlı kalıplarla çalışan yerel menü asistanı; öner/önerme tercihleri; üç kontrollü tarif alternatifi.
- [x] Toplu hazırlık, tekrar kullanılabilir alışveriş şablonları, stok tarih notları ve pişirmeye geçiş.
- [x] Kayıtlı pişirme oturumu, native ekranı açık tutma, video URL oynatma, kaynaklı besin notu ve yazdırma.
- [x] İki airfryer tarifi; airfryer/multicooker ekipman modeli.
- [x] Google/Apple PKCE giriş kodu; bağlantı bekleyen Supabase arkadaşlık/profil/paylaşım/engelleme/raporlama modülü ve RLS testleri.
- [x] Yetkili market teklif eşleme ve sepet/teslimat/sipariş sözleşmesi; gerçek sağlayıcı kapalı.

## Sonraki çalışma kapısı

14 yeni tarif, üç yeni seçki ve 14 özgün temsili görsel eklendi. 26 tarifli kişisel kayıtlar 40'a yükselir; menü, stok, kişisel değişiklikler ve kayıtlı listeler korunur. Yerel seed güncellendi; uzak veritabanına bu aşamada yazılmadı. [Katalog genişlemesi](CATALOG-EXPANSION.md). Sırada kullanıcının hazırlayacağı gerçek telefonlarla kabul testleri, ardından resmî market API seçeneklerinin değerlendirilmesi var.

Mağazada alışveriş ekranı eklendi: haftalık/kayıtlı liste, kalan/tüm görünümü, ürün arama, gramajın kaynak yemeklerle açıklaması, ek ürünleri içeren ilerleme ve değişmiş ürüne uygulanmayan geri alma. Dış hizmet gerektirmez. [Alışveriş modu](SHOPPING-MODE.md).

Ortak haftayı yeniden aktarmada satır/öğün karşılaştırması, ortak işaret ve ek ürün koruması, değişen miktarı yeniden kontrol, eski önizlemeyi engelleme tamamlandı. [Ayrıntılar](HOUSEHOLD-PUBLICATION.md). Canlı hane bayrağı açılmadı; SMTP/gerçek hesap ve fiziksel cihaz kabulü kullanıcının tercihine göre sona bırakıldı.

Dosyayla yedek taşıma, ilk açılışta geri yükleme, içerik karşılaştırması ve iptal/hata kontrolleri eklendi. Dış servis kurulumu gerektirmez. [Yedek dosyası rehberi](BACKUP-FILES.md); yeni native dosya seçme/paylaşma paketleriyle imzalı cihaz kabulü bekler.

Ortak hane/davet/rol, paylaşılan hafta ve alışveriş, sürüm çakışması, Realtime/yenileme kodu ve yerel deneme eklendi. Mobil klavye yerleşimi, uzun düğme yazıları, tarih satırı ve bulunamayan sayfa dönüşü iyileştirildi. Gerçek hesaplı pilot ve iOS Simulator profilleri hazırdır. [Hane ve pilot rehberi](HOUSEHOLD-PILOT.md), [mağaza metni taslağı](STORE-DRAFT.md).

[RELEASE-GATES.md](RELEASE-GATES.md) ve [SETUP-HANDOFF.md](SETUP-HANDOFF.md): Supabase/SMTP/OAuth/topluluk kurulumu, gerçek hesap/cihaz testleri, nihai kimlikler ve EAS imzası, şirket/support metinleri; ardından izinli market sağlayıcısı. Büyük medya dosyası Storage yükleme, fotoğraftan yazı okuma (OCR), uzaktan push, ücretli üyelik ve ticaret ayrı geliştirmeler gerektirir. Anahtar eklemek tümünü kendiliğinden açmaz.

Bu kapsam genişlemesi mevcut proje üzerinde yapıldı. Eski kaynak arşivleri önceki teslimlerin kopyalarıdır; güncel dosyalar ve yeni kapsamlı kaynak arşivi kullanılmalıdır.

## Tarif defteri devam çalışması

- [x] Galeriden küçük kişisel fotoğraf seçme, JPEG küçültme, alan sınırı, kaldırma ve yedekle taşıma.
- [x] Recipe JSON/JSON-LD ayrıştırma, çoklu tarif seçimi, kaynak/yazar bilgisi ve gramaj kontrolü.
- [x] URL aktarım Edge Function kodu: Auth, kullanıcı kotası, tam origin izin listesi, yönlendirme/MIME/boyut/zaman aşımı denetimi.
- [ ] Gerçek Supabase/kaynak dağıtımı ve native galeri kabulü.
