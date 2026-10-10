# Doğrulama raporu

11 Ekim 2026 · Sofra 40 tariflik katalog · Windows · Node 24.13.0 · Expo SDK 57.

## Son sonuçlar

| Kontrol                       | Sonuç                                                                                 |
| ----------------------------- | ------------------------------------------------------------------------------------- |
| TypeScript                    | Geçti                                                                                 |
| ESLint                        | Geçti, hata/uyarı yok                                                                 |
| Vitest                        | **320/320 geçti**, 29 dosya                                                           |
| Playwright / tüm demo         | **73/73 geçti**, 3,6 dakika                                                           |
| Expo export                   | Web JavaScript, iOS Hermes, Android Hermes üretildi                                   |
| İçerik kontrolü               | 40 tarif, 43 ortak malzeme, 8 seçki; 38 PNG toplam 90,63 MiB                          |
| Veritabanı                    | 40 tariflik seed yerel PostgreSQL/PGlite testlerinde yüklendi; uzak projeye yazılmadı |
| Gerçek telefon                | Henüz yapılmadı; cihazlar bekleniyor                                                  |
| Hesap e-postası / taklit Auth | Önceki aşamada 7/7; bu aşamada yeniden çalıştırılmadı                                 |
| Canlı hesap / mobil Chromium  | Önceki aşamada 2/2; gerçek e-posta/SMTP denemesi ertelendi                            |
| Expo Doctor                   | Önceki aşamada 21/21; bu aşamada yeni bağımlılık yok                                  |
| Temiz kurulum ve npm audit    | Bu aşamada tekrar edilmedi; önceki kayıtlar aşağıda                                   |

```text
Test Files  29 passed (29)
     Tests  320 passed (320)

Running 73 tests using 1 worker
  73 passed (3.6m)

Son görsellerle yeniden üretilen demo paketinde katalog/keşif:
  6 passed (27.1s)

Content check: recipes 40, ingredients 43, stories 8, imageMiB 90.63
Web Bundled ... expo-router/entry.js
iOS Bundled ... expo-router/entry.js
Android Bundled ... expo-router/entry.js
Exported: dist
```

## Katalog genişlemesinde doğrulananlar

Son görsel dosyaları değiştikten sonra demo yeniden üretildi. Katalog/keşif için altı hedefli tarayıcı senaryosu yeniden geçti; görsellerin yüklenmesi, eski kayıt yükseltmesi, porsiyon/alışveriş ve dar ekran kontrolü son pakette doğrulandı.

- 14 ek tarifin kategorileri, malzeme ilişkileri, şeması, süre toplamları, ekipmanı ve görselleri.
- 26 tarifli kaydın 40'a yükselmesi; kullanıcıya ait tarif, malzeme, not, favori, koleksiyon, menü, stok ve kayıtlı listelerin korunması. Tekrar yüklemede çoğalmama.
- 1 kişilik çılbır ve 2 kişilik cacık: 400 g yoğurt ihtiyacı, 150 g ev stoku, tek satırda 250 g alışveriş. Tarayıcıda seçkiden porsiyona, menüye ve alışverişe geçiş.
- Sekiz seçki, arama/kategori/süre sonuçları; yeni seçkilerin diyet, hariç malzeme ve ekipman tercihlerini gözetmesi.
- İlk koşuda 317/320 test geçti. İki eski test büyüyen katalogda hâlâ seçenek kıtlığı varsayıyordu; açıkça küçük test havuzlarıyla kıtlık ve filtre koruması yeniden sınandı. Yeni testte kişisel malzeme kimliği şemaya uygun hale getirildi. Son tam koşu 320/320.
- İlk tarayıcı koşusu 72/73; iki tarif adı tek metinde birleştiği için ayrı tam metin arayan test seçicisi düzeltildi. İkinci tam koşu 73/73. Hesap veya market uçlarında değişiklik yapılmadı.
- Görsel incelemede kahvaltı seçkisi ve yeni tarif ekranı kontrol edildi; 320/390/1280 px yatay taşma kontrolü geçti. `39-kahvalti-seckisi.png`, `40-yeni-tarif.png`.
- Son görseller aynı krem zeminli, ortalanmış tabak sunumuna getirildi; dosya toplamı son içerik kontrolünde 90,63 MiB. [Katalog kapsamı](CATALOG-EXPANSION.md), [görsel promptları](CATALOG-IMAGE-PROMPTS.md).
- Web/iOS/Android export imzalı APK/IPA veya fiziksel cihaz testi değildir. Tariflerin gerçek mutfak denemesi ayrıca bekler. Gerçek hesaba e-posta gönderilmedi; uzak veritabanında değişiklik yapılmadı.

