# Mimari ve bulut geçişi

## Çalışan yerel çekirdek

Dosyayla yedek taşıma `domain/backupFile.ts` doğrulama/UTF-8 boyut/karşılaştırma katmanını kullanır. `integrations/backupFiles.web.ts` yerel tarayıcı dosya seçimi/indirmesini, native `backupFiles.ts` Expo DocumentPicker/FileSystem/Sharing sınırını uygular. Dosya içeriği hiçbir sunucuya gönderilmeden önizlenir; aynı `AppProvider.replace` revizyon/geri alma korumasıyla yüklenir. Odak veya hesap değişince geç gelen dosya sonuçları kullanılmaz. Yaşam döngüsü ve sınırlar: [BACKUP-FILES.md](BACKUP-FILES.md).

Ekranlar `useApp` üzerinden durum okur; komutlar reducer'a gider. Durum değişiklikleri Zod ile doğrulanır ve sürümlü JSON olarak seri yazma kuyruğunda saklanır. Yükleme tamamlanmadan hiçbir otomatik kayıt yapılmaz. Geçersiz kayıt veya desteklenmeyen sürüm kullanıcıya gösterilir, sessiz veri kaybı yaratılmaz.

`buildShoppingList` saf fonksiyondur. Girdi: seçili haftanın öğünleri, tarifler ve mevcut stoklar. Her tarif miktarı `seçilen porsiyon / temel porsiyon` ile ölçeklenir. Kimlik bazında toplam alınır; stok yalnızca bir kez düşülür; sonuç en sonda 0,1 grama yuvarlanır. Pişirilme, satın alınma veya stok tüketimi otomatik varsayılmaz.

Kayıtlı listeler hesaplama çıktısının bağımsız kopyalarıdır. Tarif ve menü düzenlemeleri bu kopyaları değiştirmez. Aktif listenin tamamlanma anahtarı malzeme kimliği + gereken gramajdır. Haftalar için ayrı saklanır.

Tarih anahtarları yerel takvimde YYYY-MM-DD'dir; pazartesi haftanın ilk günüdür. Takvim işlemlerinde UTC ISO zaman damgasını keserek gün türetilmez. Oluşturulma zamanları ISO UTC zaman damgasıdır.

`suggestDinners` seçili haftanın toplam akşam hedefini tamamlamak için öneri üretir. Mevcut akşamları korur; o haftanın diğer öğünlerindeki tarifleri tekrar önermez. Hane beslenme/bütçe filtresini uygular, kalan adayları hafta ve öneri varyasyonuna göre döndürür. Yetersiz katalogda tekrar veya tercih ihlali yerine eksik sayısı döner. Önizleme kalıcı durumu değiştirmez. Onayda tek `addMeals` işlemi, o anda hâlâ boş olan öğünlere ekleme yapar; yinelenen çağrılar aynı öğünü çoğaltmaz. Bu yerel kural tabanlı öneridir; fiyat, besin dengesi veya yapay zekâ iddiası taşımaz.

## Katalog güncellemesi, keşif ve koleksiyonlar

Yerel kayıt yüklenirken ve bulut yedeği geri alınırken `upgradeCatalog` çalışır. Yeni katalog kimlikleri kopyalanır; mevcut tarif alanları ve tüm kişisel kayıtlar korunur. Eski tariflerde eksik kategori katalogdan tamamlanır. `Recipe.category` eski kayıt uyumluluğu için opsiyoneldir; editör altı kategoriyi düzenler. Otomatik akşam planı salata, yan yemek ve tatlı kategorilerini aday havuzuna almaz.

Koleksiyonlar `experience.collections` içinde kimlik, ad ve benzersiz tarif kimliklerinden oluşur. Eski kayıtlar boş koleksiyon dizisiyle açılır. Zod yinelenen koleksiyon kimliğini ve kopuk tarif bağlantısını reddeder. Koleksiyon üyeliği favori üyeliğinden bağımsızdır; koleksiyon silmek tarifi veya menüyü silmez.

