# Senin kuracağın servisler — teslim rehberi

10 Ekim güncellemesi: Kullanıcının oluşturduğu **yemek** Supabase projesine şema, tarif kataloğu ve hesap silme işlevi kuruldu. Yerel bağlantı ve Auth dönüş adresleri hazır. Satın alma veya mağaza gönderimi yapılmadı. [Mevcut kurulum ve kalan işler](YEMEK-CONNECTION.md). Aşağıdaki ilk kurulum adımlarını yemek projesinde tekrar uygulama.

## 1. Önce mevcut demoyu dene

Son tercih: SMTP/alan adı ve gerçek hesap denemesi en sona bırakıldı. [Hesap e-postaları rehberi](ACCOUNT-EMAIL.md) yeni doğrulama/yenileme ekranlarını ve kalan kurulum sırasını açıklar.

```bash
npm ci
npm run web
```

Mutfağım → Giriş yap / hesap oluştur. Giriş ekranındaki **Örnek bilgileri doldur** düğmesi demo hesabı açar. Her geçerli e-posta ve 8+ karakterli şifre, yalnızca akış gösterimi olarak kabul edilir; şifreler doğrulanmaz veya saklanmaz. Gerçek şifreni kullanma. Bir cihazda tek demo hesabı vardır; farklı demo e-postaları ayrı kullanıcı verisi oluşturmaz. Misafir verileri demo hesabından ayrıdır.

Kayıt ekranında doğrulama adımını **Demo doğrulamasını tamamla** ile geç. Şifre yenilemede **Demo şifre yenileme ekranını aç** kullan. Bunlar e-posta göndermez.

## 2. Supabase projesi ve SQL

Yeni telefona geçişte veya misafirden hesaba taşıma için dosyayla yedekleme ayrıca hazırdır; dış servis anahtarı gerektirmez. [Yedek taşıma adımları](BACKUP-FILES.md). Gerçek ortak hane/topluluk kayıtları kişisel yedekte bulunmaz.

Ayrı bir geliştirme projesi oluştur. SQL Editor üzerinden sırayla:

1. `supabase/migrations/20261010185730_sofra_0001_initial.sql`
2. `supabase/migrations/20261010185736_sofra_0002_mobile_features.sql`
3. `supabase/migrations/20261010185740_sofra_0003_discovery_collections.sql`
4. `supabase/migrations/20261010185743_sofra_0004_recipe_details.sql`
5. `supabase/migrations/20261010185750_sofra_0005_equipment.sql`
6. `supabase/migrations/20261010185753_sofra_0006_snapshot_sync.sql`
7. `supabase/migrations/20261010185757_sofra_0007_companion.sql`
8. `supabase/migrations/20261010185808_sofra_0008_community.sql`
9. `supabase/migrations/20261010185812_sofra_0009_recipe_media_import.sql`
10. `supabase/migrations/20261010185826_sofra_0010_households.sql`
11. `supabase/migrations/20261010190315_close_internal_function_access.sql`
12. `supabase/seed.sql`

Daha önce uygulanmış migration'ları tekrar çalıştırma; eksik olanları numara sırasıyla uygula. Güncel seed, kategori, ayrıntı ve ekipman alanları kullandığı için 0007'den sonra çalıştırılmalı. Eski katalog zaten yüklüyse güncel seed yeni tarifleri ekler; mevcut kimlikler `on conflict do nothing` ile korunur. Bu nedenle mevcut sunucu tariflerinin ayrıntı alanları seed ile otomatik doldurulmaz. Yerel uygulama kataloğundaki güvenli zenginleştirme bundan ayrıdır. Tablolarda RLS açık kalmalı. Kullanıcılar başkasının yedeğini, favorisini, koleksiyonunu veya özel tarifini okuyamamalı. Koleksiyon üyeliklerindeki bileşik sahiplik anahtarı da test edilmeli.