## Önceki aşamaların doğrulama kayıtları

Önceki aşamalara ait aşağıdaki sayılar tarihsel kayıttır. Yeni katalog çalışmasının sonucu üstteki tabloda yer alır. İlk sürümde temiz kurulum/decoder kontrolü yapıldı; son bağımlılık güvenlik kontrolünde 18 yüksek, 0 orta, 0 kritik bulgu raporlandı. Bu aşamada yeniden audit yapılmadı. [Güvenlik raporu](SECURITY-REVIEW.md).

- 13 yeni alışveriş birim senaryosu: gramaj/stok, ek ürün birimlerini ve küçük kesirleri koruma, Türkçe/ASCII ürün arama, boş sonuçla tamamlanma durumunu ayırma, kaynak/hafta doğrulama, yinelenen işlem, değişen ürünün eski işaretini geri almama, kayıtlı liste yalıtımı ve silinmiş kaydı yeniden oluşturmama.
- Son demo paketinde 7/7 yeni tarayıcı senaryosu geçti: haftalık/kayıtlı giriş ve geri dönüş, işaret/geri alma/kalıcılık, ağ kapalıyken ek ürün işaretleme, arama ve gramaj açıklaması, stok değişiminden sonra tarayıcı geçmişiyle geri dönüş, farklı hafta, hatalı bağlantı, boş/tamamlanmış liste ve 320 px uzun ürün adı. Görünüm 390 px olarak incelendi: `38-alisveris-modu.png`. [Rehber](SHOPPING-MODE.md).
- İlk geniş koşuda eski 64 senaryo geçti. Yeni testlerde, işaretlenince kaybolan satır için `check()` görünür kalma beklentisi kaldırılıp dokunma sonrası sonuç doğrulandı; sekmelerin kendi geri yönü yerine tarayıcı geçmişiyle açık alışveriş ekranına dönüş sınandı. Bu test düzeltmelerinden ve küçük ek ürün miktarını sıfıra yuvarlamama düzeltmesinden sonra yeni 7 senaryo yeniden geçti. Tek koşuda 71/71 geçti iddiası yoktur.
- Web ve iOS/Android Hermes export son kaynakla tamamlandı. Windows sandbox geçici klasörü izin hatası, `TEMP`/`TMP` proje içindeki `work/test-temp` klasörüne alınarak giderildi. Yerel tarayıcı sunucusu erişebilen izin bağlamında çalıştırıldı. İmzalı APK/IPA veya fiziksel cihaz testi değildir. Bu aşamada gerçek hesaba, e-postaya veya uzak veritabanına işlem yapılmadı.

- Ortak haftada 11 yeni birim testi: eski sıra numarasıyla yanlış işaret aktarmama, ortak işaretin önceliği, miktar/birim değişimi, ek ürün koruma/açık çıkarma, belirsiz ad, Türkçe ad, öğün farkları, hane/hafta/sürüm, 200 ürün sınırı, kişisel stok değişimi ve paylaşılmayan favorinin fark sayılmaması.
- 5 yeni ve 4 mevcut hane tarayıcı senaryosu geçti. Yeniden aktarımda korunma/kalıcılık, stok sonrası karşılaştırma/iptal/onay, ortak kayıt veya kişisel liste değişince eski onayı engelleme, ek ürünü yalnızca onayla çıkarma. 320 px taşma ve 390 px görünüm kontrolü. [Kullanım ve sınırlar](HOUSEHOLD-PUBLICATION.md); `37-ortak-hafta-karsilastirma.png`.

