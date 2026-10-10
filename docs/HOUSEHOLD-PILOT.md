# Ortak hane ve mobil pilot

10 Ekim 2026. Ortak hane kodu ve yerel denemesi tamamlandı. Bu belge canlı Supabase veya fiziksel telefon testinin yapılmış olduğu anlamına gelmez.

## Uygulamada dene

1. Listem → Ortak liste → Hanemi oluştur. Alternatif giriş: Mutfağım → Ev halkıyla paylaş → Ortak soframızı aç.
2. Kendi haftamı haneye aktar ile karşılaştırmayı aç. Yeni/değişen/çıkarılan satırları incele. Aynı ürünlerin ortak işaretleri ve varsayılan olarak ev halkının ek ürünleri korunur. Onaydan önce ortak liste değişmez. Fotoğraflar, özel notlar, hesap bilgileri, bütçe ve tüm stok envanteri aktarılmaz. [Karşılaştırma ve güncelleme kuralları](HOUSEHOLD-PUBLICATION.md).
3. Ev halkı → Düzenleyen/Görüntüleyen daveti → Davet kodu oluştur. Yerel denemede Davetli olarak dene düğmesiyle kabul ekranına geç. Bu, ikinci bir gerçek hesap değildir ve kimseye mesaj göndermez.
4. Daveti kontrol et, hane ve rolünü gör, açıkça kabul et. Düzenleyen üye ürün ekleyebilir, alınanı işaretleyebilir ve kaldırabilir. Görüntüleyen yalnızca okur.
5. Hane sahibi olarak dene ile aynı ortak listeyi kontrol et. Yönetici yetki değişimi, çıkarma, yöneticilik devri ve hane kapatma yapabilir. Ayrılma/çıkarma/devir/kapama onaylıdır.

Yerel deneme mevcut misafir/hesap deposunda kalır, yedekle taşınır. `DEMO-` kodları canlı sunucuda kabul edilmez. Gerçek hane verileri kişisel snapshot veya yedekle taşınmaz; Supabase tablolarındadır. Yerel denemeden canlı haneye otomatik geçiş yapılmaz.

## Paylaşımın sınırları

- Kişi başına tek hane, hane başına en fazla 12 üye, 104 haftalık kayıt. Haftada en fazla 14 öğün ve 200 ürün.
- Yönetici ve düzenleyen haftayı farkları inceleyip açık onayla yayımlar. Aynı ürün/miktarın ortak işareti ve seçime göre ortak ek ürünler korunur; miktarı/birimi değişen satır yeniden kontrol edilir. Önizleme sırasında ortak veya kişisel kaynak değişirse karşılaştırma yenilenir. Kişisel planın sonraki değişimleri otomatik yayımlanmaz.
- Ortak menü paylaşılan başlık/porsiyon planıdır; tüm tarif defteri veya tarif düzenleyicisi değildir. Üyeler farklı haftaları görebilir.
- Ürünler sayısal miktar ve g/ml/adet/paket birimiyle saklanır. Otomatik gram hesabı kişisel haftadan aktarılırken yapılır. Elle eklenen ürünlerin farklı birimleri tahminle birleştirilmez.
- Ortak listedeki işaretler kişisel alışveriş listesini değiştirmez. Kişisel kayıtları korumak için iki alan ayrı tutulur.
- Sunucu kaydı sürümle karşılaştırır. Başka biri değiştirdiyse eski yazı reddedilir, güncel liste yüklenir, kullanıcı işlemini yeniden değerlendirir. Sessizce üzerine yazma, otomatik tekrar veya çevrimdışı ortak yazı kuyruğu yoktur.
- RPC yanıtı alınamaması yazının kesin başarısız olduğu anlamına gelmez. Ekran bunu belirtir; Yenile ile son durum doğrulanır.

## Supabase kurulumu

1. Mevcut migration'lardan sonra `supabase/migrations/20261010185826_sofra_0010_households.sql` uygula. Sıfır kurulumda 0001–0010 sırasını kullan; seed'i ardından çalıştır.
2. Migration `shared_households`, `household_members`, `household_invites`, `household_boards` tablolarını ve `hh_*` RPC'lerini oluşturur. RLS açık, doğrudan istemci yazıları kapalıdır. Supabase Realtime publication varsa yalnızca hane olay tablosu eklenir.
3. Gerçek Supabase Auth ayarları tamamlanınca `EXPO_PUBLIC_HOUSEHOLD_ENABLED=true` ve `EXPO_PUBLIC_AUTH_MODE=supabase` ile yeniden paketle. Gerçek hesaba giriş yap.
4. Üç ayrı test hesabıyla aşağıdaki kabul tablosunu uygula. Yerel rol denemesi bu testin yerine geçmez.
5. Dashboard'da Realtime → Postgres Changes/publication içinde `shared_households` erişimini doğrula. Realtime olayı yalnızca yeniden okuma işaretidir; gelen olayı yetki kanıtı sayıp ekrana yazmayız. Her veri okuması sunucuda üyeliği tekrar denetler.

Canlı ekran odaktayken olay aboneliği, 20 saniyelik kontrol ve uygulama ön plana gelince yeniden okuma vardır. Abonelik veya ağ bozulduğunda otomatik kontrol/manuel Yenile kullanılabilir. Başarısız yetki/ağ kontrolünde ortak kayıt ekrandan kaldırılır. Ayrılmış/çıkarılmış üyeye yeni veri verilmez; daha önce gördüğü veya dışarı kopyaladığı bilgi geri alınamaz. Ortak kayıt için kalıcı cihaz önbelleği oluşturulmaz.

## Yetki ve davet