`pantryMatch` aynı malzemenin g/kg girdilerini birleştirir, seçilen porsiyona ölçekler ve her malzemenin tamamına yeten stok olup olmadığını ayrı değerlendirir. Kısmi stok tam eşleşme sayılmaz. Su eşleşme hesabına dahil edilmez; yağ, tuz ve baharat dahil edilir. Öneriler yeterli malzeme oranına, eksik sayısına ve süreye göre sıralanır. Stok ve hane tercihleri değişmez. Önizlenen porsiyon tarif detayına aktarılır.

## PostgreSQL tabloları

`Recipe.details` hazırlık/pişirme/bekleme dakikaları, zorluk, püf noktaları ve servis önerisini taşır. Eksik (`undefined`) alan eski veri, `null` kullanıcının kaldırma kararıdır. Eski tarife ayrıntı eklenmeden önce süre, temel porsiyon, malzemeler ve adımlar katalogla karşılaştırılır. Kullanıcının değiştirdiği pişirme içeriğine katalog tavsiyesi eklenmez. Ayrıntı nesnesi ve alt dizileri kopyalanır; katalog verisi yerel düzenlemeyle değişmez.

`20261010185743_sofra_0004_recipe_details.sql`, `recipes.details` JSONB alanını ve içerik/süre toplamı kısıtını ekler. Katalog seed'i mevcut kimlikleri korur; geçmiş sunucu satırlarını güncellemez. Sekiz editoryal seçki uygulamayla gelir; kullanıcı koleksiyonlarıyla karıştırılmaz. `eligibleContent`, `storyRecipes` ve `relatedRecipes` aynı kişisel filtreleri uygular. Günlük öneri yerel takvim tarihinden deterministik olarak seçilir.

| Tablo               | Amaç / kısıt                                              |
| ------------------- | --------------------------------------------------------- |
| profiles            | Kullanıcı başına hane büyüklüğü, beslenme ve bütçe        |
| ingredients         | Ortak, salt okunur malzeme sözlüğü; temel birim gram      |
| recipes             | Yayımlanmış katalog veya kullanıcıya özel tarif           |
| recipe_ingredients  | Tarif/malzeme ilişkisi ve normalize gram miktarı          |
| weekly_plans        | Kullanıcı + pazartesi başlangıç tarihine göre tek plan    |
| meals               | Plan + gün + öğüne göre tek yemek; 1–12 porsiyon          |
| pantry_items        | Kullanıcı + malzeme bazında mevcut gram miktarı           |
| weekly_checks       | Haftalık ihtiyaç gramajına bağlı tamamlanma anahtarları   |
| shopping_lists      | İsimli liste başlığı ve kayıt tarihi                      |
| shopping_list_items | Malzeme, miktar ve tarif adlarının kayıt anındaki kopyası |

Her kişisel tabloda RLS açıktır. Kullanıcı kimliği `auth.uid()` ile eşleşmelidir. Alt tablolarda yalnızca bir `owner_id` sütununa güvenilmez: öğün–plan ve liste satırı–liste arasında sahipliği de içeren bileşik yabancı anahtar bulunur. Özel tariflere erişim ayrıca tarif görünürlüğüyle denetlenir. Katalog yalnızca güvenilir yönetim/sunucu rolüyle yayımlanabilir.

Kişisel profil tek hesaba aittir. Çok kullanıcılı ortak alan 0010 migration ile ayrı shared_households/household_members/household_invites/household_boards tablolarında tutulur. Üyelik tabanlı RLS ve sürüm kontrollü RPC yazıları kişisel snapshot eşitlemesinden bağımsızdır.

## Supabase'e geçiş sırası