- 18 yeni birim/sınır testi: yinelenen e-posta isteklerini engelleme, hata sonrası bekleme, adres normalizasyonu, query/hash hataları, bozuk/çok uzun/tekrarlı kod alanları, Türkçe mesajlar ve sunucu ayrıntılarını gizleme.
- 7 yeni taklit Auth tarayıcı senaryosu: doğrulama bağlantısını tekrar isteme, PKCE ve dönüş adresi, süre sayacı ve adres düzeltme, şifre bağlantısını tekrar isteme, kayıt sonrası parola temizliği, ekran değişiminde süreyi koruma, SMTP/kota hataları, bozuk bağlantı ve başka tarayıcıda eksik anahtar. Gerçek e-posta gönderilmedi. Görseller: `35-dogrulama-baglantisi.png`, `36-gecersiz-baglanti.png`.
- Yeni demo tarayıcı kontrolü: yeniden doğrulama ekranı dış hizmet çağırmaz ve gerçek hesap açıldığı izlenimini vermez. SMTP/alan adı ve gerçek hesap kabul denemesi kullanıcının kararıyla sona bırakıldı. [Kurulum rehberi](ACCOUNT-EMAIL.md).

- Oturum yarışları, 12 saniye sınırı, geç yanıtın yeni hesabı ezmemesi, web/native yenileme ayrımı, eşitlemenin eski hesabın sonucunu kabul etmemesi; 22 yeni bağlantı/oturum testi.
- Hesap silmede önce oturum iptali, iptal hatasında silmeme ve bozuk JSON reddi; iki yeni sunucu testi.
- Canlı yemek projesinde yedi API denetimi ve rollback ile kapatılan PostgreSQL sahiplik/sürüm kontrolü. [Ayrıntılı kurulum kaydı](YEMEK-CONNECTION.md).

