# App Store ve Google Play bağlantısı

11 Ekim 2026. Bu rehber hesap erişimi, Expo imzası ve mağaza gönderiminin ayrı adımlarını gösterir. Bir tarayıcıda oturum açılması Expo'ya API anahtarı veya uygulama gönderme yetkisi kazandırmaz.

## Hazır ayarlar

`eas.json` içindeki `production` profili mağaza dağıtımı ve Android AAB çıktısı için açıkça yapılandırıldı. `submit.store-test` profili Android'de `internal` kanalına `draft` durumunda gönderir; incelemeye otomatik göndermez. iOS gönderimi App Store Connect/TestFlight içindir; App Review ve mağazada yayımlama ayrıca yapılır. Otomatik gönderim iş akışı yoktur.

Mevcut 0.1.1 APK doğrudan telefona kurulan bir demo paketidir; Play Store'a gönderilecek AAB veya TestFlight IPA yerine geçmez. Mevcut güvenlik kapısı ve nihai uygulama ayarı denetimleri korunur. Açık yüksek/kritik bağımlılık uyarıları sürerken üretim derlemesi durur.

## Hesap girişleri

- [Apple Developer](https://developer.apple.com/account/): üyelik ve doğru takım kontrol edilir. Ardından paneldeki Apps bağlantısıyla [App Store Connect](https://appstoreconnect.apple.com/apps) açılır.
- [Google Play Console](https://play.google.com/console/): doğru geliştirici hesabı seçilir. Hesabın kişisel/kuruluş kaydı, şirket marka adından ayrı bir bilgidir; mevcut kayıt kendiliğinden kuruluşa çevrilmez.

Parola, iki aşamalı doğrulama kodu, Apple `.p8` dosyası veya Google hizmet hesabı JSON'u sohbete ya da GitHub'a konmaz. Hesap sahibinin tarayıcı oturumu, EAS CLI oturumu ve mağaza servis anahtarları birbirinden ayrıdır.

## Uygulama kayıtlarını oluşturma

Önce mağazada kullanılacak kalıcı paket kimliği kararlaştırılır. Mevcut `com.yazgan.sofra.preview` yalnızca demo kimliğidir. Ürün adı geçici olduğundan kalıcı paket kimliği, Apple takım kimliği ve mağaza uygulama numarası örnek değerlerle doldurulmaz.

1. Android için son paket adı, iOS için Bundle ID ve bağlantı şeması belirlenir. `SOFRA_APP_NAME`, `SOFRA_APP_ID`, `SOFRA_APP_SCHEME` ve üretim bağlantıları EAS ortamında tamamlanır.
2. Apple Developer'da doğru takım altında Bundle ID, App Store Connect'te buna bağlı uygulama kaydı oluşturulur. Sonuçtaki sayısal Apple ID, `submit.store-test.ios.ascAppId` alanına girilir; bu değer Apple hesabının e-postası veya Team ID değildir. Team ID gerekiyorsa `appleTeamId` kullanılır.
3. Google Play'de Türkçe uygulama kaydı oluşturulur. Sözleşme, veri beyanları, ücretlendirme ve hesap sahibine ait beyanlar gerçek bilgilerle tamamlanır.
4. Apple imza/provisioning ve gönderim anahtarı; Google yükleme imzası ve hizmet hesabı EAS üzerinden bağlanır. Yetkiler hedef uygulama ve gereken gönderim kapsamıyla sınırlandırılır. İşlev görmesi için tüm hesaba yönetici yetkisi vermek varsayılmaz.

## Expo'ya bağlama ve gönderim

Nihai ayarlar hazır olduğunda kullanıcı kendi hesabıyla etkileşimli bağlantıyı tamamlar:

```bash
npx eas-cli@latest credentials --platform ios
npx eas-cli@latest credentials --platform android
```

Apple tarafında doğru takım ve production profili seçilir; App Store Connect API anahtarı mevcutsa kullanılır. Google hizmet hesabı, Play Console'daki hedef uygulamaya gerekli izinlerle eklenir ve EAS Credentials içindeki o uygulamanın gönderim anahtarına atanır. Anahtar dosyası indirilirse proje dışında tutulur; EAS'in güvenli yükleme ekranı kullanılır. Tarayıcı girişinin bu adımı otomatik tamamladığı varsayılmaz.

Yayın engelleri giderildikten ve uygun mağaza paketi üretildikten sonra, belirli bir derleme kimliğiyle gönderim yapılır. Aşağıdaki komutlar henüz çalıştırılmadı; örnek kimlik gerçek EAS build ID ile değiştirilir:

```bash
npx eas-cli@latest submit --platform android --profile store-test --id BUILD_ID
npx eas-cli@latest submit --platform ios --profile store-test --id BUILD_ID
```

Android gönderimi taslak kalır; test kullanıcıları için dağıtım Play Console'da ayrıca tamamlanır. iOS paketi işlendiğinde TestFlight'ta incelenir; mağazaya açık yayın başvurusu ayrı adımdır. İnceleme hesabı, destek/gizlilik adresleri ve cihaz testleri [yayın kapılarında](RELEASE-GATES.md) kayıtlıdır. Kaynaklardaki ilk gönderim şartları işlem tarihinde yeniden kontrol edilir; APK'nın dosya uzantısı değiştirilerek AAB elde edilmez.

## Resmî kaynaklar

- [Expo — Google Play gönderimi ve hizmet hesabı](https://docs.expo.dev/submit/android/)
- [Expo — App Store Connect/TestFlight gönderimi](https://docs.expo.dev/submit/ios/)
- [Expo — gönderim alanlarının referansı](https://docs.expo.dev/eas/json/)
