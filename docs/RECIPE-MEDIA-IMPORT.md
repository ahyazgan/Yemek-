# Tarif fotoğrafı ve kaynaklı aktarım

10 Ekim 2026. Bu teslim önceki 26 tariflik kataloğu korur; kişisel tarif defteri için aşağıdaki akışları ekler.

## Uygulamada kullanım

**Fotoğraf:** Tarif detayı → Kendi fotoğrafımı ekle → Galeriden fotoğraf seç → açıklama → Fotoğrafı kaydet. Küçük görsel tarif kartlarında, detayda ve pişirme ekranında kullanılır. Yeniden açınca korunur. Kaldırma onay ister; telefonun galerisindeki asıl dosyaya dokunmaz. Kendi fotoğrafını veya kullanma hakkın olan görseli seç.

**Tarif aktarımı:** Mutfağım → Benim tariflerim → Tarif aktar. Metin sekmesi önceki gramaj denetimli aktarımı korur. Kaynak verisi sekmesi, gelişmiş kullanım için yapıştırılmış Recipe JSON veya JSON-LD içeren HTML'yi çevrimdışı çözer. Birden çok tarif varsa seçim gerekir. Kaynak bağlantısı ve yazar bilgisi, kaydettiğin tarifte ve paylaştığın metinde korunur.

**Bağlantı sekmesi:** Gerçek hesap ve aşağıdaki Supabase servisi kurulunca çalışır. Yalnızca sunucuda onaylanan kaynaklardan Recipe verisi okunur. JavaScript ile sonradan oluşturulan sayfalar, giriş isteyen/korumalı içerik ve veri içermeyen sayfalar desteklenmez. Hata olduğunda metin yapıştırma yolu kullanılabilir. Kullanıcının Sofra tokenı kaynak siteye gönderilmez.

Malzemeler hiçbir modda kendiliğinden menüye eklenmez. Kişi, süre, gramaj ve malzeme eşleşmesini kullanıcı kontrol edip onaylar. Bardak/kaşık/adet/ml grama tahminle çevrilmez. Gelen tarifin görselleri, besin değerleri veya beslenme etiketleri otomatik alınmaz.

## Fotoğraf modeli

- Galeriden tek görsel seçilir; giriş sınırı 15 MB / 40 MP. Kamera veya mikrofon izni istenmez.
- Görsel JPEG olarak yeniden kodlanır; uzun kenar en fazla 720 px, gerekirse 480/320 px. Veri URI'si en fazla 220.000 karakterdir; tüm tarif fotoğrafları toplam 2.000.000 karakterle sınırlıdır.
- Küçük fotoğraf `Recipe.photo` içinde taşınır. Ayrı Storage bucket veya herkese açık URL üretilmez. EXIF/fileName/galeri URI'si uygulama durumuna yazılmaz.
- Fotoğraf kişisel snapshot, dışa aktarma ve geri yükleme ile taşınır. Hesaplar ayrıdır. Bulut eşitleme açıksa Supabase'e kişisel yedekle birlikte gider. Topluluk gönderisine otomatik eklenmez.
- Bu, büyük medya dosyası yükleme altyapısı değildir. Kaynak dosya ve geçici işletim sistemi önbelleği kullanıcı yedeğinin parçası değildir.
- Eski kayıtlar değişmeden açılır. Fotoğraf kaynak alanları isteğe bağlıdır. Alan doluysa kayıt/kopyalama anlaşılır hata ile durur.

## Supabase kurulumu

1. Önceki migration'lardan sonra `20261010185812_sofra_0009_recipe_media_import.sql` dosyasını uygula. Fotoğraf/kaynak sütunları ve yalnızca sunucunun tüketebileceği kota işlevi eklenir. Çalışan uygulama kişisel tarifleri snapshot yoluyla eşitlemeye devam eder.
2. `supabase/functions/import-recipe/` işlevini ve yanındaki `_shared/recipePage.ts` dosyasını birlikte dağıt:

```bash
supabase functions deploy import-recipe
```

3. Edge Function Secrets içinde `RECIPE_IMPORT_ORIGINS` ayarla. Virgülle ayrılmış **tam HTTPS origin** listesi kullan; örneğin sana ait gerçek bir tarif alan adı. Liste varsayılan boştur. Wildcard, alt alan adı eşleşmesi, IP adresi veya localhost kabul edilmez. Kaynak site izinlerini ve kullanım koşullarını doğrula; korumalı sayfalara erişim aşılmaz.
4. Yalnızca denetlediğin/güvendiğin, DNS'i herkese açık sunuculara yönelen originleri ekle. Kod origin izin listesini her yönlendirmede tekrar kontrol eder, fakat DNS çözümlemesini IP'ye sabitlemez. Üretimde özel/link-local/metadata adreslerine ağ çıkışını ayrıca engelle. Keyfî kullanıcı alan adını listeye otomatik ekleme.
5. Uygulama ortamında gerçek Supabase ayarlarına ek olarak `EXPO_PUBLIC_RECIPE_IMPORT_ENABLED=true` yapıp yeniden paketle. Service-role yalnızca sunucuda kalır; istemci bayrağı sunucu izninin yerine geçmez.

## Servis davranışı

- Her çağrıda bearer token Auth ile doğrulanır. Kimlik gövdeden alınmaz.
- Kullanıcı başına ilk istekle başlayan bir dakikalık sabit pencerede en fazla 10 istek. Kota atomik PostgreSQL upsert ile tüketilir; kullanıcı bunu sıfırlayamaz. Pencere dolunca sonraki istek yeni pencereyi başlatır. Kullanıcı silinince kota kaydı da silinir.
- En fazla 3 yönlendirme; her hedef aynı kurulu origin izin kontrolünden geçer. Kullanıcı çerezi, tokenı veya diğer istek başlıkları kaynak siteye iletilmez.
- 10 saniye kaynak zaman aşımı, 4 KB istek gövdesi, 1 MB kaynak akışı sınırı ve HTML/JSON MIME kontrolü vardır.
- HTML çalıştırılmaz. Yalnızca Recipe JSON/JSON-LD; en fazla 10 tarif, tarif başına 60 malzeme/40 adım. Adım içindeki HTML düz metne dönüşür.
- Hata cevabı kaydı değiştirmez. Asıl kayıt yalnızca inceleme ekranındaki kullanıcı onayıyla oluşur.

## Doğrulama ve açık sınırlar

Yerel testler fotoğraf veri türü/boyutu/toplam alan, eski kayıt, yedek, kaynak paylaşımı, JSON-LD graph/çoklu tarif/adım/eksik ölçü, URL izin listesi, yönlendirme, MIME/boyut/zaman aşımı, Auth ve SQL kotasını kapsar. Tarayıcı testi gerçek dosya seçimini, JPEG küçültmeyi, kayıt/yeniden açma/kaldırmayı ve aktarılan tarifin alışveriş hesabını denedi.

Canlı Supabase dağıtımı, gerçek dış kaynak HTTP kabulü, iPhone/Android galeri/HEIC/izin ve bellek testleri yapılmadı. Fotoğraftan metin okuma (OCR), siteye özel kazıma, büyük medya Storage yüklemesi ve genel AI tarif çıkarımı bu teslimde yoktur.

Teknik kaynaklar: [Expo ImagePicker SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/imagepicker/), [ImageManipulator SDK 57](https://docs.expo.dev/versions/v57.0.0/sdk/imagemanipulator/), [Schema.org Recipe](https://schema.org/Recipe), [Supabase Edge Function Auth](https://supabase.com/docs/guides/functions/auth).
