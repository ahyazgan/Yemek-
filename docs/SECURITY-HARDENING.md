# Güvenlik sağlamlaştırması — 11 Ekim 2026

Sofra 0.1.1 için uygulama, bağımlılık zinciri, kişisel veritabanı yetkileri ve hesap silme yolu incelendi. Bu çalışma bağımsız penetrasyon testi, sıfır açık veya üretim güvenliği sertifikası değildir.

## Tamamlanan kod değişiklikleri

| Alan          | Koruma                                                                                                                                     | Doğrulama                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------ |
| Araç zinciri  | braces derinlik sınırı; node-forge DigestAlgorithm eleman sayısı; kaynağın önce/sonra SHA-256 kontrolü                                     | Normal/desenli glob, derin string/AST, geçerli ve bozuk imza regresyonları                                   |
| Kurulum / CI  | Postinstall; eksik yama, yeni yüksek/kritik açık veya audit servisi hatasında durma; gizli anahtar kalıp taraması                          | Yerel security:check / security:audit                                                                        |
| Üretim        | Açık yüksek/kritik audit sonucu ile üretim ön kontrolü ve EAS hook'u durur                                                                 | Demo istisnası süreli; kritik bulguya istisna yok                                                            |
| Native oturum | iOS Keychain WHEN_UNLOCKED_THIS_DEVICE_ONLY; Android otomatik uygulama yedeği kapalı; iOS HTTP istisnası kapalı                            | Yapılandırma testi; gerçek cihaz kabulü bekliyor                                                             |
| Hesap silme   | 4 KiB gövde, 5 saniye okuma sınırı, sınırlı bearer, no-store yanıt; Auth doğrulaması ardından sunucu oturum kontrolü                       | Büyük/yavaş/bozuk istek, sahte oturum, sahip eşleşmesi, süresi dolmuş/kaldırılmış oturum testleri            |
| Veritabanı    | İstemcide TRUNCATE/TRIGGER/REFERENCES kaldırılması; misafir kişisel tablo izinlerinin kaldırılması; yeni tablo için açık grant zorunluluğu | Geniş Supabase varsayılan izinlerini taklit eden PostgreSQL/PGlite testleri; sahip RPC'si ve katalog korunur |

Oturum kimliği yalnızca Auth sunucusu aynı tokenı doğruladıktan sonra çözülür. Yeni session RPC yalnızca service_role sunucusuna açıktır. Hesap silme dışında sıradan Data API çağrılarında çıkış sonrası erişim tokenının doğal geçerlilik süresi geçerlidir; tüm servislerde anında token iptali iddiası yoktur.

## Mevcut sonuç ve dağıtım durumu

- Yerel TypeScript, ESLint, **346/346 test (32 dosya)** ve 40 tarif içerik kontrolü geçti.
- npm audit hâlâ **18 yüksek, 0 kritik** bildiriyor. İki temel açığa yönelik koruma uygulanıp test edildi; resmî yamalı sürüm bulunmuyor. [Yama kaydı ve yayın sınırı](../security/README.md).
- Canlı Supabase advisor: 16 authenticated SECURITY DEFINER uyarısı; kullanıcı/sahiplik/üyelik denetimli RPC'ler. Davet/kota için 2 kasıtlı RLS-politikasız tablo doğrudan erişime kapalı. Uyarılar otomatik olarak kapatılmadı. [Resmî açıklama](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).
- Canlı yetki migration'ı ve güncellenmiş hesap silme işlevi **onay bekliyor**. Otomatik onay incelemesi genel güvenlik talebini bu geniş canlı yetki değişikliği için yeterli bulmadı. Onay gelmeden uygulanmaz.
- Önceki APK **0.1.0** bu native değişiklikleri içermez. 0.1.1 paket sonucu telefon teslim rehberine ayrıca işlenir.

## CodeQL ek incelemesi

Genişletilmiş `remote_and_local` CodeQL taraması altı uyarı üretti. Tarif metninde iç içe bozuk etiket ve entity sonrası etiket oluşumu giderildi. Regex ile tüm belgeyi tekrar tekrar arama yerine sınırlı ileri tarama yapılıyor; uzun kapanmayan etiketler ve Türkçe `İ`/emoji konumları test ediliyor. Önizleme sunucusu statik dosyaları başlangıçta belleğe alır; istekten dosya yolu üretmez, symlink/dot dosyalarını almaz, yabancı Host ve yazma yöntemlerini reddeder. Yeni export sonrası önizleme sunucusu yeniden başlatılmalı; yaklaşık 100 MB bellek kullanabilir.

Canlı backend kontrol betiği yalnızca mevcut yemek projesine istek atabilir. Yama betiğinin yerel CLI giriş koşuluna gelen bypass uyarısı gerçek bir kullanıcı yetkilendirme yolu değildi; uygulama/doğrulama girişleri ayrı sabit betiklere ayrıldı. Uyarılar topluca gizlenmedi veya risk düşürülmedi; son kod taramasıyla kapanmaları kontrol edilir.

GitHub CodeQL extended etkinleştirildi; bağımlılık güvenlik bildirimleri ve Dependabot düzeltme önerileri açıldı. Gizli anahtar taraması ve push protection zaten açıktı. Otomatik birleştirme veya mağaza yayını açılmadı.

## Sınırlar ve yayımdan önce kalanlar

Yerel tarif/liste/fotoğraf ve kullanıcının dışarı verdiği JSON yedeği şifrelenmiş değildir; native oturum anahtarları ayrı SecureStore içindedir. İşletim sistemi koruması, ele geçirilmiş/root/jailbreak cihaz güvenliği garantisi sağlamaz. Web oturumu tarayıcı deposundadır; üretim web sunucusunda CSP, HTTPS/HSTS ve erişim günlüklerinin sırları maskelemesi doğrulanmalı. Mevcut localhost önizlemesi üretim web barındırması değildir.

Gerçek Android/iPhone kurulum, kilit/yedek/geri yükleme, oturum ve deep link kabulü; alan adı/SMTP ve gerçek hesap e-postası testleri; sağlayıcı CAPTCHA/rate-limit ve çok faktörlü yönetici hesabı ayarları; yedekten felaket kurtarma ve bağımsız sızma testi bekler. Kullanıcının sona bıraktığı gerçek hesap/e-posta denemesi başlatılmadı. Market API erişimi ve Apple hesabı adına işlem yapılmadı.

URL tarif aktarımı kapalı kalır. Tam HTTPS origin kontrolü DNS sabitleme yerine geçmez; izinli kaynak ve dış ağ çıkışı kısıtı canlıda doğrulanmadan etkinleştirilmez. Apple sosyal girişinde sağlayıcı token iptali tamamlanmadan özellik açılmaz. Yeni alan adı/servisler açıldığında bu sınırlar yeniden kontrol edilmelidir.

## Komutlar

```bash
npm ci
npm run security:check
npm run security:audit
npm run verify
npm run release:check
```

Güvenlik sınırını kaldırmak için `audit fix --force`, sürüm numarası değiştirme veya hata kodunu yok sayma kullanılmaz. Gerçek anahtar sızarsa önce sağlayıcıda iptal/yenileme yapılır; dosyadan silmek eski Git geçmişini veya yayımlanmış paketi temizlemez.