- Kod sunucuda rastgele UUID'den üretilir, veritabanında SHA-256 özeti bulunur. Ham kod sadece oluşturana bir kez döner. Kod tek kullanımlık ve 24 saat geçerlidir; yenileme/iptal/devir önceki daveti geçersiz kılar.
- Daveti kontrol etmek üyelik oluşturmaz; yalnızca hane adı, rol ve bitiş zamanı görünür. Kod sahibi gerçek hesapla açık kabul vermelidir. Kod bir erişim sırrıdır; herkese açık paylaşılmamalıdır.
- Üye, hesap kimliği taklidi yapamaz. RPC aktörü Auth kimliğiyle eşleşir. Hane kilidi üyelik değişimleriyle liste yazılarını sıralar; davet tüketimi ve tek hane kısıtı atomiktir.
- Yönetici ayrılmadan önce yöneticiliği devreder. Yönetici hesabını silmek haneyi ve bütün ortak kayıtları siler; hesap silme ekranında açıklanır. Yönetici devrederse eski hesabın silinmesi haneyi silmez.
- Hane kullanım yükü, kötüye kullanım gözlemi ve operasyonel istek sınırları pilotta ölçülmeli. Yerel SQL testleri üretim güvenlik denetimi değildir.

## Gerçek cihaz ve hesap kabulü

Her satırın sonucu henüz **BEKLİYOR**. Tarih, cihaz/OS, uygulama sürümü ve hata kaydıyla doldur.

| Senaryo                             | Beklenen sonuç                                                                                                           |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Android + iPhone, üç ayrı hesap     | A yönetici, B düzenleyen, C dışarıdaki kişi; yalnızca A/B haneyi görür                                                   |
| Davet                               | Önizleme üyelik oluşturmaz; kabul bir kez çalışır; iptal/süre/yenileme eskisini reddeder                                 |
| Yetki                               | Görüntüleyen yazamaz; düzenleyen davet veya rol yönetemez; yönetici devir yapabilir                                      |
| Eşzamanlı iki yazı                  | İlk kayıt korunur; eski sürümdeki ikinci yazı çakışma mesajı verir                                                       |
| Bağlantı kopması ve yeniden gelmesi | Başarısız ortak yazı onaylanmış görünmez; otomatik tekrar yok; Yenile son durumu getirir                                 |
| Çıkarma/ayrılma                     | Açık diğer cihazda erişim yeniden denetlendiğinde ortak veri kapanır; sunucu sonraki yazıyı reddeder                     |
| Hesap değişimi                      | Bekleyen eski hesap yanıtı yeni hesaba uygulanmaz; abonelik kapanır                                                      |
| Yönetici hesabını silme             | Devir yapılmadıysa ortak veriler cascade silinir; devir yapıldıysa yeni yöneticide kalır                                 |
| Auth                                | Kayıt, e-posta doğrulama, yanlış şifre, şifre yenileme, oturum süresi, çıkış, yeniden giriş                              |
| Klavye/geri                         | Alt form alanları ve kayıt düğmesi kullanılabilir; Android geri klavyeyi kapatır; iOS geri kaydırması doğru ekrana döner |
| Erişilebilirlik                     | Büyük yazı, VoiceOver/TalkBack, kutucuk checked/disabled duyuruları, dokunma hedefleri                                   |
| Galeri/bildirim/yerel kullanım      | Fotoğraf seçimi/iptali/izin reddi/HEIC, yerel hatırlatma ve uçak modunda kişisel tarif/menü/liste                        |

## Mobil paket profilleri

`eas.json`:

- `preview`: mevcut yerel demo, Android APK / iOS internal distribution.
- `preview-connected`: gerçek hesaplı pilot, Supabase açık; hane bayrağı varsayılan kapalı. Hane kabulü başlayınca profilin `env.EXPO_PUBLIC_HOUSEHOLD_ENABLED` değeri bilinçli olarak `true` yapılmalı. İsim, paket kimliği, scheme, EAS proje kimliği ve Supabase ortamı eksikse config durur. **Önce test projesini kur.**
- `preview-simulator`: yerel demo için iOS Simulator paketi; Mac üzerinde simülatör gerekir.
- `production`: mağaza dağıtımı; canlı kimlik kontrolleri korunur.

```bash
npm ci
npm run verify
npm run export
npm run test:e2e
npx expo-doctor
npx eas-cli@latest build --profile preview --platform android
npx eas-cli@latest build --profile preview --platform ios
# Supabase ve EAS test ortamı kurulduktan sonra:
npx eas-cli@latest build --profile preview-connected --platform android
npx eas-cli@latest build --profile preview-connected --platform ios
```

11 Ekim güncellemesi: EAS proje bağlantısı ve ayrı demo kimliği hazırlandı. Güncel build/kurulum sonucu [MOBILE-DELIVERY.md](MOBILE-DELIVERY.md) içinde. JS/Hermes export kurulabilir telefon paketi değildir. Son markayı ve üretim paket kimliğini kendi hesabında seç; mağaza yayını öncesi [yayın kapılarını](RELEASE-GATES.md) tamamla. Apple yetki iptali geliştirmesi tamamlanmadan Apple girişini açma.

Kaynaklar: [Supabase Postgres Changes](https://supabase.com/docs/guides/realtime/postgres-changes), [Expo SDK 57](https://docs.expo.dev/versions/v57.0.0/), [Expo EAS profilleri](https://docs.expo.dev/build/eas-json/), [internal distribution](https://docs.expo.dev/build/internal-distribution/), [React Native klavye yerleşimi](https://reactnative.dev/docs/keyboardavoidingview).
