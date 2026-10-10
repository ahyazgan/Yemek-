# Paylaşım, kişisel içerik ve hatırlatmalar

10 Ekim 2026. Bu özellikler mevcut Sofra tasarımını ve hesap başına yerel veriyi kullanır.

## Kişisel malzemeler ve tarifler

Kullanıcı 43 ortak malzemeye ek olarak 300 kişisel malzeme oluşturabilir. Ad ve alışveriş kategorisi zorunludur. Türkçe büyük/küçük harf ve gereksiz boşluk farkları aynı malzemeyi çoğaltmaz. Çiğ/haşlanmış/süzülmüş gibi hazırlık durumu adında belirtilmelidir.

Yeni malzeme tarif editöründen, metin aktarımından ve mutfak stoğundan eklenebilir. Keşif araması, porsiyon hesabı, pişirme görünümü ve alışveriş birleştirmesi ortak sözlüğü kullanır. Ad değişince mevcut tarif ve stok aynı kimliği kullanır; kayıtlı alışveriş kopyasının eski adı korunur. Tarif, stok, tercih veya kayıtlı listede kullanılan malzeme silinemez.

Tarif detayında **Kendi kopyamı oluştur** düzenlenebilir özel tarif açar. Kullanılmayan özel tarif, Benim tariflerim ekranında açık onayla silinebilir; favori ve koleksiyon bağlantıları temizlenir. Menüde veya pişirme geçmişinde kullanılan tarif korunur. Ortak katalog tarifleri silinmez. Düzenlemeler kullanıcıya aittir; uygulama ortak kataloğa yayın yapmaz.

`npm run content:check` katalog şeması, ad/kimlik ilişkileri, süreler, ekipman, seçki referansları ve görsel dosyalarını kontrol eder. `npm run db:seed:generate` önce bu denetimi çalıştırır. Gerçek pişirme denemesi ve beslenme etiketlerinin editoryal kontrolü ayrıca gerekir.

## Tarif ve hane paylaşımı

- **Tarifi paylaş** seçili porsiyon için gramajları, süreyi ve adımları düz metin olarak hazırlar. Alıcı bu metni **Metinden tarif aktar** ile kontrol ederek kendi defterine ekleyebilir.
- **Ev halkıyla paylaş** seçili haftanın öğle/akşam menüsünü ve evdeki miktar düşülmüş alışverişi paylaşır. Ek ürünlerin adet/paket/ml gibi birimleri korunur.
- Gönderme kullanıcı tarafından telefonun paylaşım menüsünde yapılır; uygulama kendiliğinden mesaj göndermez. Webde metin seçilip kopyalanabilir.
- Paylaşılan metin anlık kopyadır; alıcının değişiklikleri geri eşitlenmez. Hesap şifresi, oturum bilgisi ve tüm mutfak stoğu paylaşılmaz.

Canlı hane üyeliği bu sürümün özelliği değildir. Sonraki aşamada ayrı hane, üye ve süreli/tek kullanımlık davet tablosu; sunucuda davet özeti, üyelik tabanlı RLS, davet iptali, haneden çıkma, sahip devri ve satır revizyonu gerekir. Kişisel snapshot'ın başka kullanıcıya açılması ortak hane çözümü sayılmaz. Mevcut kişisel RLS kuralları paylaşım için gevşetilmemelidir.

## Telefon içi hatırlatma

**Mutfağım → Hatırlatmalarım → Bu telefonda uygula**. Expo Notifications ile haftalık yerel bildirim planlanır. Gün 0 pazartesidir; Expo'nun pazar=1 düzenine çevrilir. Telefonun yerel saati kullanılır. İzin isteme yalnızca kullanıcı açık hatırlatmayı uygularsa olur; açılışta izin penceresi gösterilmez.

Cihazdaki gerçek plan ve izin durumu sorgulanır. Aynı ayarı kaydetmek ikinci hatırlatma yaratmaz. Kapatmak planı iptal eder. Hesap değişince önceki hesabın planı kaldırılır. İzin veya planlama sırasında hesap değişirse eski hesaba bildirim kurulmaz. Yedek/buluttan gelen tercih yeni cihazda kendiliğinden planlanmaz.

Android bildirim kanalı oluşturulur. Ek kesin alarm izni istenmez; SDK, kesin alarm izni yokken yaklaşık zamanlı alarm kullanabilir. Sessiz mod/pil kısıtları nedeniyle tam dakikada görünme garantisi verilmez. İzin reddi ve işletim sistemi hatası başarı sayılmaz. Bildirime dokunmak uygulama hazır olduktan sonra hatırlatma ekranını açar.

Webde yalnızca tercih kaydedilir ve bu açıkça yazılır. Uzak push, token kaydı, APNs/FCM sunucusu yoktur. Yerel bildirim bunları gerektirmez. Gerçek Android/iPhone'da izin, kapatma/açma, yeniden başlatma ve hesap değiştirme kabul testleri henüz yapılmadı.

Dayanak: [Expo SDK 57 Notifications](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).