- Onboarding, kişi/beslenme/bütçe; Türkçe arama, tema/kategori/süre filtreleri; 320/390/1280 px taşma ve görsel yükleme.
- Haftalar ve öğle/akşam ayrımı; öneri değiştirme; dolu menüyü ezmeme; porsiyon sınırları; hatalı URL parametrelerini güvenli başlangıç değerlerine çevirme.
- g/kg normalizasyonu, ortak malzemeyi birleştirme, porsiyonla ölçekleme, stoktan bir kez düşme; ek ürün birimlerini koruma.
- Kayıtlı liste bağımsızlığı, aktif/kayıtlı işaretleme, sayfa yenileyince kalıcılık, depolama yazma hatası ve yeniden deneme.
- 40 tarifin süre toplamları, ekipman, görsel ve ilişkileri; katalog yükseltmesinde kullanıcı düzenlemelerini koruma.
- Favori, koleksiyon, stoktan tarif önerisi, seçkiler, adımlı pişirme, sayaç, kişisel not/puan ve geçmiş.
- Metinden aktarımda Türkçe ölçü/kesirler, belirsiz ölçüde kayıt engeli, eşleşme düzeltme ve yeniden onay; kişisel malzemenin tarif/stok/alışverişe katılımı.
- Malzeme adı değişimi, kullanılan malzemeyi koruma; tarif kopyalama, iptal edilebilir silme ve menü/geçmişte kullanılan tarifi koruma.
- Tarifin seçilen porsiyonla paylaşımı; doğru haftanın menü/liste metni; hane paylaşımının canlı eşitleme gibi görünmemesi.
- Demo kayıt, doğrulama, giriş, profil, çıkış, şifre yenileme ve onaylı hesap silme; şifrelerin depoda bulunmaması; hesaplar arası yerel yalıtım.
- Yedek doğrulama/önizleme/iptal, geri alma kopyası, yazı hatasında mevcut veriyi koruma, misafirden hesaba açık aktarım.
- Yeni 17 birim/sınır testi: UTF-8/Türkçe/emoji ve fotoğrafın kayıpsız dosya aktarımı; oturum alanlarının dışa alınmaması; eski TXT/BOM; büyük/boş/bozuk/yanlış tür ve gelecek sürüm reddi; native seçici iptali, geç sonuç, asıl dosyayı koruma ve geçici paylaşım dosyasının yaşam döngüsü.
- Yeni 5 tarayıcı akışı: ilk açılıştan dosya seçme, gerçek JSON indirme/boş oturuma yeniden yükleme, yanlış/büyük dosyada veriyi koruma, seçici iptal/ayrılma, indirme hatasında doğru mesaj ve metin alternatifi; 320px önizleme/karşılaştırma. Görseller: `31-yedek-dosyasi.png`, `32-yedek-karsilastirma.png`.
- Saf eşitleme protokolünde ortak temel, iki taraflı çakışma, onay sırasında değişiklik, revizyon yarışı, ağ hatası ve JSONB anahtar sırası.
- Yerel PostgreSQL/PGlite üzerinde RLS, anonim/başka hesap erişimi, alt kayıt sahipliği, ayrıntı/ekipman kısıtları ve snapshot RPC revizyon denetimi.
- Hatırlatma denetleyicisinde gün dönüşümü, izin reddi, yeniden planlama/iptal, hesap değişimi ve izin beklenirken oturum yarışı. Webin telefon bildirimi planlamaması.
- Yamalı CommonJS decoder ve uzun hatalı UTF-8 girdisi; xcode/UUID uyumu.
- Üretim config'inde eksik kimlik, yanlış paket adı, demo modu sınırı ve sunucu gizli anahtarının reddi.
- Tüm market adaptörlerinin kapalı olması; resmî sitenin açılması, listenin gönderilmemesi ve sipariş oluşmaması.
- Paket fiyatlarının ortak miktar/stok sonrası yuvarlanması, eksik fiyatın bedava sayılmaması, TL parse, bütçe hedefi/ek ürün payı ve mevcut menüyü koruma.
- Düzenli ürünün aynı haftada çoğalmaması, tarihli stok, pişirme oturumunu yeniden açma, toplu hazırlık işaretlerinin porsiyon/içerik değişince geçersizleşmesi.
- Alternatif tarifin asıl tarifi değiştirmemesi, diyet/istenmeyen malzemeye uyum, önerme tercihini geri alma.
- Yerel asistanın belirsiz/olumsuz istekleri reddetmesi, kayıtlı tercihleri koruması ve onaysız menü eklememesi.
- Besin/video notunun kaynak/URL doğrulaması, tarif değişince eski değerin gizlenmesi; yazdırılan HTML'de kullanıcı metninin kaçışlanması.
- OAuth dönüş adresi/kod denetimi; resmî tekliflerde mağaza/stok/zaman/kampanya uygunluğu ve ödeme URL izin listesi.
- 7 topluluk SQL senaryosu: özel/açık profil, minimal tam kullanıcı adı araması, yalnızca alıcının istek kabulü, çift yönlü engelleme, başka hesaba yazamama, rapor gizliliği ve gönderi biçimi.
- Yeni araç ekranlarının 320 px genişlikte taşmaması ve gezinirken tarayıcı uygulama hatası üretmemesi.
- Galeriden gerçek dosya seçimi, JPEG küçültme, açıklama, kayıt/yeniden açma, kaldırma onayı/iptali; fotoğrafın yedekte korunması ve toplam alan sınırı.
- Recipe JSON/JSON-LD graph ve çoklu tarif seçimi, adım bölümleri, eksik ölçüde kayıt engeli; kaynak/yazar bilgisinin paylaşımı, porsiyonla menü ve alışveriş hesabı.
- Aktarım servisinde Auth, boş kaynak izin listesi, HTTPS origin ve yönlendirme kontrolü, MIME/boyut/zaman aşımı sınırları; kullanıcı tokenının kaynak siteye gönderilmemesi.
- 0001–0010 migration birlikte kuruldu. Aktarım kotasının yalnızca service_role ile tüketilmesi, 10 istek sınırı, pencere sıfırlanması ve hesap silmede temizlenmesi PostgreSQL/PGlite üzerinde geçti.
- Ortak hanede 10 PostgreSQL senaryosu: dış/anonim hesap engeli, davet önizleme ve tek kabul, özetlenmiş kod/yenileme/iptal/süre, roller, eski sürüm yazısını reddetme, haftalar, üyeden çıkarma/ayrılma, devir, yönetici hesabı silme, JSON sınırları ve tek hane üyeliği.
- Beş yerel hane senaryosu: kişisel alanları paylaşmama, stoktan bir kez düşme, miktar/birim koruma, davet/rol/sürüm/devir/üyelik kuralları, eski yedek uyumu.
- Beş bağlantı senaryosu: kapalı servis ve farklı hesapta RPC gönderilmeme, beklerken hesap değişimi, aktör/sürüm alanları, bozuk sunucu yanıtı, zaman aşımı ve otomatik tekrar yapmama.
- Dört tarayıcı hane senaryosu: açık onayla haftayı paylaşma, iki yerel rolün aynı listeyi görmesi, kişisel işaretlerin korunması, 320 px genişlik, yetki/ayrılma/devir/kapama/iptal, geçersiz miktar ve bulunamayan sayfadan dönüş. Bunlar gerçek iki hesap/canlı Realtime testi değildir.
- Gerçek hesaplı pilotun eksik yapılandırmayla paketlenmemesi; mevcut demo ve üretim kontrollerinin korunması.

