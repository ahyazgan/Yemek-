# Bağımlılık ve veri güvenliği kontrolü

11 Ekim 2026 güncellemesi: [Güvenlik sağlamlaştırması](SECURITY-HARDENING.md) güncel durumdur. İki araç zinciri açığına hash doğrulamalı yerel koruma, CI güvenlik kapıları, native oturum/backup ayarı ve sunucu yetki/istek kontrolleri eklendi. npm audit uyarıları gizlenmedi; 18 yüksek bildirim sürüyor. Aşağıdaki 10 Ekim kaydı başlangıç incelemesini belgeler. Bu bir penetrasyon testi veya üretim güvenliği garantisi değildir.

## Bağımlılıklar

Başlangıçtaki npm audit sonucu: 29 bildirim. Düzeltme sonrası: **18 yüksek, 0 orta, 0 kritik**. Bu 18 satır, iki temel danışmanlığın üst bağımlılıklara yayılmasıdır. Ham sonuç: `dependency-audit.json`.

| Kaynak                      | Yapılan işlem / kalan durum                                                                                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| decode-uri-component ≤0.4.2 | Upstream 0.5.0 güvenlik çözümü alındı. query-string 7 CommonJS işlevi beklediği için yalnızca export biçimi uyarlandı. MIT lisansı ve kaynak kökeni `vendor/decode-uri-component/` altında. Yerel sürüm 0.5.0-sofra.1 olarak açıkça adlandırıldı. |
| uuid 7.0.3 → 11.1.1         | Yalnızca xcode bağımlılığı sabitlendi. xcode'un v4 çağrısı ve geçerli proje kimliği üretimi test edildi.                                                                                                                                          |
| braces 3.0.3                | Denetim tarihinde yamalı sürüm yayımlanmamış. Dosya eşleştirme/geliştirme araçları zincirinde kalıyor.                                                                                                                                            |
| node-forge 1.4.0            | Denetim tarihinde yamalı sürüm yayımlanmamış. Expo sertifika/CLI zincirinde kalıyor.                                                                                                                                                              |

