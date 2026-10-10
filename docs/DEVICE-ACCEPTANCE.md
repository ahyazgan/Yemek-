# Telefon kabul testi

11 Ekim 2026. Bu belge çalıştırılacak senaryoları içerir; kutular tamamlanmış test anlamına gelmez. Gerçek telefonlar henüz bağlanmadı.

## Test kaydı

Her cihaz için bu formun bir kopyasını doldur. E-posta, token, kişisel yedek veya Apple cihaz kimliğini herkese açık GitHub kaydına koyma.

| Alan                                   | Değer                    |
| -------------------------------------- | ------------------------ |
| Platform/model/işletim sistemi         | Bekliyor                 |
| Paket sürümü ve Expo build bağlantısı  | Bekliyor                 |
| Test tarihi                            | Bekliyor                 |
| Kurulum türü                           | İlk kurulum / güncelleme |
| Sonuç                                  | Yapılmadı                |
| Hata adımları / beklenen / gerçekleşen | Bekliyor                 |

## Çevrimdışı çekirdek

- [ ] İlk açılışta 2 kişilik, dengeli bütçeli profil oluştur; 40 tarif ve yeni kahvaltı/fırın/soğuk sofra seçkilerini kontrol et.
- [ ] Aynı haftaya 1 kişilik çılbır ve 2 kişilik cacık ekle. Evde 150 g yoğurt tanımla. Listede tek satır 250 g yoğurt beklenir.
- [ ] Porsiyonu değiştir; miktarın anında değiştiğini ve stokun yalnızca bir kez düşüldüğünü doğrula.
- [ ] Listeyi kaydet; haftalık planı değiştirdiğinde kayıtlı listenin değişmediğini kontrol et.
- [ ] Alışveriş modunda ürün işaretle/geri al, ek ürün ekle; uygulamayı kapatıp açınca kayıtlar korunmalı.
- [ ] Uçak modunda uygulamayı tamamen kapat/aç. Tarif fotoğrafları, menü, liste ve kişisel notlar açılmalı. Bu test kurulu uygulama içindir; web ağsız ilk yükleme testi değildir.
- [ ] Uçak modunda değişiklik yap, kapat/aç; veriler korunmalı.
- [ ] Önceki sürüm üzerine kurulumda kişisel tarifler, fotoğraf, favori, plan, stok ve yedekler korunmalı. Kaldırıp yeniden kurmak yerel veriyi koruma testi değildir.

## Telefona özel işlemler

- [ ] Galeri seçimini iptal et; kayıt değişmemeli. Fotoğraf seç, kapat/aç, sonra kaldır.
- [ ] Fotoğraflı yedek dosyasını paylaş/kaydet; dosya seçimi iptalinde mevcut kayıt korunmalı.
- [ ] Yedeği diğer platformda geri yükle; önizleme/onay ve geri alma ile Türkçe karakter ve gramajları kontrol et.
- [ ] Liste, tarif ve menüyü paylaş; iptali başarı diye gösterme.
- [ ] Yazdır/PDF, video hata/oynat/duraklat ve pişirme sırasında ekranı açık tutma davranışlarını dene.
- [ ] Sayaç açıkken arka plana geç, geri dön ve uygulamayı yeniden aç; kalan süre doğru hesaplanmalı. Arka planda alarm vaadi yoktur.
- [ ] Bildirim iznini önce reddet, sonra cihaz ayarından aç; gün/saat değiştir, kapat/aç, yeniden başlat. Tek plan olmalı; çıkışta kaldırılmalı.
- [ ] Android geri tuşu/hareketi, iPhone geri hareketi, klavye, çentik ve güvenli alt alanı kontrol et.
- [ ] Büyük sistem yazısı, TalkBack/VoiceOver ve yatay taşma: düğme adları anlaşılır, alanlar erişilebilir olmalı.
- [ ] Zayıf bağlantıda/düşük bellekli cihazda ilk açılış, tarif kaydırma ve fotoğraf ekranını ölç. 38 PNG, toplam 90,63 MiB; paket boyutu ve tepe bellek gerçek cihazda kaydedilmeli.

## Gerçek hesap aşaması — kullanıcı sona bıraktı

SMTP/alan adı hazır ve kullanıcı gerçek testi başlatınca ayrı `preview-connected` paketiyle: doğrulama, şifre yenileme, uygulamaya dönüş, kalıcı oturum, A/B hesap ayrımı, iki cihaz eşitlemesi/çakışma/ağ kesintisi ve hesap silme. Hane pilotu ayrıca [HOUSEHOLD-PILOT.md](HOUSEHOLD-PILOT.md) tablosundan yürütülür. Bu testler demo hesapla geçmiş sayılmaz.

## Dağıtıma engel kabul edilenler

Açılış çökmesi, veri kaybı, yanlış gramaj/porsiyon, hesaplar arası veri sızıntısı, bozuk yedekle verinin üzerine yazılması, gerçek olmayan fiyat/sipariş, çalışmayan zorunlu hesap silme. Her hata düzeltildikten sonra ilgili senaryo ve etkilenen temel akış yeniden denenir.