1. Ayrı geliştirme projesinde migration ve katalog seed'ini uygula; gerçek Auth kimlikleri ve PostgREST üzerinden RLS regresyon testlerini tekrarla.
2. Hazır Auth adaptörünü kendi projene bağla; misafir verilerinin hesaba otomatik taşınmadığını koru. Aktarım özelliği eklenecekse hangi hesaba gittiği ve üzerine yazma davranışı açıkça gösterilmeli.
3. Kullanıcının katalog düzenlemelerini ortak tarifi değiştirmek yerine özel tarif kopyasına dönüştür; ilgili öğün referanslarını taşı.
4. Tam durum eşitlemesi ve tekrar kontrol mekanizması hazırdır. Satır bazlı ortak hane düzenlemesine geçilirse ayrı işlem kuyruğu ve birleştirme modeli gerekir.
5. Yerel kimlikleri koru/eşle; haftalık plan için sunucudaki UUID'yi kaydet. Tarif malzemelerinde kg değerlerini grama normalize et.
6. Tam durum çakışması, doğrulamalı dışa/içe aktarma, geri alma kopyası ve hesap silme akışları uygulanmıştır. Satır bazlı eşitleme için silme işaretleri ve kayıt bazlı birleştirme ayrıca gerekir.

Supabase SDK istemcisi artık `src/integrations/supabase.ts` içindedir; varsayılan demo modunda oluşturulmaz. `AuthProvider` oturumu, hesap kimliğiyle anahtarlanan `AppProvider` ise ayrı yerel veriyi yönetir. SDK anahtarı yalnızca public/publishable anahtar olabilir. Service-role sadece Edge Function ortamında bulunur. Bulut özelliği tam durumun kullanıcıya özel `app_snapshots` tablosunda revizyon kontrollü eşitlenmesidir. `CloudSyncProvider`, ortak son kopyayı hesap kapsamında tutar; tek taraflı değişikliği gönderir/alır, iki taraflı değişiklikte kullanıcı seçimi ister. Migration 0006 sunucu zamanı ve sürüm karşılaştırması yapan RPC dışında istemci yazılarını kapatır. JSONB anahtar sırası `canonical` ile normalize edilir. Ayrıntılar ve tekrar deneme davranışı [aşama belgesinde](EQUIPMENT-IMPORT-SYNC.md).

Yeni normalize tablolar: `recipe_favorites`, `cooking_history`, `user_preferences`, `extra_shopping_items`, `recipe_collections`, `recipe_collection_items`. Koleksiyon üyeliği koleksiyon+sahip bileşik yabancı anahtarıyla korunur; kullanıcının okuyamadığı özel tarif üyeliğe eklenemez. Bunlar RLS ile korunur; şu an snapshot dışındaki normalize tablolara otomatik yazma yoktur. İleride satır bazlı eşitlemede özel tarif kopyalama ve sahiplik kuralları korunmalıdır.

Yerel `experience` alanı eski v1 kayıtlarda Zod varsayılanlarıyla doldurulur; mevcut menü/stok/liste silinmez. Favoriler tarif kimlikleridir; pişirme geçmişi puan ve kişisel not taşır. Ek ürünler tarif malzemelerinden ayrı birime sahiptir ve kayıtlı listede bağımsız kopyalanır.

`delete-account` Edge Function yalnızca doğrulanmış bearer token sahibini siler; body içindeki başka kullanıcı kimliğine güvenmez. Silme çekirdeği yerel testlerle sınanır, Deno dağıtımı canlı test bekler. Storage eklenirse medya temizliği, Apple OAuth üretimde açılmadan önce sağlayıcı token iptali eklenmelidir.

## Market sınırı

`AuthorizedMarketAdapter` yalnızca gelecekteki arayüz sözleşmesini tanımlar. Mevcut implementasyonlar daima kapalıdır. Resmî erişim sağlanınca kimlik bilgileri ve izin kontrolleri sunucuda tutulmalı; istemcinin çevresel ayarı izin kanıtı sayılmamalı. Resmî ürün kimlikleri, paket gramajları, eşdeğer ürün seçimi ve güncel fiyat yanıtları ayrı modellere ihtiyaç duyar. Siparişe geçiş kullanıcının açık işlemi olmalıdır.

## Kişisel malzeme, paylaşım ve cihaz planı

`customIngredients` uygulama durumu/snapshot içinde kullanıcıya özeldir; normalize ortak ingredients tablosuna yazılmaz. Eski kayıt boş diziyle açılır. Ortak+kişisel sözlük hem kimlik hem Türkçe normalize ad bakımından benzersizdir. Kullanılan malzemenin silinmesi engellenir.

