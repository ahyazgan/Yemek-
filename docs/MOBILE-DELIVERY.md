# Telefon paketleri

11 Ekim 2026. Ürün adı hâlâ geçici **Sofra**; çatı şirket **Yazgan**.

Expo projesi: [ahyazgan/sofra](https://expo.dev/accounts/ahyazgan/projects/sofra). Proje kimliği herkese açık derleme metadatasıdır; şifre veya API anahtarı değildir.

Android imza anahtarı Expo hesabında oluşturuldu. İlk bulut denemesinde eksik optional peer bağımlılık kaydı düzeltildi; güncel APK derlemesi yeniden başlatıldı. Fiziksel telefon kabulü henüz yapılmadı.

## Sürümler

| Profil            | Kullanım                                    | Paket kimliği / mod                             |
| ----------------- | ------------------------------------------- | ----------------------------------------------- |
| preview           | Android APK, kayıtlı iPhone için iç dağıtım | `com.yazgan.sofra.preview`, Sofra Deneme, demo  |
| preview-simulator | macOS iOS simülatörü                        | Aynı demo; fiziksel iPhone'a kurulmaz           |
| preview-connected | Gerçek hesap kabulü                         | Sahibi tarafından girilen ayrı kimlik, Supabase |
| production        | Mağaza üretimi                              | Son marka/kimlik/bağlantı bilgileri zorunlu     |

Demo kimliği son marka kararı değildir. Canlı uygulamanın üzerine kurulmaz; ayrı depolama alanı kullanır. Kayıtları taşımak için uygulamanın doğrulamalı yedek aktarımı kullanılabilir.

## Tekrarlanabilir hazırlık

```bash
npm run verify
npm run release:check
npm run export:preview
npm run export:demo
npm run test:e2e
npm run build:android
```

`release:check` profil ve dosyaları yerelde doğrular; hesap yetkisi, kota ve imza sağlamaz. `export:preview` üç platformun JS/Hermes dosyalarını `work/preview-export` içine üretir; APK/IPA değildir. Kurulabilir paket EAS build sonucudur.

`EXPO_NO_DOTENV=1` ve `.easignore` ile yerel ortam dosyaları derlemeye taşınmaz. Demo export, bilgisayardan gelen tüm `EXPO_PUBLIC_*` alanlarını temizler ve demo ayarlarını uygular. Demo native yapılandırması gerçek bağlantı veya açık dış hizmet bayrağı görürse işlemi durdurur. EAS preview ortamına canlı anahtar eklenmemeli.

## iPhone

Kullanıcı aktif Apple Developer üyeliği olduğunu ve hesabı kendisinin bağlayacağını belirtti. Hesap parolası veya doğrulama kodu sohbete yazılmaz.

```bash
npx eas-cli@latest device:create
npm run build:ios
```

EAS'in açtığı akışta kendi Apple hesabıyla giriş yapılır, doğru takım ve test telefonu seçilir. İç dağıtımda telefona ait UDID imza profiline eklenmiş olmalı. Yeni telefon eklenince yeni paket veya yeniden imzalama gerekir. iOS simülatör çıktısı bunun yerine geçmez. [Expo iç dağıtım rehberi](https://docs.expo.dev/build/internal-distribution/).

## Gerçek hesaplı pilot

`preview-connected` artık hane/topluluk/Google/Apple/URL aktarımını kendiliğinden açmaz. Hane pilotu gerekince kendi açık bayrağıyla ayrı hazırlanır.

Son kimlik/name/scheme, EAS bağlantısı ve public Supabase ayarları EAS ortamında tanımlanır. Publishable anahtar istemci içindir; `service_role`/secret anahtar uygulamaya konmaz. Gerçek e-posta denemeleri kullanıcının kararıyla sona bırakılmıştır.

## Kurulumdan sonra

[Telefon kabul formu](DEVICE-ACCEPTANCE.md) her platformda doldurulur. Tarayıcı ve derleme testleri fiziksel cihaz testi olarak raporlanmaz. Mağaza gönderiminden önce [mağaza taslağı](STORE-DRAFT.md), destek/hesap silme sayfaları, son marka, gerçek gizlilik bilgisi ve cihaz sonuçları tamamlanır.

GitHub kontrolü her main güncellemesi/PR için tip kontrolü, lint, birim/SQL/içerik kontrolleri, demo export ve tarayıcı senaryolarını çalıştırır. Bu iş akışı otomatik mağaza yayını veya ücretli EAS derlemesi başlatmaz.