## Çalışma sırasında giderilen sorunlar

- Kullanıcının belirsiz ölçüsünü gram gibi kabul etme riski, katalog dışı malzeme eksikliği ve hesabın değiştiği sırada veri işlemi yarışları giderildi.
- PostgreSQL zaman damgası biçimi, eşitleme sürüm yarışı ve eski kör snapshot yazma yolu ele alındı.
- React effect lint hataları, ESM test config uyarısı ve bozuk öğün URL parametresi düzeltildi.
- Decoder yamasının eski CommonJS tüketicisiyle uyumu sağlandı. Expo yerel arşiv adı çözümlemesinin oluşturduğu hatalı npm kaydı temizlendi; taşınabilir tgz bağımlılığıyla temiz kurulum doğrulandı.
- Sandbox geçici klasör ayrımı Vitest alt süreçlerinde ENOENT üretti. Aynı çalışma klasöründeki ortak TEMP/TMP ile tüm testler geçti. Yerel HTTP/registry erişimi gereken kontroller izinli bağlantıyla çalıştırıldı.
- Hermes geçici çıktı izni için aynı TEMP/TMP kullanıldı. Test önbelleği kaynak kontrolüne girmesin diye work/ TypeScript, lint, biçim ve Git kapsamı dışında tutuldu.
- Expo Router SDK 57'de odak kancası expo-router üzerinden alındı. E2E başlangıç kaydı yarışı ve gizli arka ekranı seçen sorgu düzeltildi; ekipman testi yeni cihazlarla güncellendi.
- Mobil görsel kontrolde TL gösterimi ve alışverişte araçların malzemeleri aşağı itmesi düzeltildi.
- İlk tarayıcı denemesi eski 8081 adresinde başka bir projeye ulaştı ve onboarding adımında zaman aşımı verdi; çalışma durduruldu. Başka uygulama kapatılmadı. Sofra önizlemesi 8181, test sunucusu 8182 olarak ayrıldı; testler mevcut rastgele sunucuyu yeniden kullanmıyor. Yeni adreste tam 51 senaryo geçti.
- Hane ekranındaki açıklama/deneme kontrolleri dar ekranda listeyi aşağı ittiği için kısaltıldı. Klavye kaçınma/Android resize, düğme metni sarma, tarih satırı esnemesi ve Türkçe bulunamayan sayfa eklendi.