Tarif/menü/liste paylaşımı salt metin kopyasıdır; hane üyeliği yaratmaz. `recipeUses` menü ve pişirme geçmişindeki özel tarifin silinmesini engeller; kullanılmayan özel tarif silindiğinde favori/koleksiyon ilişkileri temizlenir.

`ReminderPort` işletim sistemiyle iletişimi saf plan denetleyicisinden ayırır. İşlemler sıraya alınır; kullanıcı kimliği izin ve planlama beklemeleri boyunca tekrar doğrulanır. Native adaptör yalnızca Sofra haftalık menü bildirimlerini yönetir. Web adaptörü planlamayı açıkça reddeder. Tercih snapshot'ta taşınabilir; gerçek işletim sistemi planı cihazda kalır ve otomatik oluşturulmaz.

Mobil production build ayarları `app.config.ts` tarafından doğrulanır. Şirket/sunucu sırları bundle içine dahil edilmemeli. Build kimlikleri public metadata'dır.

## Bütçe, hazırlık, pişirme ve topluluk genişlemesi

`experience.tools` içindeki bütçeler, paket fiyat notları, harcama günlüğü, düzenli ürün şablonları, stok tarihleri, tarif tercihleri, pişirme oturumları ve hazırlık işaretleri kullanıcı snapshot'ıyla taşınır. Eski kayıtlar boş araç alanlarıyla açılır. Malzeme/tarif silme bağlı araç kayıtlarını temizler. Fotoğraf/video dosyaları bu JSON'a konulmaz.

Alışveriş tahmini önce ortak gramajı toplar ve stoğu düşer; sonra paket büyüklüğüne yukarı yuvarlar. Eksik fiyat ayrı sayılır, sıfır fiyat varsayılmaz. Bütçeli menü yalnızca tüm fiyatları bilinen, kişisel tercihlere uyan seçeneklerle mevcut haftayı tamamlar. En ucuz küresel çözüm garantisi taşımaz. Hazırlık görevi kimliği tarif içeriği ve porsiyona bağlıdır; tarif/miktar değişince eski tamamlandı işareti yeni göreve taşınmaz.

Pişirme oturumu adım, porsiyon, tarif parmak izi, kalan saniye ve bitiş zamanını tutar. Her saniye diske yazılmaz; kullanıcı işlemleri saklanır. Yeniden açılışta kalan süre bitiş zamanından hesaplanır. Tarif değişince eski oturum kullanılmaz. Native ekranı açık tutma yalnızca odaktaki pişirme ekranında çalışır; arka plan alarmı yoktur.

0007 migration airfryer/multicooker ekipmanlarını ve recipe enrichment JSONB alanını ekler. Besin notu/video URL'si tarife ait içerik parmak iziyle saklanır; porsiyon/malzeme/adımlar değiştiğinde eski not gizlenir. Besin verisi otomatik üretilmez. Yazdırma HTML'i metni kaçışlar; web iframe'i script çalıştırmaz.

0008 migration `community_profiles`, `community_friends`, `community_blocks`, `community_posts`, `community_reports` tablolarını ekler. Kişisel snapshot'tan ayrı, açık kullanıcı işlemleriyle yazılır. Varsayılan özel profil; tam kullanıcı adıyla minimal kart araması; tarif okuma kendisi/açık profil/kabul edilmiş arkadaş ve engelleme kurallarıyla sınırlıdır. İstek kabulünü yalnızca alıcı yapabilir. Çift yönlü istek çifti benzersizdir. Blok iki yönde görünürlüğü ve arkadaşlığı kaldırır. Kullanıcı kendi raporlarını dahi genel sorguyla okuyamaz; moderatör rolü uygulamada sunulmaz. Güvenlik tanımlı işlevler sabit search_path kullanır, anonim EXECUTE izinleri kapalıdır. Gerçek Auth/PostgREST kabulü henüz yapılmadı.

`commerce.ts` resmî teklifleri mağaza, ürün, paket, para birimi, geçerlilik ve kampanya uygunluğuyla doğrular. Süresi geçmiş/stoksuz/yanlış mağazalı teklif eşlenmez. Kapalı gateway sipariş üretmez. Gerçek market HTTP sağlayıcısı izinli API belgeleri geldikten sonra uygulanır.

