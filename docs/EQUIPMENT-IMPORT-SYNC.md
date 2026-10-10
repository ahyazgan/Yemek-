# Ekipman, tarif aktarımı ve veri koruması

10 Ekim 2026. Bu aşama çalışan çevrimdışı akışları ve Supabase kurulumu sonrasında kullanılacak eşitleme kodunu ekler.

## Ekipmanlar

Mutfağım → Ekipmanlarım. Ocak, fırın, blender ve buzdolabı tercihi keşif, seçkiler, benzer tarifler, stok önerileri ve otomatik menüye uygulanır. Mevcut öğünler değiştirilmez. Tarif doğrudan açıldığında eksik cihaz ayrıca gösterilir. Temel tencere/tava/bıçak varsayılır; alternatif pişirme yöntemi üretilmez.

`null` tercih filtresiz; boş dizi hiçbir cihaz yok; tarifte eksik/null ekipman henüz belirtilmemiş anlamına gelir. Eski tarifte yalnızca değişmemiş pişirme içeriği zenginleştirilir. Açıkça silinen bilgiler geri eklenmez. Tarif editöründen ekipman düzenlenebilir. `recipe-equipment.ts` 24 tarifin yazılı yöntemine göre doldurulmuştur.

## Metinden tarif aktarımı

Mutfağım → Benim tariflerim → Metinden tarif aktar. İlk satır başlık; isteğe bağlı `Porsiyon: 4` ve `Süre: 30 dk`; ardından `Malzemeler` ve `Yapılışı` başlıkları gerekir. Eksik porsiyon/süre kullanıcı tarafından tamamlanır.

- Metin cihazda işlenir; uzak AI, bağlantıdan veri çekme veya fotoğraf okuma yoktur.
- Açık g/kg ölçüleri, Türkçe ondalık virgül, kesir ve yarım/çeyrek simgeleri tanınır.
- Bardak/kaşık/adet/ml gram tahminine dönüştürülmez. Kullanıcı gramı girer.
- Bilinmeyen veya hazırlık durumu belirsiz malzeme otomatik eşleştirilmez. Çiğ nohut haşlanmış nohut sayılmaz.
- Katalogdaki 43 malzemeye ek olarak kişisel malzeme oluşturulabilir; ad ve kategori zorunludur. Aktarım, stok, arama ve liste aynı sözlüğü kullanır. Bilinmeyen malzeme yanlış bir eşleşmeye zorlanmaz. Ayrıntılar [içerik belgesinde](SHARING-REMINDERS-CONTENT.md).
- Her satır ve yapılış düzenlenebilir; açık kontrol onayı olmadan kayıt yoktur. Bir alan değişirse onay sıfırlanır.
- Aynı malzemeler gram olarak birleştirilir. Tarif menü/listede temel porsiyona göre ölçeklenir.
- 20.000 karakter, 150 satır, 60 malzeme satırı ve 40 yapılış adımı sınırı vardır. Beslenme etiketleri otomatik türetilmez.

## Yedek geri yükleme

Hesabım → Yedek ve geri yükleme misafir ve hesap kullanıcılarında açıktır. İlk açılışta Yedeğimden devam et de kullanılabilir. Tarihli JSON dosyası kaydetme, JSON/TXT dosyası seçme, mevcut sofra ile içerik sayısı karşılaştırması ve eski metin aktarımı hazırdır. Uygulama/sürüm, tarihler, gramajlar ve tarif/öğün ilişkileri Zod ile doğrulanır. Geçersiz yedek mevcut veriye yazılmaz. Önizleme iptal edilebilir. [Dosya kullanımı ve cihaz kabulü](BACKUP-FILES.md).

Onayda önce aynı hesaba ait geri alma kopyası saklanır. Bu yazı başarısızsa geri yükleme yapılmaz. Bekleme sırasında yerel veri değişirse işlem yeniden inceleme ister. `Son geri alma kopyasını incele` ile önceki sofra geri alınabilir. Tek kopya tutulur; sonraki geri yükleme onu değiştirir. Cihaz verileri ve geri alma kopyası şifrelenmemiş AsyncStorage alanındadır. Şifre/oturum tokenı yedeğe girmez.

Misafir yedeği açıkça bir hesapta geri yüklenebilir; otomatik kopyalama yoktur. Hesap silmede yerel sofra, geri alma kopyası ve eşitleme kontrol noktası temizlenir; misafir kayıtları korunur.

## Bulut eşitlemesi

Demo/misafirde kapalıdır. Gerçek Supabase hesabında kullanıcı `Şimdi eşitle` ile elle veya `Otomatik eşitlemeyi aç` ile uygulama açıkken eşitleyebilir. Yerel değişiklikten 1,5 saniye sonra, uygulama tekrar etkin olduğunda ve etkin kullanımda 60 saniyede bir kontrol edilir. Arka planda sürekli çalışan bir servis veya gerçek zamanlı ortak düzenleme değildir. Ağ hatasında cihaz verisi kullanılabilir kalır.

Eşitleme `app_snapshots` üzerinde **tam durum kopyası** kullanır; normalize tablolara satır bazlı yazmaz. Son başarılı ortak kopya hesap kapsamında saklanır:

- Yalnız yerel değiştiyse sürüm kontrolüyle buluta yazılır.
- Yalnız bulut değiştiyse, arada yerel değişiklik olmadığından emin olunarak geri alınır.
- İki taraf değiştiyse veya yeni cihazda farklı iki kopya varsa kullanıcı seçim yapar. Eski kopya cihazdaki geri alma alanında korunur.
- Kullanıcı karar verirken uzak/yerel kopya tekrar değişirse önceki onay kullanılmaz.
- Ağ yanıtı belirsiz kaldıktan sonra yeniden okuma aynı içeriği tanır; aynı kayıt körlemesine tekrar yazılmaz.

`20261010185753_sofra_0006_snapshot_sync.sql` revizyon sütunu ve `save_app_snapshot` RPC işlevini ekler. İşlev oturum sahibini denetler, beklenen revizyon tutmuyorsa `40001` döndürür ve zamanı sunucudan yazar. Doğrudan insert/update/delete yetkileri istemciden kaldırılır; eski istemcinin kör upsert'i çalışmaz. Okuma RLS ile kullanıcıya özeldir. Bu migration uygulamadan önce yeni istemciyle birlikte sürüm planı yapılmalıdır.

Dayanak belgeler: [Supabase RPC](https://supabase.com/docs/reference/javascript/rpc), [PostgreSQL UPDATE](https://www.postgresql.org/docs/current/sql-update.html).

## Canlıya geçmeden

Migration 0001–0006 ve ardından seed uygulanmalı. Gerçek projede Auth/SMTP/PKCE, PostgREST RPC ve iki farklı gerçek cihazla kabul testi yapılmalı. Bu aşamada canlı Supabase hesabına erişilmedi; yerel PostgreSQL ve bellek adaptörlü eşitleme testleri gerçek servis testi yerine sunulmaz. İmzalı iOS/Android uygulaması ve cihaz QA'sı sonraki dağıtım kapısıdır.
