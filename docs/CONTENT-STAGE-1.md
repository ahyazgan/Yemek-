# Aşama 1 — tarif içeriği ve keşif

10 Ekim 2026. Bu paket, onaylanan yolun ilk aşamasıdır: içerik → ekipman ve metinden aktarım → gerçek hesaplar/paylaşım → izinli market bağlantısı.

## Kullanıcıya görünen değişiklikler

Katalog 16'dan 24 tarife çıktı. Yayla çorbası, zeytinyağlı pırasa, patatesli bezelye, barbunya, fırın mücver, semizotu salatası, brokoli çorbası ve sütlü irmik eklendi. 43 malzemenin tamamı gramaj hesabına, stok düşümüne ve düzenleyiciye bağlıdır. Her tarifin yerel görseli vardır.

Tarif detayında hazırlık, pişirme, bekleme/soğuma ayrıdır. Sütlü irmik 20 dakika aktif süreç ve 120 dakika soğumayla toplam 140 dakika gösterir. Zorluk, tarif başına iki püf noktası ve servis önerisi eklenmiştir. Eşlikçi öneriler alışverişe kendiliğinden eklenmez. Kullanıcı miktar ve malzemeyi değiştirdiğinde bu metinleri de düzenleyebilir. Süreler temel porsiyon için yaklaşık değerlerdir; porsiyonla doğrusal çarpılmaz.

Ana sayfadaki Sofra fikirleri dört ayrı rehbere açılır. Her biri açıklama, hazırlık notları ve tercihleri sağlayan tariflerden oluşur. Profil/bütçe, süre ve hariç malzeme filtreleri boş sonuçta gevşetilmez. Ana katalogda kişiselleştirme kapatılsa bile bu seçkilerin sayacı ve detay sayfası aynı kişisel tercihleri uygular. Günlük öneri yerel tarihe göre döner; bulut veya yapay zekâ servisi kullanmaz. Benzer tarifler kategori ve ortak malzemelerle sıralanır; su/tuz/yağ/karabiber ortaklık puanına katılmaz.

Pişirme ekranı seçilmiş porsiyonu korur ve o porsiyona göre hesaplanmış malzemeleri açar. Planlama, satın alma veya stok tüketme işlemi başlatmaz. Tarif editörü yeni süre ve not alanlarını saklar; ayrıntılı bilgiyi kaldırmak mümkündür.

## Kayıt ve veri modeli

`Recipe.details` isteğe bağlıdır. Eksik alan eski kayıt; `null` ise kullanıcının ayrıntıları kaldırma kararıdır. Zod, negatif/kesirli süreleri, tutarsız toplamı ve aşırı uzun metinleri reddeder. Yeni PostgreSQL migration'ı aynı sayısal ve metin sınırlarını denetler; RLS kurallarını değiştirmez. Bulut yedeği tüm yerel durumu taşıdığı için ayrıntıları da içerir.

Güncelleme eski kayıtları silmez. Yeni kimlikler eklenir; mevcut tarifte süre, porsiyon, adımlar ve malzemeler katalogla eşleşiyorsa eksik notlar tamamlanır. Pişirme içeriği değiştirilmiş tariflere hazır tavsiyeler yakıştırılmaz. Kaydedilmiş listeler bağımsız kopya olmaya devam eder. SQL seed mevcut kimlikleri değiştirmez; uzaktaki mevcut tarifleri zenginleştirmek ayrı ve kontrollü bir veri yayını gerektirir.

## İçerik ve görsel kaynağı

Metinler Sofra için özgün olarak yazıldı; Jow tarifleri/görselleri kopyalanmadı. 8 yeni temsili görsel yerleşik image_gen ile üretildi ve `assets/recipes/` içine kopyalandı. [İstem seti ve tam kaynak/çıktı yolları](content-image-provenance.json). Görseller pişirilmiş üründen çekilmiş fotoğraf değildir; tarif ekranında temsilî olduğu belirtilir.

Tarifler henüz gerçek mutfakta editoryal olarak sınanmadı. Pişirme süreleri yaklaşık; beslenme etiketleri içerik sınıflandırmasıdır. Kalori, fiyat, tasarruf yüzdesi, canlı stok veya sipariş sonucu üretilmez. Video içerik eklenmedi. Görseller çevrimdışı çalışır; dağıtım boyutunu düşürmek için yayın öncesi görsel optimizasyonu açık konudur.

## Sonraki aşamalar

1. **Ekipman ve aktarım:** mutfak ekipmanı profili, tarif ekipman gereksinimleri ve filtreler; metni malzeme/adım taslağına ayıran, bilinmeyen malzeme ve birimleri kullanıcıya doğrulatan aktarım ekranı. Fotoğraf/bağlantı aktarımı varmış gibi sunulmayacak.
2. **Hesaplar ve paylaşım:** kullanıcı kendi Supabase projesini kurduktan sonra canlı kayıt/giriş/doğrulama, hesap silme ve yedek kabul testleri; ardından paylaşım izinleri ve topluluk moderasyonu. Mevcut demo hesabı gerçek kimlik doğrulaması değildir.
3. **Market:** resmî izinli erişim alındığında sunucu tarafında ürün eşleştirme, paket/gramaj, sepet hazırlama ve hata akışları. Supabase kurulması tek başına market siparişi sağlamaz.

## Çalıştırma ve doğrulama

Proje klasöründe `npm ci`, geliştirme için `npm run web`; üretim önizlemesi için `npm run export` ve `npm run preview`. Kontroller: `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e`. Son sonuçlar [test raporunda](TEST-REPORT.md). Web/iOS/Android JavaScript çıktısı üretmek, imzalı APK/IPA veya gerçek cihaz testi anlamına gelmez.