Bulut eşitlemesi `app_snapshots` tam durum kopyası kullanır; normalize tablolara otomatik yazmaz. **Hesabım → Şimdi eşitle** veya açıkça etkinleştirilen otomatik eşitleme revizyon kontrolüyle çalışır. İki cihaz farklı değişiklik yaptıysa seçim gerekir; onay sırasında kopya tekrar değişirse yeniden inceleme istenir. Migration 0006 doğrudan snapshot yazma yetkisini kaldırır, güvenli RPC ekler; eski kör yedek istemcisi yeni şemaya yazamaz. Yeni istemci ve migration birlikte devreye alınmalı. Ayrıntılar: [Ekipman, aktarım ve eşitleme](EQUIPMENT-IMPORT-SYNC.md). Misafir yedeği hesaba elle taşınabilir, otomatik aktarım yoktur.

Resmî başlangıç: [Supabase React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native), [Expo Supabase rehberi](https://docs.expo.dev/guides/using-supabase/).

## 3. Ortam ayarları

`.env.example` dosyasını `.env.local` olarak kopyala. Geliştirme projenin **public/publishable** anahtarını kullan:

```text
EXPO_PUBLIC_AUTH_MODE=supabase
EXPO_PUBLIC_SUPABASE_URL=https://PROJE.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=PUBLIC_PUBLISHABLE_KEY
EXPO_PUBLIC_AUTH_REDIRECT_BASE=http://127.0.0.1:8081
```

Yukarıdaki değerler örnektir. Gerçek proje bilgilerini sen dolduracaksın. Service-role, veritabanı şifresi, SMTP parolası, Apple özel anahtarı veya market sırları **EXPO_PUBLIC_** değişkenlerine yazılmaz. Bu alanlar uygulama paketinde görünür.

Web yayında dönüş temeli gerçek HTTPS alan adın; native development/preview build'de `yazgan-sofra-demo://` olmalı. Aynı kaynak kodunun web ve native derlemeleri kendi dönüş temeliyle üretilir. Değişiklikten sonra geliştirme sunucusunu yeniden başlat; statik web paketini yeniden üret.

## 4. E-posta, doğrulama ve şifre yenileme

Supabase Auth'ta e-posta sağlayıcısını ve e-posta doğrulamayı etkinleştir; özel SMTP alan adını/göndericini ayarla. Kimlik doğrulama ve şifre yenileme e-postalarının gerçek teslimini kontrol et.

URL Configuration içinde kendi ortamına ait dönüş adreslerini ekle:

- `http://127.0.0.1:8081/auth/callback`
- `http://127.0.0.1:8081/reset-password`
- Canlı web alan adındaki aynı iki yol.
- `yazgan-sofra-demo://auth/callback`
- `yazgan-sofra-demo://reset-password`

Site URL canlı web alan adına ait olmalı. Uygulama PKCE kullanır; doğrulama bağlantısını kaydı başlattığın cihaz/tarayıcıda aç. Kod değiş tokuşu `AuthProvider.callback` üzerinden yapılır. Geçersiz/bitmiş bağlantı başarı sayılmaz. `SOFRA_APP_SCHEME` değişirse burada listelenen demo scheme yerine kendi scheme adreslerini kullan. Native özel scheme bağlantılarını Expo Go yerine development/preview build üzerinde test et. [Supabase mobil deep linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking), [şifre yenileme referansı](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail).

## 5. Hesap silme işlevi

`supabase/functions/delete-account/` hazırdır. Kendi projenin Supabase CLI bağlantısını kurduktan sonra:

```bash
supabase functions deploy delete-account
```

İşlevin ortamında Supabase'in sunucu URL'si ve **service-role** anahtarı bulunmalı; bu anahtarlar yalnızca sunucuda kalır. İşlev bearer token'ı Auth sunucusuyla doğrular ve sadece token sahibini siler. Gövdedeki başka kullanıcı kimliği dikkate alınmaz.

Yeni Supabase anahtar türü/gateway ayarına göre Edge Function JWT doğrulama politikasını resmî belgelerle kontrol et; uygulama tarafındaki RLS'yi gevşetme. Handler her durumda ayrıca `auth.getUser(token)` çağrısı yapar. Gerçek projede yetkisiz isteğin 401, eksik onayın 400, başarılı silmenin 200 döndüğünü doğrula.

Bu sürüm ayrı Storage nesnesi oluşturmaz; küçük tarif fotoğrafı kişisel snapshot ile taşınır. Apple OAuth kodu varsayılan kapalıdır. Apple'ı üretimde açmadan önce sağlayıcı token iptali eklenmelidir. Storage yükleme eklenirse nesneleri de temizlenmelidir. Hesap silinince ilişkili kişisel ve topluluk tabloları cascade ile temizlenir; telefon galerisindeki asıl görsel silinmez. Google Play için ayrıca halka açık bir hesap/veri silme talebi sayfası gerekir. [Supabase kullanıcı yönetimi](https://supabase.com/docs/guides/auth/managing-user-data)

## 6. Apple / Google ile giriş

Giriş akışı `src/integrations/social.ts`, `src/auth/oauth.ts` ve `AuthProvider` içinde uygulanmıştır. Native güvenli tarayıcı oturumu ve web yönlendirmesi Supabase OAuth kullanır; callback scheme/host/path doğrulanır, PKCE kodu tekilleştirilerek değiştirilir, iptal giriş başarısı sayılmaz. `services.ts` içindeki eski kapalı port aktif giriş yolu değildir.

Apple Developer/Google Cloud uygulamalarını ve Supabase Auth Providers ayarlarını oluştur. Sağlayıcı konsolundaki OAuth dönüşü Supabase'in gösterdiği sunucu callback adresidir; Supabase izinli dönüş listesinde ayrıca §4'teki Sofra adresleri yer alır. Sağlayıcı sırları uygulama ortamına yazılmaz.

```text
EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=true
EXPO_PUBLIC_APPLE_AUTH_ENABLED=false
```

Bayrakları yalnızca ilgili sağlayıcı kurulunca aç ve yeniden paketle. Native akış Expo Go'da kapalıdır; scheme içeren preview build gerekir. Gerçek hesaplarla giriş/iptal/bozuk dönüş/çıkış/silme henüz doğrulanmadı. Apple'ı açmadan önce hesap silmede sağlayıcı yetki iptalini tamamla. Hesap birleştirme ekranı uygulanmadı; aynı e-posta davranışı Supabase ayarlarıyla ayrıca doğrulanmalı.

## 7. Cihaz içi ve uzaktan bildirimler

Yerel haftalık menü hatırlatması artık Expo Notifications ile uygulanmıştır. APNs/FCM sunucusu, push tokenı veya Supabase gerekmez. Telefonda izin istenir, gerçek plan sorgulanır, kapatma ve hesap değişiminde iptal edilir. Buluttan gelen tercih yeni cihazda kendiliğinden etkinleşmez. Web yalnızca tercihi saklar. [Davranış ve test sınırları](SHARING-REMINDERS-CONTENT.md).

Yeni native paket nedeniyle preview build üret ve gerçek Android/iPhone üzerinde dene. Tam dakikada teslim garantisi verilmez; kesin alarm izni eklenmedi. Uzak push ayrı özelliktir: EAS proje kimliği, APNs/FCM kimlik bilgileri, token kaydı/yenilenmesi/silinmesi ve sunucu zamanlayıcısı ayrıca uygulanmalıdır. Mevcut kapalı NotificationAdapter bu uzak servis taslağıdır. [Expo SDK 57 bildirimler](https://docs.expo.dev/versions/v57.0.0/sdk/notifications/).

## 8. Market ve ödeme

Migros, CarrefourSA veya Trendyol'dan izinli tüketici sepeti erişimi/iş ortaklığı alınmalı. Satıcı paneli API'sini otomatik olarak tüketici alışveriş sepeti API'si sayma.

`src/integrations/markets.ts` kapalı adaptörleri tanımlar. Yeni `commerce.ts` teklif/konum/stok/fiyat zamanı/kampanya uygunluğu doğrulaması, paket toplamına göre eşleme ve sepet/teslimat/sipariş arayüzünü içerir. Gerçek sağlayıcı HTTP adaptörü henüz uygulanmadı. Resmî ürün kataloğu, konuma göre stok, ikame ürün ve ödeme yönlendirmesi sunucuda tamamlanacak. İstemcide izin bayrağı açmak yeterli değildir. Bütçe ekranındaki fiyatlar kullanıcının kendi notudur.

Ücretli dijital üyelik için ayrıca App Store/Google Play satın alma akışı ve sunucu entitlement doğrulaması gerekir. Bu sürümde ücretli plan veya sipariş alma yoktur.

## 9. Medya, ortak hane ve destek

Statik önizleme `npm run preview` ile 8181'de, test sunucusu 8182'de çalışır. Üstteki 8081 Auth örnekleri Expo geliştirme sunucusu içindir; gerçek hesaplı statik önizlemede dönüş temelini ve izinli callback/reset-password adreslerini 8181 olarak eşleştir.

- Video oynatma: tarif notlarından kullanıcıya ait doğrudan HTTPS video URL'si/kaynağı eklenebilir. Otomatik oynatılmaz; ağ hatası gösterilir, başka ekrana geçince duraklar. YouTube sayfası doğrudan video dosyası değildir. Hazır video kataloğu yoktur.
- Kişisel fotoğraf: galeri seçimi ve küçük JPEG kopyasını tarifle/yedekle saklama çalışır. Büyük fotoğraf/video dosyaları için Storage bucket, dosya tipi/boyut sınırları, sahiplik ve temizleme kodu ayrıca gerekir.
- Besin notu: kullanıcı porsiyon başına değerleri, kaynak ve tarihi girer; tarif içeriği değişirse eski not görünmez. Lisanslı besin veritabanı/otomatik hesap yoktur.
- Yazdırma: tarif/menü/liste paylaşım panelinden sistem yazdırma diyaloğu açılır. PDF kaydı işletim sisteminin sunduğu seçeneklere bağlıdır.
- Aile paylaşımı: yerel hane denemesi ve Supabase üyelik/davet/RLS/çakışma kontrollü ortak liste kodu hazır. 0010 migration ve gerçek hesaplı kabul gerekir; ayrıntılar HOUSEHOLD-PILOT.md dosyasında.
- Destek: gerçek destek adresini ve iletişim yolunu Yardım ekranına ekle.
- Hata raporlama/analitik: sağlayıcı seçilmedi; veri gönderilmez. Kişisel veri/token maskeleme ve izin politikasıyla eklenmeli.
- Gizlilik ve kullanım metinleri: uygulamadaki önizlemeyi şirket, amaç, saklama süreleri, başvuru adresleri ve kullanılan gerçek servislerle tamamla.

## 10. Mobil derleme ve mağaza pilotu

`eas.json` preview APK, preview-connected gerçek hesaplı pilot, preview-simulator ve production profillerini içerir. `app.config.ts` public derleme bilgilerini ortamdan alır: `SOFRA_APP_NAME`, `SOFRA_APP_ID` (paket/bundle), `SOFRA_APP_SCHEME`, `SOFRA_EAS_PROJECT_ID`. Son marka, benzersiz paket kimliği, EAS proje bağlantısı, imza ve mağaza hesaplarını kendi hesabında tanımla. Değerleri `.env.local` / EAS ortamına yaz; sırları sohbete yapıştırma. Production profilinde tüm bilgiler, Supabase modu ve native dönüş temelinin scheme ile eşleşmesi zorunludur. Development client istersen ayrıca `npx expo install expo-dev-client` gerekir; mevcut teslim profili preview'dur.

```bash
npx eas-cli@latest login
npx eas-cli@latest project:init
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
```

11 Ekim güncellemesi: Expo projesi bağlandı, ayrı Sofra Deneme kimliği ve güvenli demo profilleri eklendi. Güncel paket sonucu, komutlar ve Apple hesabını bağlama adımı [telefon rehberinde](MOBILE-DELIVERY.md). Yerel `.env.local` EAS'e yüklenmez; canlı ayarlar EAS ortamında tanımlanır. Hazır JS/Hermes export dosyaları uygulama mağazası paketi değildir. Önce [cihaz kabul formunu](DEVICE-ACCEPTANCE.md) tamamla. [Expo EAS yapılandırma](https://docs.expo.dev/build/eas-json/).

## 11. Arkadaş sofraları

0008 migration ve gerçek Supabase Auth gerekir. `EXPO_PUBLIC_COMMUNITY_ENABLED=true` yalnızca test projesinde başlayarak açılmalı. Profil başlangıçta özeldir; tam kullanıcı adını bilen oturum sahibi minimal profil kartını bulabilir. Özel tarif gönderileri yalnızca kabul edilmiş arkadaşlara görünür. Kullanıcı açık profili seçerse paylaştığı tarifler diğer oturum sahiplerine de görünür. Menü, alışveriş, bütçe ve özel notlar bu tablolara aktarılmaz.

Üç gerçek hesapla özel profil → istek → alıcı onayı → tarif görünürlüğü → engelleme ve iki yönde görünmezlik → kaldırma/silme akışını doğrula. Anonim erişim ve kendi isteğini onaylama reddedilmeli. SQL tarafı PGlite üzerinde testlidir; canlı PostgREST/Auth kabulü henüz yapılmadı.

Raporlar yalnızca yetkili sunucu/moderatör tarafından okunabilir; uygulamada rapor gönderme ve engelleme vardır. Moderatör ekranı, rapor işleme süreci ve operasyonel hız sınırları kurulmadan herkese açık yayına alma. İlk 50 paylaşım getirilir; sayfalama ve sosyal bildirimler ek geliştirmedir.

## 12. Tarif fotoğrafı ve bağlantıdan aktarım

Galeriden küçük fotoğraf seçme ve saklama servis gerektirmez; fotoğraf kişisel snapshot/yedekte taşınır, Storage bucket oluşturulmaz. Native galeri kabulü için yeni preview build gerekir.

Bağlantıdan aktarımın sunucu kodu `supabase/functions/import-recipe` altında, ortak ayrıştırıcı `_shared/recipePage.ts` içindedir. 0009 migration, Edge Function dağıtımı, güvenilir tam HTTPS kaynak origin listesi ve `EXPO_PUBLIC_RECIPE_IMPORT_ENABLED=true` gerekir. Auth, kullanıcı başına kota ve her yönlendirmede izin kontrolü vardır. Gerçek dış sayfa testi henüz yapılmadı. Tam sınırlar, ağ çıkışı gereksinimleri ve kurulum: [Fotoğraf ve aktarım rehberi](RECIPE-MEDIA-IMPORT.md).

## Canlı kabul senaryoları

- A hesabıyla kayıt → doğrulama → giriş → uygulamayı kapat/aç → aynı oturum.
- Şifre yenile → e-postayı aynı cihazda aç → yeni şifreyle tekrar giriş.
- A menüsü → çıkış → B girişi: A verisi görünmez.
- A bulut yedeği → ikinci cihaz A girişi → geri alma ve miktar doğrulaması.
- RLS: B hiçbir yolla A yedeğini okuyamaz/yazamaz.
- Hesap silme → Auth kullanıcısı ve kişisel kayıtlar gider → eski yenileme oturumu geçersiz olur.
- Yerel bildirim gerçek cihazda; uzak push/market/ödeme ayrıca geliştirilip ayrı uçtan uca testlerle doğrulanır.

Paketleme öncesi [yayın kapıları](RELEASE-GATES.md) ve [güvenlik raporu](SECURITY-REVIEW.md) kontrol edilmeli. Önizleme paketlerinin güncel durumu [telefon rehberinde](MOBILE-DELIVERY.md) tutulur.