## Kişisel fotoğraf ve kaynaklı aktarım

Recipe.photo küçük, yeniden kodlanmış JPEG verisi, boyut ve açıklama taşır. Tek görsel 220.000, toplam görseller 2.000.000 karakter sınırındadır. Bu alan snapshot/backup içinde kullanıcıya özeldir; RecipeImage tüm kartlarda kişisel görseli önceler. Fotoğraf yalnızca açık kaydetme ile eklenir; geç gelen galeri sonucu başka hesaba yazılmaz. Kopyalamada alan sınırı kontrol edilir. Alternatif tarif asıl yemeğin kişisel fotoğrafını otomatik devralmaz.

Recipe.source HTTPS kaynak URL'si, yazar ve aktarım zamanıdır. Tarif düzenlenince korunur; kaynak metin paylaşımına da katılır. Recipe JSON-LD ayrıştırıcı app ve Edge Function arasında paylaşılan, platformdan bağımsız saf modüldür. Kaynak HTML çalıştırılmaz; gramaj ve malzeme eşleşmesi mevcut ImportDraft incelemesinden geçer.

0009 migration fotoğraf/kaynak sütunları ve sunucu kotasını ekler. import-recipe Edge Function bearer tokenı Auth ile doğrular, p_user_id değerini gövdeden almaz. consume_recipe_import sadece service_role tarafından çalıştırılır; atomik upsert kullanıcı başına 10/dakika sınırı uygular. İzin listesi tam HTTPS originlerle sınırlıdır; her redirect tekrar doğrulanır. DNS/IP sabitleme yoktur; güvenilir kaynak DNS'i ve üretim ağ çıkış kısıtları işletmecinin kurulumuna dahildir. Ayrıntılar RECIPE-MEDIA-IMPORT.md dosyasındadır.

## Ortak hane modülü

`domain/household.ts` yalnızca paylaşıma izin verilen menü/satır veri biçimini tanımlar. `shareWeek` ortak malzemeleri mevcut gram hesabıyla birleştirir, kişisel stoktan düşer, sadece sonuç miktarını açık yayın önizlemesine alır. `householdDemo` isteğe bağlı kişisel durum alanıdır; eski yedekler korunur. Yerel iki aktör aynı saf kurallarla davet/rol/sürüm denemesini yapar; sunucu güvenliği sayılmaz.

`integrations/household.ts` yerel ve gerçek portları aynı ekran sözleşmesine bağlar. Gerçek çağrı önce hesabı doğrular, RPC'ye yakalanmış aktör kimliğini ekler, yanıt sonunda hesap değişimini denetler. Sunucu da aktörü Auth ile eşleştirir. Yazılar haftanın beklenen sürümünü taşır. İstemci otomatik birleştirme veya yeniden gönderim yapmaz; çakışmada yeniden okur ve yeni yayın önizlemesi ister.

`SharedHousehold.tsx` hesap/aktör/hafta değişiminde yeniden kurulur. Eski async yanıtlar yaşam/sıra kontrolünden geçer. Ortak veri kişisel repository'ye yazılmaz. Ekran odaktayken Realtime hane UPDATE olayları, 20 saniyelik kontrol ve NativeAppState ön plan olayı yeniden okuma başlatır. Başarısız yetki doğrulamasında eski ortak veri gizlenir. Üyeden çıkarma olayının RLS nedeniyle cihaza ulaşmaması periyodik kontrolle ele alınır.

0010: tek hane üyeliği, en fazla 12 kişi ve 104 hafta; sunucu tarafından üretilen, özeti saklanan tek kullanımlık davet; RLS ile okuma ve yalnızca RPC üzerinden yazı. Hane satırı kilidi üyelik/rol/devir/kapama/liste değişimlerini sıralar. Yönetici silinmesi ortak veriyi cascade kaldırır; devir bunu önler. Realtime yalnızca `shared_households` olay satırlarını yayınlar. Ayrıntılı canlı kabul: HOUSEHOLD-PILOT.md.
