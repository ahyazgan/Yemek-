# Yemek projesi bağlantısı

10 Ekim 2026. Kullanıcının seçtiği **yemek** projesi: `ndwkiuopnefwreucbyku`, İrlanda. Başka projede değişiklik yapılmadı.

## Kurulanlar

- 11 migration, 27 tablo (tamamında RLS), 26 örnek tarif ve 43 malzeme.
- Yerel migration adları uzak geçmişle eşleştirildi. `supabase/deployment-yemek.json` yerel kurulum kaydıdır ve GitHub'a yüklenmez; ilk şemayı bu projede tekrar çalıştırma.
- `.env.local` gerçek hesap modunda proje URL'sini ve publishable anahtarını kullanır. Git ve kaynak arşivinin dışındadır. Sunucu sırları istemciye eklenmedi.
- Site URL: `http://127.0.0.1:8181`. İzinli web yolları `/auth/callback`, `/reset-password`; native yollar `yazgan-sofra-demo://auth/callback`, `yazgan-sofra-demo://reset-password`.
- E-posta sağlayıcısı etkin ve doğrulama gerekli; SMTP özelleştirilmedi.
- `delete-account` dağıtıldı. Bearer token Auth sunucusuyla doğrulanır; DELETE onayından sonra tüm yenileme oturumları kapatılır, ardından yalnızca doğrulanmış kullanıcı silinir. Gateway `verify_jwt=false`, çünkü doğrulama işlevin içinde yapılır. Canlı testte kimliksiz ve sahte token istekleri 401 döndü.
- Apple/Google, ortak hane, topluluk ve URL'den tarif aktarımı bayrakları kapalı. Market, ödeme ve sipariş entegrasyonu açılmadı.

## Doğrulama ve sınırları

`npm run backend:check` public API üzerinde yedi kontrol yapar: kataloglar, e-posta/doğrulama ayarı, misafirin kişisel yedeğe erişememesi, iç ilişki işlevinin kapalı olması, kimliksiz/sahte token ile hesap silmenin reddi. Kullanıcı oluşturmaz, e-posta göndermez, veri silmez.

Gerçek PostgreSQL'de iki geçici kullanıcıyla kendi yedeğini yazma/okuma, eski sürümle yazı reddi, diğer hesabın okuma/yazma engeli sınandı. Transaction rollback ile kapandı; test kullanıcısı veya yedeği bırakılmadı. Bu işlem gerçek e-posta girişi veya iki telefonda eşitleme testi değildir.

Bağlantılar ve servisler ekranındaki kontrol salt okunurdur. Giriş varsa sunucuda hesabı doğrular ve yedek tablosuna içerik almayan HEAD isteği yapar. Giriş yoksa bunu açıkça belirtir. Başarılı tablo okuması yedek oluşturulduğu veya tüm yazma/RLS kurallarının sınandığı anlamına gelmez.

Oturum açılışı 12 saniyede sonuçlanmazsa misafir ekranı açılır. Sonraki oturum olayları alınır; geciken ilk kopya yeni giriş/çıkışı ezmez. Web görünürlüğünü Supabase, native yenilemeyi uygulama görünürlüğü yönetir. Bulut isteği 12 saniyede kesilir. Sunucuya ulaşmış bir yazının iptal edildiği varsayılmaz; sonraki eşitleme önce uzak sürümü okur.

## Çalıştırma

```bash
npm run verify
npm run export:demo
npm run test:e2e
npm run export
npm run test:connected
npm run backend:check
npm run preview
```

Demo testleri `work/demo-web`, gerçek hesap testleri ve kullanıcı önizlemesi `dist` paketini kullanır. Önizleme 8181, test sunucusu 8182; iki tarayıcı test komutunu aynı anda çalıştırma. Demo paketi açık canlı önizlemeyi değiştirmez.

`.env.local` web dönüş adresini içerir. Native preview-connected/EAS derlemesinde dönüş temelini kendi scheme'inle değiştir; marka, uygulama kimliği ve EAS bilgilerini tamamla. JS/Hermes export imzalı APK/IPA değildir.

## Kalan kabul adımları

Kullanıcının son tercihi: alan adı/SMTP kurulumu ve gerçek hesap denemesini kendisi en son yapacak. [Hazırlanan ekranlar ve kurulum sırası](ACCOUNT-EMAIL.md). Bu adımda canlı ayar değiştirilmedi veya e-posta gönderilmedi.

1. Kendi SMTP sağlayıcısı ve doğrulanmış gönderici alan adı. Varsayılan Supabase e-posta hizmeti genel kullanıcı yayını için yeterli kabul edilmez. [SMTP rehberi](https://supabase.com/docs/guides/auth/auth-smtp).
2. Gerçek kullanıcıyla kayıt/doğrulama, giriş/çıkış, şifre yenileme, iki cihazda çakışmalı eşitleme ve onaylı hesap silme.
3. Android/iPhone preview build üzerinde SecureStore, deep link, dosya seçimi, paylaşım ve bildirim.
4. Alan adı belirlendiğinde Site URL ve dönüş yollarını HTTPS yayına göre değiştirme.

## Danışmanlık bulguları

Supabase varsayılan izinlerinin açtığı `community_blocked` yardımcı işlevinin authenticated erişimi kapatıldı. Platformun `rls_auto_enable` event trigger'ının anon/authenticated çalıştırma izni de kaldırıldı.

Son güvenlik taramasında anon SECURITY DEFINER uyarısı yok. Kalan 16 authenticated SECURITY DEFINER uyarısı, kimlik/sahiplik/üyelik kontrolü yapan bilerek açılmış RPC'lerdir; tarama bir güvenlik garantisi değildir. [Denetim açıklaması](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable).

İki “RLS açık, politika yok” bildirimi `household_invites` ve `recipe_import_quotas` içindir. Bu tabloların doğrudan istemci erişimi kapalıdır; yetkili sunucu/RPC kullanılır. [RLS açıklaması](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).

Performans taramasında 13 indekssiz yabancı anahtar, 7 satır başına auth değerlendirmesi, 1 birden çok izin politikası ve 12 kullanılmamış indeks var. Yeni projede kullanılmamış indeksler silinmedi; kalanlar yük testi öncesi değerlendirilmeli. [İndeks](https://supabase.com/docs/guides/database/database-linter?lint=0001_unindexed_foreign_keys), [auth değerlendirmesi](https://supabase.com/docs/guides/database/database-linter?lint=0003_auth_rls_initplan), [politikalar](https://supabase.com/docs/guides/database/database-linter?lint=0006_multiple_permissive_policies).
