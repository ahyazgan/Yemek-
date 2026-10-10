import { RecipeDetails } from '../domain/model';

const detail = (
  prepMinutes: number,
  cookMinutes: number,
  restMinutes: number,
  tips: string[],
  servingSuggestion: string,
  difficulty: RecipeDetails['difficulty'] = 'easy',
): RecipeDetails => ({
  prepMinutes,
  cookMinutes,
  restMinutes,
  difficulty,
  tips,
  servingSuggestion,
});

// Süreler yaklaşık, temel porsiyon içindir; bekleme süreleri toplam süreye dahildir.
export const recipeDetails: Record<string, RecipeDetails> = {
  mercimek: detail(
    5,
    25,
    0,
    [
      'Mercimeği yıkarken suyu birkaç kez değiştir; üzerindeki nişasta azalsın.',
      'Blenderdan önce tencereyi ocaktan al. Kıvamı sıcak suyu azar azar ekleyerek ayarla.',
    ],
    'Limonu sofrada sun. Yanına çoban salatası ve bir dilim ekmek yakışır.',
  ),
  menemen: detail(
    5,
    15,
    0,
    [
      'Domatesin suyu azalmadan yumurtayı ekleme; aksi halde menemen fazla sulu olur.',
      'Yumurta eklendikten sonra ateşi kıs; tabanı tutmadan tamamen pişir.',
    ],
    'Tavadan sıcak servis et. Yanına salatalık ve zeytin koyabilirsin.',
  ),
  bulgur: detail(
    5,
    15,
    10,
    [
      'Bulgurun cinsi su ihtiyacını değiştirir; paket önerisini kontrol et.',
      'Dinlenme sırasında kapağı açma; sonrasında çatalla nazikçe havalandır.',
    ],
    'Yoğurtlu kabak veya çoban salatasıyla tamamla.',
  ),
  nohut: detail(
    5,
    15,
    10,
    [
      'Bu tarif haşlanmış, süzülmüş nohutla hazırlanır; kuru nohut aynı gramajla kullanılamaz.',
      'Pirinç suyunu çekince ocağı kapat. Dinlenmeden karıştırmak taneleri kırabilir.',
    ],
    'Limonlu salata ve yoğurtla sofraya çıkar.',
  ),
  kabak: detail(
    10,
    15,
    0,
    [
      'Kabağı kurulayarak tavaya al; fazla su kızarmasını zorlaştırır.',
      'Yoğurdu, kabak çok sıcakken ekleme; önce ılımasını bekle.',
    ],
    'Bulgur pilavının ya da fırın sebzelerinin yanında sun.',
  ),
  tavuk: detail(
    10,
    25,
    0,
    [
      'Tavukları benzer büyüklükte doğra; pişmeleri daha eşit olur.',
      'Tavayı aşırı doldurma; gerekiyorsa tavuğu iki partide çevir.',
    ],
    'Bulgur pilavı ve mevsim salatasıyla tamamla.',
  ),
  ispanak: detail(
    10,
    20,
    0,
    [
      'Ispanağın saplarını ince doğrayıp yapraklarla birlikte kullanabilirsin.',
      'Ispanak kendi suyunu salar; ilave suyu kontrollü ekle.',
    ],
    'Limonu servis sırasında ekle. İstersen yoğurdu ayrı bir kasede sun.',
  ),
  fasulye: detail(
    10,
    20,
    5,
    [
      'Haşlanmış fasulyeyi sonradan ekleyerek dağılmasını azalt.',
      'Sosu koyulaştırmak için son birkaç dakika kapağı açık pişir.',
    ],
    'Pirinç pilavı ve soğanlı salatayla klasik bir sofra kur.',
  ),
  ezogelin: detail(
    5,
    35,
    0,
    [
      'Tahıllar bekledikçe su çeker; servis öncesi kıvamını kontrol et.',
      'Naneyi uzun süre kavurmak yerine son aşamada ekle.',
    ],
    'Limon dilimiyle sıcak sun. Yanına mücver ekleyebilirsin.',
  ),
  kisir: detail(
    15,
    0,
    10,
    [
      'İnce bulgur kullan; pilavlık bulgur aynı bekleme süresinde yumuşamaz.',
      'Yeşillikleri bulgur ılıdıktan sonra ekle ki diri kalsın.',
    ],
    'Marul yapraklarında ya da küçük kaselerde servis et.',
  ),
  coban: detail(
    15,
    0,
    0,
    [
      'Sebzeleri benzer boyutta doğramak her lokmanın dengeli olmasını sağlar.',
      'Tuz ve sosu son anda ekle; salatanın sulanmasını azalt.',
    ],
    'Tencere yemekleri ve pilavların yanında sun.',
  ),
  omlet: detail(
    5,
    20,
    0,
    [
      'Patates küplerini küçük tut ve yumurtadan önce tamamen yumuşat.',
      'Tavanın kapağını kapatmak yumurtanın üst kısmının da pişmesine yardımcı olur.',
    ],
    'Domates, salatalık ve yeşillikle kahvaltı tabağına dönüştür.',
  ),
  makarna: detail(
    5,
    15,
    0,
    [
      'Sos ve makarnayı aynı anda pişirerek zamandan kazan.',
      'Süzmeden önce haşlama suyundan ayır; nişastalı su sosu makarnaya bağlar.',
    ],
    'Çoban salatasıyla servis et; maydanozu sofraya çıkarmadan hemen önce ekle.',
  ),
  firinsebze: detail(
    10,
    40,
    0,
    [
      'Patates ve havucu kabaktan daha küçük kes; pişme süreleri birbirine yaklaşsın.',
      'Tepsiyi doldurup üst üste yığma; sebzeler tek kat olduğunda daha iyi renk alır.',
    ],
    'Yoğurtlu sosla veya ana yemeğin yanında servis et.',
  ),
  mantar: detail(
    10,
    15,
    0,
    [
      'Geniş tava kullan; mantarlar üst üste yığılırsa daha çok su salar.',
      'Domatesi, mantarların bıraktığı su büyük ölçüde çekildikten sonra ekle.',
    ],
    'Bulgur pilavı ile bir ana öğüne dönüştür.',
  ),
  sutlac: detail(
    5,
    40,
    120,
    [
      'Pirinci önce suda yumuşat; sütü ekledikten sonra sık sık tabanını karıştır.',
      'Sıcakken hafif akışkan bırak; soğudukça koyulaşır.',
    ],
    'Soğuk servis et. Tarçını sofraya çıkarırken ekle.',
  ),
  yayla: detail(
    10,
    25,
    0,
    [
      'Terbiyeyi sıcak suyla azar azar ılıtmak yoğurdun kesilmesini azaltır.',
      'Terbiye tencereye girdikten sonra güçlü kaynatma ve karıştırmayı bırakma.',
    ],
    'Naneli yağı servis sırasında paylaştır; yanında zeytinyağlı sebze sun.',
    'medium',
  ),
  pirasa: detail(
    10,
    30,
    5,
    [
      'Pırasanın katları arasında toprak kalmaması için kesmeden önce ve sonra yıka.',
      'Sık sık kaşıkla karıştırmak yerine tencereyi hafifçe salla.',
    ],
    'Limon dilimleriyle ılık servis et. Yanına yoğurt koyabilirsin.',
  ),
  bezelye: detail(
    10,
    30,
    0,
    [
      'Patates ve havuç küplerini küçük ve eşit kes; bezelyeyle birlikte yumuşasın.',
      'Sebzenin cinsine göre süre değişebilir; patatesi çatalla kontrol et.',
    ],
    'Sade pirinç pilavı veya bir kase yoğurtla tamamla.',
  ),
  barbunya: detail(
    10,
    25,
    5,
    [
      'Gramaj haşlanmış ve süzülmüş barbunya içindir; konserve kullanırsan suyunu süz.',
      'Sebzeleri barbunyadan önce pişirmeye başla; bakliyatın dağılmasını önlersin.',
    ],
    'Ilık servis et; yanında çoban salatası iyi gider.',
  ),
  mucver: detail(
    15,
    30,
    5,
    [
      'Kabağın suyunu iyice sıkmak daha az unla şekil alan bir karışım sağlar.',
      'Peynir tuzluysa ilave tuzu azalt; mücverleri eşit kalınlıkta yay.',
    ],
    'Yoğurdu ayrı kasede ve çoban salatasıyla birlikte sun.',
  ),
  semizotu: detail(
    15,
    0,
    0,
    [
      'Yaprakları iyice kurut; ıslak semizotu yoğurdu sulandırır.',
      'Yoğurtla karıştırma işini son ana bırak.',
    ],
    'Bulgur pilavı veya fırında mücverin yanında soğuk sun.',
  ),
  brokoli: detail(
    10,
    25,
    0,
    [
      'Brokolinin soyulmuş sapları çorbada kullanılabilir; çiçeklerden önce tencereye ekle.',
      'Sütü ekledikten sonra ateşi kıs ve karıştırarak ısıt.',
    ],
    'Karabiberi servis sırasında ekle; yanında kızarmış ekmek sunabilirsin.',
  ),
  irmik: detail(
    5,
    15,
    120,
    [
      'Süt, şeker ve irmiği ocak açılmadan karıştır; topaklanma azalır.',
      'Tabanı sürekli sıyırarak karıştır ve sıcak kıvamın soğuyunca koyulaşacağını unutma.',
    ],
    'Küçük kaselerde soğuk servis et; tarçını son anda ekle.',
  ),
};
