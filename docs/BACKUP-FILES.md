# Dosyayla sofra taşıma

10 Ekim 2026 · Dış servis veya yeni SQL migration gerektirmez.

## Kullanım

1. İlk açılışta **Yedeğimden devam et** veya **Hesabım → Yedek ve geri yükleme** bölümünü aç.
2. **Yedek dosyasını kaydet**: webde tarihli `.json` indirmesi başlar. iPhone/Android'de sistem paylaşım menüsü açılır; kullanılabilen kayıt hedefini kullanıcı seçer. Menüyü kapatmak veya iptal etmek “dosya kaydedildi” olarak gösterilmez.
3. Yeni cihazda **Yedek dosyası seç** ile `.json` ya da eski bir `.txt` yedeğini seç. Tarif, planlı öğün, liste, stok, favori ve kişisel fotoğraf sayıları mevcut sofrayla yan yana görünür.
4. **Bu yedeği geri yükle** ile onayla. Kayıtlar birleştirilmez, seçili misafir/hesap sofrası değiştirilir. Başka hesapların cihaz kayıtları değişmez.
5. Gerekirse **Son geri alma kopyasını incele** ile önceki sofrayı aç. Bu kopyayı da dosya olarak kaydedebilir veya yeniden geri yükleyebilirsin. Geri alma alanı yalnızca son kopyayı saklar.

Dosyası olmayan eski kullanıcı için **Metinle aktarım seçenekleri** altında yapıştırma ve kopyalanabilir yedek devam eder. Yedek önizlemesinden sonra sofra değişmişse yeniden inceleme gerekir. Depolama hatasında önceki verinin üzerine sessizce yazılmaz.

## Dosya kapsamı

- Tarifler, kişisel küçük JPEG fotoğrafları, hane/beslenme tercihleri, menüler, stok, kayıtlı listeler, favoriler, koleksiyonlar, bütçe notları, pişirme geçmişi ve kişisel araç durumu.
- Yerel **demo** hane durumu varsa taşınır. Gerçek hane üyeliği ve ortak kayıtlar, arkadaşlar/topluluk gönderileri sunucuda kalır; kişisel yedekten yeniden kurulmaz.
- Şifre, erişim/yenileme tokenı, Supabase anahtarı ve eşitleme yetkisi dışa aktarılmaz. Yeni cihazda gerçek hesaba ayrıca giriş gerekir. Bildirim izni ve sistemdeki dosya konumları taşınmaz.
- Dosya şifresiz JSON'dur. Uygulama kendiliğinden bir servise yüklemez. İşletim sisteminin paylaşım menüsünde seçilen hedef kullanıcıya aittir. Otomatik kişisel bulut eşitlemesi zaten açıksa geri yüklenen durum olağan eşitlemeye katılır; bu uyarı onay ekranında görünür.

## Sınırlar ve yaşam döngüsü

Dosya okumadan önce boyut en fazla **15.000.000 UTF-8 baytı**, okuma sonrasında en fazla **5.000.000 UTF-16 kod birimi** olarak denetlenir. Eski metin sınırı korunur; Türkçe ve emoji baytları ayrıca hesaplanır. Boş dosya, yanlış uzantı, bozuk JSON, yanlış uygulama/sürüm ve geçersiz tarif ilişkileri reddedilir. UTF-8 BOM desteklenir. Dışa aktarım da aynı metin sınırını aşan bir dosya üretmez.

Webde geçici dosya seçici iptal/sayfadan ayrılma sonrasında temizlenir; geç gelen okuma sonucu kullanılmaz. İndirme nesne URL'si bir dakika sonra bırakılır. Eski tarayıcılarda seçim iptali olayı gelmezse **Dosya seçimini iptal et** kullanılabilir.

Native seçici okumak için uygulamanın önbelleğine kopyalar; boyut kontrolü bu işletim sistemi kopyasından sonra, metin belleğe alınmadan önce yapılır. İşlem sonunda yalnızca `DocumentPicker` önbellek kopyası temizlenir, asıl dosyaya dokunulmaz. Dışa aktarım kopyası, Android alıcısının menü kapandıktan sonra da okuyabilmesi için hemen silinmez: çalışan uygulamada 15 dakika sonra temizlenir. Uygulama kapanırsa kalan, bir saatten eski dışa aktarımlar sonraki dışa aktarımda temizlenir; işletim sistemi de önbelleği boşaltabilir. Bu geçici alan kalıcı yedek değildir.

## Cihaz kabulü — bekliyor

- [ ] İmzalı Android preview: Dosyalar'dan seçme, iptal, JSON kaydetme hedefi, başka uygulamanın dosyayı okuyabilmesi, Türkçe/emoji ve fotoğrafla geri dönüş.
- [ ] İmzalı iPhone/iPad preview: Files seçimi, iPad paylaşım penceresi, Dosyalara Kaydet, iptal ve yeniden açma.
- [ ] Seçim sırasında hesap değişimi/uygulamanın arka plana alınması; yetersiz depolama ve dosya erişimi reddi.
- [ ] İki gerçek hesap/cihaz: doğru sofra, bulut eşitlemesi açık/kapalı, geri yükleme çakışması.

Web tarayıcı testleri ve taklit native sınır testleri fiziksel cihaz kabulünün yerini tutmaz. Yeni native paketlerden sonra EAS preview yeniden derlenmelidir. Native koda güncelleme yalnızca JS export ile uygulanamaz.

SDK 57 kaynakları: [DocumentPicker](https://docs.expo.dev/versions/v57.0.0/sdk/document-picker/), [FileSystem](https://docs.expo.dev/versions/v57.0.0/sdk/filesystem/), [Sharing](https://docs.expo.dev/versions/v57.0.0/sdk/sharing/).