## Henüz doğrulanmayanlar

Demo ve bağlı önizlemeyi aynı çıktı klasöründe üretmek tarayıcı testini etkiledi; demo test paketi `work/demo-web` klasörüne ayrıldı ve 58 senaryonun tamamı bu ayrı pakette yeniden geçti. Hesap modu değişikliğinde Metro önbelleği eski demo değerini taşıdı; export komutları önbelleği temizleyecek şekilde güncellendi.

- Yemek projesinde canlı API erişimi, PostgreSQL sahiplik/sürüm kuralları ve kimliksiz hesap silme reddi doğrulandı. SMTP teslimi/PKCE, gerçek kullanıcı oturumu, başarılı hesap silme ve iki gerçek cihaz eşitlemesi bekliyor. Ayrıntılar: [Yemek bağlantısı](YEMEK-CONNECTION.md).
- İmzalı APK/IPA veya fiziksel telefon testi yapılmadı. Native bildirim, SecureStore, paylaşım, klavye/geri hareketi, büyük yazı ve VoiceOver/TalkBack kabul testleri bekler.
- Dosya yedekleme webde uçtan uca sınandı. Native DocumentPicker/Sharing sınırı taklitlerle test edildi; gerçek Android/iPhone/iPad seçici, alıcı uygulamanın dosyayı okuması ve önbellek temizliği cihaz testi bekler.
- Cihaz bildirim kodu paketlenmiştir; bu bilgisayarda bildirim teslimi ölçülmedi. Android pil/izin kısıtları zamanlamayı etkileyebilir.
- Web PWA değildir; ağsız ilk açılış/yenileme desteklenmez. Mobil kurulu uygulama çekirdeği ve yüklü web oturumunun yerel işlemleri dış servis gerektirmez.
- Apple/Google OAuth ve topluluk kodu vardır, varsayılan kapalıdır; gerçek sağlayıcı/Auth/PostgREST kabul testi yapılmadı. Apple yetki iptali ve moderasyon operasyonu ayrıca tamamlanmalı.
- Fotoğrafın iPhone/Android galeri, HEIC, izin ve bellek kabulü yapılmadı. Bağlantıdan aktarımın sunucu kodu hazır, varsayılan kapalıdır; Deno dağıtımı, canlı Supabase ve gerçek dış kaynak HTTP kabulü denenmedi.
- Ortak hane SQL/RPC, ekran ve Realtime/yenileme kodu hazırdır; canlı Supabase Auth/PostgREST/Realtime, üç gerçek hesap, ağ kopması ve iki fiziksel cihaz kabulü henüz yapılmadı. Yerel rol denemesi gerçek eşitleme değildir.
- Uzaktan push, büyük medya Storage yüklemesi, fotoğraftan yazı okuma (OCR), ücretli üyelik ve gerçek market/ödeme sağlayıcıları uygulanmadı.
- Tarifler gerçek mutfakta doğrulanmadı. Görseller AI ile üretilmiş temsilidir; fiziksel cihaz paket/bellek/indirme ölçümü bekler.
- Pişirme adımı/sayacı kaydedilir; arka plan alarmı çalmaz. Video oynatma, yazdırma ve ekranı açık tutma native cihaz kabulü bekler; gerçek video kaynağı/print diyaloğu bu teslimde denenmedi.
- braces/node-forge için denetim tarihinde uyumlu upstream yama yoktu; yayın öncesi yeniden değerlendirme gerekir.

Ayrıntılı canlıya geçiş sırası: [Kurulum rehberi](SETUP-HANDOFF.md), [yayın kapıları](RELEASE-GATES.md).
