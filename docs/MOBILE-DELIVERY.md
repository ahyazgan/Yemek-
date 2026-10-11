# Telefon paketleri

11 Ekim 2026. Ürün adı hâlâ geçici **Sofra**; çatı şirket **Yazgan**.

Expo projesi: [ahyazgan/sofra](https://expo.dev/accounts/ahyazgan/projects/sofra). Proje kimliği herkese açık derleme metadatasıdır; şifre veya API anahtarı değildir.

**Güvenlik güncellemeli Android APK hazır.** Expo derlemesi 11 Ekim 2026, 03:17 (Türkiye) tarihinde `FINISHED` olarak tamamlandı. Sürüm `0.1.1`, Android sürüm kodu `3`, profil `preview`; indirme boyutu 198.769.857 bayt, yaklaşık 199 MB (190 MiB). Önceki paketle aynı Expo imza anahtarı kullanıldı. İndirme bağlantısı HTTP 200 ile doğrulandı; fiziksel telefon kabulü henüz yapılmadı.

## Android'e kurulum

1. Android telefonda [APK indir](https://expo.dev/artifacts/eas/SnJU8mpc3bZ7fy5XooWa1E8cF-5VLuxFjHZ_z80DLXE.apk) veya [Expo kurulum sayfasını](https://expo.dev/accounts/ahyazgan/projects/sofra/builds/e96b7d3b-bdcd-4343-b565-7aeee071e1b4) aç.
2. İndirilen APK'ya dokun. Android isterse bu indirmeyi açan tarayıcı/dosya uygulamasına uygulama yükleme izni ver ve kurulumu tamamla.
3. **Sofra Deneme** uygulamasını açıp hane tercihlerini seç. Gerçek hesap bilgisi gerekmez; demo hesap ekranları e-posta göndermez.
4. [Telefon kabul formundaki](DEVICE-ACCEPTANCE.md) çevrimdışı açılış, porsiyon/stok, paylaşım ve yedek adımlarını dene. Android paketi iPhone'a kurulmaz.

Bu iç dağıtım paketi mağazada yayımlanmış değildir. 40 tarif ve yerel görseller pakette bulunur; gerçek market sepeti, sipariş, fiyat veya canlı hesap bağlantısı açık değildir. Güncelleme aynı imzayla kurulmalı; kaldırma işlemi cihazdaki yerel kayıtları silebilir, önce uygulama içinden yedek alınır.

Derleme kimliği `e96b7d3b-bdcd-4343-b565-7aeee071e1b4`; kaynak commit'i `eddbab7`. Gradle `BUILD SUCCESSFUL in 13m 20s`. Bulut kurulumu ve prebuild sırasında beş bağımlılık yaması hash ile doğrulandı; post-install güvenlik kontrolü geçti. Aynı kaynak için GitHub kalite kontrolü ve CodeQL başarılıdır. npm audit uyarıları ve canlı sunucuya uygulanmayı bekleyen değişiklikler [güvenlik raporunda](SECURITY-HARDENING.md).

Önceki `0.1.0` / kod `1` paketi (`b11199c3`) bu güvenlik güncellemesini içermez. Yeni paketi mevcut uygulamayı kaldırmadan güncelleme olarak yükle; yerel yedek alıp [cihaz kabul formunu](DEVICE-ACCEPTANCE.md) uygula. Kod `2` ayrılan ilk 0.1.1 arşivleme girişimi, geçici klasör kaynak klasörün içinde olduğu için yüklemeden önce durdu; geçici klasör dışarı alınarak kod `3` ile başarılı paket üretildi. Önceki derleme sorunları [test raporunda](TEST-REPORT.md) kayıtlıdır.

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

`release:check` profil ve dosyaları yerelde doğrular; uygulama kaynakları, görseller, vendor ve ortak tarif ayrıştırıcısı yanlışlıkla arşivden dışlanırsa işlemi durdurur. Git gerekir. Hesap yetkisi, kota ve imza sağlamaz. `export:preview` üç platformun JS/Hermes dosyalarını `work/preview-export` içine üretir; APK/IPA değildir. Kurulabilir paket EAS build sonucudur. Yeniden üretilebilir bu export klasörü disk alanı için sonradan temizlenebilir.

`EXPO_NO_DOTENV=1` ve `.easignore` ile yerel ortam dosyaları derlemeye taşınmaz. Demo export ve `build:android/ios/simulator` komutları, bilgisayardan gelen tüm `EXPO_PUBLIC_*` alanlarını temizler ve demo ayarlarını uygular. Demo native yapılandırması gerçek bağlantı veya açık dış hizmet bayrağı görürse işlemi durdurur. EAS preview ortamına canlı anahtar eklenmemeli. Paylaşılan `supabase/functions/_shared` ayrıştırıcısı paket içinde tutulur; `.git`, gerçek ortam, yerel günlük ve imza dosyaları arşivden çıkarılır.

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

GitHub kontrolü kod içeren main güncellemesi/PR için tip kontrolü, lint, birim/SQL/içerik kontrolleri, demo export ve tarayıcı senaryolarını çalıştırır. Yalnızca belge değişiklikleri tekrar test başlatmaz. Bu iş akışı otomatik mağaza yayını veya ücretli EAS derlemesi başlatmaz.
