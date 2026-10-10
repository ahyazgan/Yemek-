# Ortak haftayı kayıp olmadan güncelleme

10 Ekim 2026. **Listem → Ortak liste → Kendi haftamı haneye aktar** üzerinden kullanılabilir. E-posta ve gerçek hesap kabulü kullanıcının isteğiyle sona bırakıldı; bu geliştirme yerel hane denemesi ve bağlantıya hazır hane kodunu kapsar. Canlı hane bayrağı açılmadı, Supabase ayarı veya şema değiştirilmedi.

## Yeni davranış

Eskiden haftayı yeniden aktarmak, ortak listenin tamamını kişisel kopyayla değiştiriyordu. Ev halkının eklediği ürünler ve aldığı ürünlere koyduğu işaretler kaybolabiliyordu.

Şimdi onaydan önce yeni/değişen/çıkarılan ürün ve öğün sayıları görünür. **Değişiklikleri göster** satırların eski/yeni miktarlarını ve çıkarılan ürünlerin önceki alındı durumunu açar. İptal ortak kaydı değiştirmez.

- Aynı ürünün miktarı ve birimi değişmediyse ortak alındı işareti korunur. Kişisel listedeki farklı işaret ortak işareti ezmez.
- Miktar veya birim değiştiyse alındı işareti kaldırılır; ekranda yeniden kontrol edilmesi gerektiği belirtilir.
- **Ortak ek ürünleri koru** başlangıçta açıktır. Ev halkının elle eklediği satırlar miktarı, birimi ve işaretiyle korunur. Kapatılırsa bu satırlar çıkarılacaklar listesinde görünür; silme ancak aktarım onayıyla olur.
- Aynı adlı birden fazla satır güvenle eşleştirilemiyorsa işaret taşınmaz; eski/yeni satırlar ve belirsizlik gösterilir. Farklı birimler veya elle eklenen ürün ile tarif malzemesi tahminle birleştirilmez.
- Önizleme sırasında ortak liste değişirse onay kapanır. **Karşılaştırmayı yenile** ile yeni sürüm incelenir. Kişisel menü/alışveriş değişikliği de eski önizlemeyi geçersiz kılar. Fotoğraf, favori veya özel not değişikliği aktarılacak içeriği etkilemez.
- Birleşen liste 200 ürünü aşarsa önizleme gösterilir fakat kaydetme kapalıdır. Ek ürün korumasını kapatma veya kişisel planı azaltma seçenekleri vardır.

## Veri ve eşitleme sınırları

Satır kimlikleri önceki sürümde `recipe-N` ve `extra-N` biçiminde sıra numarasıydı. Bu numaralar ürün kimliği sayılmaz. Karşılaştırma, aktarım türü ve Türkçe normalize edilmiş adın iki listede de tekil olmasına dayanır; miktar/birim ayrıca denetlenir. Bu bir market SKU eşlemesi değildir. Diğer kimliklerdeki ortak satırlar elle eklenenler olarak korunur. İlk/yeni aktarım satırının kişisel işareti görünür; belirsiz eşleşmelerde sıfırlanır.

Ortak kayıt önceki biçimini korur: `menu` ve `items`; ürün satırında yalnızca id/ad/miktar/birim/işaret. Özel tarif, fotoğraf, not, hesap ve bütçe eklenmez. Yeni migration veya eski yedeği dönüştürme gerekmez.

Kaydetme aynı hane, hafta ve sürüm üzerinde yapılır. Önizlemeden sonra sunucuda başka yazı oluşursa mevcut RPC eski sürümü reddeder. Çevrimdışı ortak yazı kuyruğu, otomatik tekrar veya alan bazında eşzamanlı birleştirme eklenmedi. Cihazlar arası ve yetki kaybı kabul testleri hâlâ gerçek hesap/cihaz aşamasındadır.

## Kontroller

11 yeni birim testi: değişen sıra numaraları, ortak işaret önceliği, miktar/birim, ek ürünler, açık çıkarma seçimi, belirsiz ad, Türkçe ad, öğün farkları, hane/hafta/sürüm, 200 ürün sınırı ve kişisel kaynak değişimi.

5 yeni tarayıcı senaryosu: yeniden aktarım/kalıcılık, stok sonrası miktar ve iptal, ortak kayıtta değişiklik, ek ürün çıkarma seçimi ve kişisel kaynak değişimi. 320 px taşma ve 390 px karşılaştırma görüntüsü denetlenir. Bunlar yerel rol denemesidir; ikinci gerçek telefonda eşitleme testi değildir.

```bash
npm run verify
npm run export:demo
npm run test:e2e -- household-publication.spec.ts household.spec.ts
npm run export
npm run preview
```

Görsel: `docs/screenshots/37-ortak-hafta-karsilastirma.png`. Güncel sonuçlar: [test raporu](TEST-REPORT.md).
