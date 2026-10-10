# Hesap e-postaları ve son kurulum

10 Ekim 2026. Kullanıcının isteğiyle alan adı, SMTP sağlayıcısı ve gerçek hesap/e-posta kabul denemesi **en sona bırakıldı**. Bu aşamada gönderici kurulmadı, gerçek kullanıcı oluşturulmadı ve e-posta gönderilmedi. Yemek projesindeki doğrulama gereksinimi açık kalır.

## Tamamlanan ekranlar

- Giriş → **Doğrulama e-postası gelmedi** → `/verify-email`: adresi doğrular, kayıt doğrulama bağlantısını tekrar ister.
- Kayıt ve şifre yenileme sonrasında adresi gözden geçirme, düzeltme ve yeni bağlantı isteme.
- Gerçek hesap modunda doğrulama, kayıt ve şifre yenileme gönderimleri arasında 60 saniyelik ortak bekleme. Aynı anda ikinci istek gönderilmez. Başarısız istek de bekleme başlatır; ekran değişimi süreyi sıfırlamaz. Bekleme sadece uygulama belleğindedir, sayfa yenilenince sıfırlanabilir; güvenlik kotası yerine geçmez, gerçek sınırı Supabase uygular.
- Gelen kutusu/istenmeyen posta ve işlemin başladığı uygulama veya tarayıcıda en son bağlantıyı açma yönlendirmesi. PKCE anahtarı başka cihazda bulunmayabilir.
- Query veya hash içinde gelen süresi dolmuş/geçersiz bağlantılardan yeni istek ekranına dönüş. Ham bağlantı hata açıklaması gösterilmez. Yeni kod geldiğinde eski isteğin ekran sonucu uygulanmaz.
- Gönderici hazır değil, çok fazla istek, süresi dolmuş bağlantı, eksik doğrulama anahtarı, zayıf veya aynı şifre için Türkçe mesajlar. Sunucu gönderimi reddettiğinde başarı ekranı açılmaz.
- Başarılı istek, hesabın var olduğunu veya e-postanın teslim edildiğini garanti etmez; metinler bunu iddia etmez. Demo ekranı gerçek e-posta göndermez.

## Doğrulama

```bash
npm run verify
npm run export
npm run test:auth
npm run export:demo
npm run test:e2e
```

`test:auth`, gerçek hesap modundaki `dist` paketini kullanır ancak **bütün Auth isteklerini tarayıcıda yakalayıp taklit yanıt döndürür**. E-posta göndermez, kullanıcı açmaz. Kayıt/yenileme/tekrar gönderim, doğru PKCE isteği ve dönüş yolu, bekleme, adres düzeltme, gönderici/kota hataları ve geçersiz bağlantı davranışını sınar. Bu kontrol gerçek teslimat veya fiziksel cihaz kabul testi değildir. `test:connected` içindeki eski iki bağlantı testi bundan ayrıdır; bu adımda yeniden çalıştırılmadı.

## Sen hazır olduğunda

1. Marka/alan adı ve gönderim sağlayıcısını seç. Sağlayıcının verdiği DNS kayıtlarıyla göndericiyi doğrula; şifre veya anahtarı sohbete/kaynak koda yazma.
2. Yemek → Authentication → Emails → SMTP Settings bölümüne sağlayıcının gerçek host, port, kullanıcı, parola, gönderici adresi ve adını gir. E-posta doğrulamasını kapatma.
3. Türkçe doğrulama ve şifre yenileme şablonlarını, mevcut PKCE akışının `{{ .ConfirmationURL }}` bağlantısını koruyarak ayarla. Gönderim sağlayıcısının bağlantı izleme ayarı doğrulama URL'sini değiştirmemeli.
4. Yayın adresi belli olduğunda Site URL ve izinli dönüş yollarını gerçek HTTPS adresleriyle düzenle. Web ve native paketler için doğru dönüş temelini kullan.
5. Kendi test hesabınla kayıt, e-posta doğrulama, tekrar gönderme, giriş/çıkış, şifre yenileme; ardından iki gerçek cihazda eşitleme ve test hesabını silme denemelerini yap.

Bu adımlar uygulanana kadar e-posta teslimatı, Apple/Google girişleri veya mağaza yayını hazır kabul edilmez.

Resmî kaynaklar: [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp), [doğrulama e-postasını tekrar gönderme](https://supabase.com/docs/reference/javascript/auth-resend), [şifre tabanlı giriş](https://supabase.com/docs/guides/auth/passwords), [Expo Router bağlantı/hash parametreleri](https://docs.expo.dev/router/reference/url-parameters/).
