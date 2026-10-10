# Türkiye market bağlantıları — 11 Ekim 2026

Amaç: kullanıcının seçtiği tarifleri ve porsiyonları malzeme listesine çevirmek, resmî erişim sağlanınca bu listeyi seçtiği marketin gerçek ürünleriyle eşleştirip marketin ödeme ekranına aktarmak.

## Araştırma sonucu

| Market      | Resmî kaynakta görülen                                                                                                                                                                                                                                                                                                            | Bu uygulama için sonuç                                                                                                                                               |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Migros      | [Kurumsal iletişim/SSS](https://www.migroskurumsal.com/sikca-sorulan-sorular), Sanal Market ve Migros Hemen iletişim kanallarını açıklıyor.                                                                                                                                                                                       | Herkese açık, üçüncü taraf tüketici sepeti oluşturma yetkisi veren bir belge doğrulanamadı. E-ticaret/iş geliştirme ekibinden kapsam ve test erişimi istenmeli.      |
| Trendyol    | [Marketplace genel bakışı](https://developers.trendyol.com/tr/docs/getting-started) satıcıların ürün, stok, fiyat ve sipariş yönetimini tanımlıyor. [GO Market geliştirici portalı](https://developers.tgoapps.com/docs/category/7-uber-eats-trendyol-go---market-entegrasyonu) market şubelerinin sistem bağlantısını anlatıyor. | Bunlar tüketici adına alışveriş sepeti oluşturma hakkını kanıtlamıyor. Tarif uygulamasından sepet yönlendirmesi için ayrı iş ortaklığı ve izin kapsamı doğrulanmalı. |
| CarrefourSA | [İletişim sayfası](https://www.carrefoursa.com/iletisim) mevcut. [Mobile Commerce Webservices sayfası](https://www.carrefoursa.com/mobile/) genel Hybris bağlantıları içeriyor.                                                                                                                                                   | Teknik bir sayfanın herkese açık olması API kullanım izni veya üçüncü taraf sipariş programı değildir. Yetkili ekipten entegrasyon sözleşmesi ve doküman istenmeli.  |

Bu tablo API'lerin kesinlikle bulunmadığı iddiası değildir. Doğrulanabilen kamuya açık belgeler, Sofra'ya tüketici sepeti/sipariş erişimi verildiğini göstermiyor. Markalara mesaj gönderilmedi; hesap, sipariş veya ticari taahhüt oluşturulmadı. Komisyon oranı varsayılmadı.

## Görüşmede istenecek kapsam

1. Türkiye ve teslimat bölgesi bazında ürün kataloğu; GTIN/barkod, ürün kimliği, paket net gramajı, değişken ağırlıklı ürün kuralı.
2. Seçilen mağaza/adres için stok, fiyat, para birimi, verginin dahil olup olmadığı, zaman damgası ve teklif geçerliliği.
3. Tüketicinin açık onayıyla sepet oluşturma/güncelleme; desteklenen bağlantı veya resmî ödeme URL'si.
4. Kullanıcı yetkilendirme yöntemi, izin iptali, erişim süresi, minimum kişisel veri; uygulama market şifresi istememeli.
5. Teslimat/gel-al, minimum sepet, taşıma/hizmet ücreti, kampanya ve sadakat koşulları.
6. Alternatif ürün, stok değişimi, değişken ağırlık, iade/iptal ve resmî sipariş sonucu.
7. Test ortamı, test hesabı, hız sınırları, hata kodları, webhook imzası, idempotency ve destek sorumluluğu.
8. Ticari koşullar, yönlendirme/komisyon hakları, marka kullanım izni ve veri saklama sınırı.

## Kodun mevcut sınırı

- `src/integrations/markets.ts`: üç market, resmî site bağlantıları ve kapalı adaptörler.
- `src/integrations/commerce.ts`: ürün/paket gramajı, mağaza, süreli fiyat, stok, teklif, teslimat, ödeme ve sipariş arayüzü.
- Eşleştirme ortak malzemeyi alışveriş hesabından alır; paket adedini yukarı yuvarlar. Eşleşmeyen ürün kullanıcıya açıkça gösterilmeli; toplamdan sessizce çıkarılmamalı.
- Sunucu erişimi doğrulanmadan fiyat/sipariş metotları hata verir. Ortam değişkeniyle sahte market bağlantısı açılmaz.
- Ödeme yönlendirmesi HTTPS ve tam alan adı izin listesiyle doğrulanır. İzin listesi yalnızca sağlayıcının sözleşmedeki alanlarından oluşmalı.
- Mevcut testlerde yanlış market/mağaza, süresi dolmuş fiyat, yetersiz stok, paket hesabı, izin verilmeyen ödeme alan adı ve kapalı servisler sınanır.
- Resmî bilgiler gelince her marketin sunucu adaptörü ayrıca yazılıp test edilecek; yalnızca anahtar girmek yeterli değildir.

## İlk pilot akışı

Malzemeler → market/adres seçimi → gerçek ürün adayları → kullanıcının alternatif/paket onayı → güncel fiyat ve masraflarla son teklif → resmî ödeme yönlendirmesi.

Gönderimden önce teklif yeniden doğrulanır. İki dokunuş/yeniden deneme tek işlem anahtarı kullanır. Süresi dolan fiyat, iptal, ağ kesintisi, stok değişimi ve iznin kaldırılması ayrı kabul testleridir. Sağlayıcının doğrulanmış sonucundan önce “sipariş verildi” yazılmaz. Şimdiki sürüm yalnızca listeyi paylaşır ve resmî siteyi açar.