Resmî danışmanlıklar: [URL çözümleyici](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr), [UUID](https://github.com/advisories/GHSA-w5hq-g745-h8pq), [braces](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), [node-forge](https://github.com/advisories/GHSA-86w9-cpqp-85rv).

Yerel yamada orijinal kaynak algoritması korunur; yalnızca `export default function` → `module.exports = function` dönüşümü vardır. Kurulum için checksum'ı kilit dosyasında bulunan `vendor/decode-uri-component-0.5.0-sofra.1.tgz` kullanılır. Bu dosya kaynak paketinden çıkarılmamalıdır. Yama kaynağı değişirse arşiv yeniden üretilmeli, bağımlılık kilidi ve testler birlikte güncellenmelidir. Expo Router uyumlu yamalı bağımlılığa geçtiğinde override kaldırılmalıdır.

Yamayı yeniden paketleme:

```bash
npm pack ./vendor/decode-uri-component --pack-destination ./vendor
npx expo install expo-notifications
npm run verify
npm run export
npm run test:e2e
```

İkinci komut mevcut SDK paketini sabit tutarak npm kilidini uzlaştırır. Expo'nun yerel tgz yolundan isim çözümlemesi sorunlu olduğundan tarball yolu `package.json` içinde açıkça tanımlıdır. Kör `npm audit fix --force` uygulanmadı; önerilen ana sürüm değişimleri mevcut SDK'yı bozabiliyordu. Kalan iki geliştirme bağımlılığı için yayın öncesi yeniden audit ve uyumlu upstream güncellemesi gerekir. Güvenilmeyen glob, sertifika veya derleme girdileri geliştirme/CI araçlarına verilmemeli.

## Uygulama sınırları

- Sunucu gizli Supabase anahtarı (`sb_secret_`) ve service_role JWT'si app config tarafından reddedilir. Public değişkene bir sır yazmak yine dağıtım hatasıdır; gerçek sırlar sadece sunucuda kalır.
- Kişisel SQL tablolarında RLS, sahiplik içeren yabancı anahtarlar ve revizyon kontrollü snapshot RPC yerel PostgreSQL testleriyle sınandı. Canlı Auth/PostgREST testi ayrıca gerekir.
- Misafir/demo/gerçek hesap depoları ayrıdır. Demo şifreleri saklanmaz. Native gerçek oturum SecureStore kullanır; web oturumu tarayıcı deposundadır.
- Sofra içeriği ve geri alma kopyası AsyncStorage içinde şifrelenmemiş saklanır. Hesap parolası/oturum tokenı içerik yedeğine girmez.
- Bulut eşitleme açık kullanıcı seçimiyle çalışır; çakışmada tüm kopya seçilir. Alan bazında birleştirme yapılmaz.
- Metin ve yapıştırılmış kaynak aktarımı boyut/ölçü/eşleşme doğrulaması kullanır; içerik kod olarak çalıştırılmaz. Ayrı bağlantı servisi aşağıdaki sınırlara tabidir.
- Market adaptörleri kapalıdır. Sadece sabit resmî HTTPS site bağlantıları açılır; liste aktarımı, fiyat, sipariş veya tahsilat yoktur.

## Kapsam genişlemesinin güvenlik sınırları

- Arkadaşlık/topluluk tabloları kişisel snapshot'tan ayrıdır. Özel profil, alıcıya özel istek kabulü, çift yönlü engelleme, sahiplik ve rapor gizliliği yedi PostgreSQL/PGlite senaryosuyla sınandı. Canlı Auth/PostgREST, hız sınırları ve moderasyon operasyonu bekler.
- Sosyal giriş native tarayıcı oturumu ve PKCE kod değişimi kullanır; dönen adresin protocol/host/path alanları doğrulanır. Gerçek sağlayıcı kabulü ve Apple yetki iptali tamamlanmadan üretime açılmaz.
- Video kullanıcıya ait HTTPS adresinden, kullanıcı düğmeye bastığında yüklenir. Uzak medya sunucusu bağlantı bilgisi alır; video dosyası uygulama yedeğine konulmaz. Video Storage yüklemesi veya OCR yapılmaz.
- Yazdırılacak metin HTML kaçışından geçirilir; web yazdırma iframe'i script izni almaz.
- Ticaret eşleme sözleşmesi süresi geçmiş, farklı mağazalı, stoksuz veya kampanya uygunluğu bilinmeyen teklifleri kullanmaz. Gerçek sağlayıcı yoktur; istemci bayrağı yetki kanıtı değildir.

## Tarif fotoğrafı ve kaynak aktarımı

- Galeri görseli küçük JPEG olarak yeniden kodlanır. EXIF, dosya adı ve galeri adresi kişisel kayda alınmaz; 220.000 karakter/görsel ve 2.000.000 karakter toplam sınırı vardır. Görsel kişisel snapshot/yedeğe dahildir; topluluğa otomatik gönderilmez. Yerel içerik şifrelenmiş değildir. Kaynak fotoğraf veya işletim sistemi önbelleği hesap silmeyle temizlenmiş sayılmaz.
- JSON-LD/HTML yalnızca veri olarak çözülür; script çalıştırılmaz. Girdi, derinlik, tarif/malzeme/adım sayıları sınırlıdır. İçerik ve gramaj kullanıcı incelemesinden sonra kaydedilir; üçüncü taraf görselleri otomatik alınmaz.
- Bağlantı servisi varsayılan kapalıdır. Bearer token Auth üzerinden doğrulanır; kullanıcı kimliği gövdeden alınmaz. Service-role istemciye verilmez. SQL kotası yalnızca sunucu tarafından tüketilebilir; ilk istekle başlayan bir dakikalık sabit pencerede 10 istek sınırı vardır.
- Yalnızca operatörün eklediği tam HTTPS originler kabul edilir; her yönlendirme yeniden denetlenir. IP/localhost, kullanıcı bilgisi ve özel port kabul edilmez. Kaynak isteğine kullanıcı tokenı veya çerezi iletilmez. 4 KB istek, 1 MB kaynak, 10 saniye ve 3 yönlendirme sınırı uygulanır.
- Origin kontrolü DNS/IP sabitleme değildir. Üretimde yalnızca güvenilir, herkese açık DNS kullanan kaynakları onayla; özel/link-local/metadata adreslerine ağ çıkışını ayrıca engelle. Keyfî kullanıcı alan adları için genel amaçlı güvenli proxy iddiası yoktur. Canlı Deno/Supabase ve ağ çıkışı kabulü henüz yapılmadı.

Ayrıntılı yapılandırma ve test sınırları: [Tarif fotoğrafı ve aktarım](RECIPE-MEDIA-IMPORT.md).

## Ortak hane

0010 migration ortak haneyi kişisel snapshot'tan ayırır. Hane ve üyeleri yalnızca üyeler okur; davet tablosuna istemci SELECT/yazı yetkisi yoktur. RPC kimliği Auth ile eşleşir. Davet kodunun SHA-256 özeti saklanır; 24 saat/tek kullanım, yenileme ve iptal uygulanır. Rol ve üyelik işlemleriyle liste yazıları aynı hane kilidini kullanır. Liste yazısı beklenen sürüm uyuşmazlığını reddeder; JSON alanları, miktar/birim, hafta, öğün/satır sayısı ve boyut sınırları sunucuda tekrar denetlenir.

Gerçek ortak veri kalıcı cihaz yedeğine yazılmaz. Realtime olayından sonra yetkili okuma yapılır; odak/ön plan/periyodik kontrol üyelik iptalini yeniden denetler. Ağ/erişim hatasında görünür ortak kayıt kaldırılır, çevrimdışı yazı veya otomatik tekrar gönderim yapılmaz. Daha önce okunmuş/dışarı kopyalanmış içerik geri alınamaz. Yönetici hesabını silmek haneyi cascade siler; önce devir yapılırsa hane korunur. Silme ekranı bu sonucu açıklar.

Yerel demo ayrı etiketli iki rol simülasyonudur; bir yetkilendirme sistemi değildir. Demo kodu canlı RPC'de kabul edilmez. SQL/RLS, oturum değişimi ve revizyon çatışması yerelde sınandı; canlı Supabase Auth/PostgREST/Realtime, çok cihaz ve kötüye kullanım/yük kabulü bekler. [Hane pilotu](HOUSEHOLD-PILOT.md).
