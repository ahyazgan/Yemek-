# Mağazada alışveriş modu

11 Ekim 2026. Sofra geçici ürün adıdır; isim henüz seçilmedi.

## Kullanım

1. **Listem → Bu hafta → Alışverişe başla**. Seçili hafta ekrana taşınır ve sayfa yenilenince korunur.
2. Kayıtlı bir liste için **Listem → Kayıtlı → liste → Alışverişe başla**.
3. Varsayılan **Kalanlar** görünümünde ürüne dokununca alındı olarak işaretlenir ve kalanlardan çıkar. **Tümü** görünümünde işareti kaldırabilirsin.
4. Ürün adında arama yap. Türkçe karakter kullanmadan `sogan` veya `kagit havlu` da aranabilir. Arama ve görünüm filtresi toplam ilerlemeyi değiştirmez.
5. Tarif malzemesinde **Hangi yemekler için?** ile kaynak yemekleri, toplam gramajı, evden düşülen miktarı ve alınacak miktarı gör.
6. Yanlış dokunmada **Son işareti geri al** kullan. **Liste düzenlemeye dön** kaynak listeyi ve doğru haftayı açar.

Ek ürünler de ilerleme hesabındadır. Tarif seçmeden yalnızca ek ürünlerle kullanılabilir. Gram, mililitre, paket ve adet birbirine çevrilmez. Aynı adlı ek ürün ve tarif malzemesi ayrı kalır. Kategoriler mevcut malzeme sözlüğüne göre gruplanır; mağazanın gerçek reyon düzeni bilinmez.

## Kayıt ve geri alma

İşaretler mevcut haftalık `checked` kaydına, ek ürün alanına veya açılan kayıtlı listenin kendi kopyasına yazılır. Yeni kalıcı veri alanı veya veritabanı migration'ı yoktur. Mevcut yedek ve kişisel eşitleme bu kayıtları taşır. Kayıtlı liste işaretleri aktif haftayı değiştirmez.

Son işlem yalnızca açık ekranın belleğinde tutulur. Yeniden açıldığında işaretler kalır, geri alma geçmişi yeniden oluşturulmaz. Başka ekrana gidip geri gelince ekran belleği korunmuşsa son işlem gösterilebilir. Geri alma ürünün kimliği, miktarı, birimi, kaynak bilgisi ve mevcut işareti hâlâ eşleşiyorsa uygulanır. Sonradan değişmiş veya silinmiş ürün/listenin eski hâli geri getirilmez. Hesap geçişinde uygulama durumu ve ekran yeniden oluşturulur.

İşaretleme ve geri alma reducer içinde güncel kayıtla doğrulanır; aynı eski işlem ikinci kez gelirse işaret tekrar tersine çevrilmez. İlgisiz ürünlerin işaretlerine dokunulmaz. Depolama hatası mevcut uygulama geneli kayıt uyarısı ve yeniden deneme akışından görünür.

## Sınırlar

- Bu ekran kişisel haftalık/kayıtlı liste içindir. Ortak hanenin izin ve revizyon denetimli listesi kendi ekranında kalır.
- Alındı işareti kullanıcı beyanıdır; sipariş, ödeme, fiyat veya teslimat doğrulaması değildir. Market servisi çağrılmaz, stok otomatik artırılmaz.
- Kurulu mobil uygulamada yerel kayıtla çalışır. Tarayıcıda paket yüklendikten sonra ağ kapalıyken işaretleme sınanır; webde ağsız ilk açılış/yenileme garanti edilmez.
- iOS/Android fiziksel cihaz ve ekran okuyucu kabulü ayrıca bekler. Native paket veya dış hesap kurulumu gerektiren yeni bağımlılık eklenmedi.

## Kontroller

```bash
npm run verify
npm run export:demo
npm run test:e2e -- shopping-mode.spec.ts
npm run export
```

Windows sandbox ortamında Hermes geçici çıktı klasörüne yazamıyorsa, proje içinde `work/test-temp` klasörünü oluşturup aynı PowerShell oturumunda `$env:TEMP = Join-Path (Get-Location) 'work/test-temp'; $env:TMP = $env:TEMP` ayarla; ardından export'u yeniden çalıştır. Yerel tarayıcı testleri test sunucusuna erişebilen bir ortamda çalışmalıdır.

13 birim senaryosu: miktar/stok hesabı, ürün türlerini ayırma, Türkçe arama, tam listeye göre ilerleme, kaynak/hafta doğrulama, işlemin yinelenmesi, güvenli geri alma, kayıtlı kopya yalıtımı ve silinmiş kayıt.

7 tarayıcı senaryosu: giriş/çıkış, kalıcılık, kaynak yemek/gramaj, ek ürün ve çevrimdışı işaretleme, arama/boş/tamamlanmış durumlar, kayıtlı liste, stok değişince geri almayı kapatma, hafta devamlılığı, hatalı bağlantı, 320 px uzun adlar. Güncel sonuçlar [test raporunda](TEST-REPORT.md).
