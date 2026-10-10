export const stories = [
  {
    id: 'kahvalti',
    title: 'Kahvaltıya bir tabak daha',
    subtitle: 'Tavadan sofraya, güne sıcak bir başlangıç.',
    description:
      'Çılbırın sarımsaklı yoğurdu, maydanozlu krep ve domatesli biber: kahvaltını farklı bir tarifle kur. Kişi sayısını seç, malzemeler birlikte hesaplansın.',
    cover: 'cilbir',
    color: '#F9E9AD',
    recipeIds: ['cilbir', 'peynirli-krep', 'peynirli-biber', 'menemen', 'omlet'],
    notes: [
      'Krep hamurunu hazırlarken iç malzemesini ayrı bir kapta karıştır.',
      'Yumurtalı tabakları sıcak servis etmek için yoğurt ve sebze hazırlığını önce bitir.',
    ],
  },
  {
    id: 'firin',
    title: 'Fırından sofraya',
    subtitle: 'Altın renkli kenarlar, paylaşmalık tabaklar.',
    description:
      'Limonlu tavuk, peynirli makarna ve sebze tepsileri. Porsiyon arttıkça daha büyük bir kap ya da iki tepsi kullan; tarifteki süreleri pişme kontrolüyle birlikte değerlendir.',
    cover: 'firinda-peynirli-makarna',
    color: '#FAD8CE',
    recipeIds: ['firin-limonlu-tavuk', 'firinda-peynirli-makarna', 'firinsebze', 'mucver'],
    notes: [
      'Fırını önceden ısıt ve tepsiyi yiyeceklerin eşit pişebileceği şekilde yerleştir.',
      'Fırın gerektiren tarifler mutfak ekipmanı tercihine göre gösterilir.',
    ],
  },
  {
    id: 'soguk-sofralar',
    title: 'Sofranın serin yanı',
    subtitle: 'Bakliyat, yoğurt ve bol yeşillik.',
    description:
      'Piyazdan cacığa, ana yemeğin yanında veya paylaşmalık bir sofrada yer açabileceğin tarifler. Haşlanmış bakliyat kullanıldığında gramaj süzülmüş ağırlığı gösterir.',
    cover: 'piyaz',
    color: '#DEE8CB',
    recipeIds: ['piyaz', 'nohut-salatasi', 'havuc-tarator', 'cacik', 'semizotu'],
    notes: [
      'Yıkanmış yeşillikleri kurula; sosu servise yakın ekle.',
      'Yoğurtlu tabakları hazırladıktan sonra servis edene kadar buzdolabında tut.',
    ],
  },
  {
    id: 'airfryer',
    title: 'Airfryer mutfağı',
    subtitle: 'Küçük sepet, sıcak tabaklar.',
    description:
      'Cihazına uygun küçük partilerle sebze ve mücver hazırla. Süre ve kap önerileri tariflerin içinde.',
    cover: 'airfryer-mucver',
    color: '#F9E9AD',
    recipeIds: ['airfryer-sebze', 'airfryer-mucver'],
    notes: [
      'Porsiyon arttığında sepeti doldurmak yerine parti sayısını artır.',
      'Cihazın kılavuzundaki uygun kap ve sıcaklık önerilerine uy.',
    ],
  },
  {
    id: 'tencere',
    title: 'Bir tencere ev yemeği',
    subtitle: 'Az bulaşık, bol lezzet.',
    description:
      'Soğanı doğra, tencereyi ocağa al. Sebze ve bakliyatla evin tanıdık lezzetlerini bir araya getiren tarifler.',
    cover: 'bezelye',
    color: '#DEE8CB',
    recipeIds: ['bezelye', 'barbunya', 'pirasa', 'fasulye', 'ispanak', 'nohut'],
    notes: [
      'Sebzeleri pişirmeye başlamadan doğramak tencere başındaki işi azaltır.',
      'Haşlanmış bakliyat kullanılan tariflerde alışveriş gramajı süzülmüş ağırlıktır.',
    ],
  },
  {
    id: 'corba',
    title: 'Çorbayla başlayan sofralar',
    subtitle: 'Altı kase, altı farklı lezzet.',
    description:
      'Mercimekten yoğurda, sebzeden tahıla: aynı başlangıcı tekrar etmek zorunda değilsin. Kıvamı ve terbiyesi için püf noktaları tariflerin içinde.',
    cover: 'yayla',
    color: '#F8E7BA',
    recipeIds: [
      'yayla',
      'brokoli',
      'mercimek',
      'ezogelin',
      'domates-corbasi',
      'sebzeli-pirinc-corbasi',
    ],
    notes: [
      'Kıvamı açarken sıcak suyu azar azar ekle.',
      'Blender kullanmadan önce tencereyi ocaktan al; sıcak sıvıyı sıçratmadan çalış.',
    ],
  },
  {
    id: 'sebze',
    title: 'Sebzeye sofrada yer aç',
    subtitle: 'Tavada, fırında, yoğurdun yanında.',
    description:
      'Sebzeyi tek bir şekilde pişirmek zorunda değilsin. Bir gün fırında mücver, ertesi gün yoğurtlu semizotu: farklı dokularla sofranı çeşitlendir.',
    cover: 'mucver',
    color: '#E7DEF0',
    recipeIds: ['mucver', 'semizotu', 'pirasa', 'mantar', 'kabak', 'firinsebze'],
    notes: [
      'Fırın tepsisinde sebzeleri tek kat yay; üst üste yığmak kızarmayı zorlaştırır.',
      'Yoğurtlu salatalarda yeşillikleri kurula ve yoğurtla servisten hemen önce birleştir.',
    ],
  },
  {
    id: 'haftasonu',
    title: 'Yavaş bir hafta sonu',
    subtitle: 'Kahvaltıdan küçük bir tatlıya.',
    description:
      'Uzun bir kahvaltı, paylaşmalık bir salata ve önceden hazırlanan sütlü tatlı. Bu seçki farklı öğünler için fikir verir; tek bir öğünün menüsü değildir.',
    cover: 'irmik',
    color: '#FAD8CE',
    recipeIds: ['menemen', 'omlet', 'kisir', 'coban', 'sutlac', 'irmik'],
    notes: [
      'Sütlü tatlıların soğuma süresini toplam hazırlık planına dahil et.',
      'Kahvaltıyı sıcak servis etmek için salata hazırlığını önce bitir.',
    ],
  },
];
