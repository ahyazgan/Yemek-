import type { Recipe } from '../domain/model';
export const airfryerRecipes: Recipe[] = [
  {
    id: 'airfryer-sebze',
    title: 'Airfryer’da baharatlı sebzeler',
    description:
      'Kabak, patates ve havuç; az yağla, küçük partiler halinde kızaran renkli bir eşlikçi.',
    minutes: 35,
    baseServings: 2,
    category: 'side',
    diets: ['vegan', 'vegetarian', 'glutenFree'],
    budget: 'economic',
    equipment: ['airfryer'],
    color: '#D9AC67',
    art: 'greens',
    ingredients: [
      ['potato', 300],
      ['zucchini', 250],
      ['carrot', 120],
      ['oil', 18],
      ['thyme', 2],
      ['salt', 3],
    ].map(([ingredientId, quantity]) => ({
      ingredientId: String(ingredientId),
      quantity: Number(quantity),
      unit: 'g',
    })),
    steps: [
      'Patates ve havucu küçük, eşit parçalar halinde; kabağı biraz daha iri doğra. Yıkadığın sebzeleri kurula.',
      'Patates ve havucu zeytinyağının yarısı, tuz ve kekikle karıştır. Cihazın kullanım kılavuzuna göre 190 dereceye hazırlanan sepete tek kat yerleştir.',
      'Yaklaşık 10 dakika pişir. Kabağı kalan yağla karıştırıp ekle; sepeti salla ve 10–15 dakika daha, sebzeler yumuşayana kadar pişir.',
      'Sepet küçükse birkaç parti hazırla; süre cihaz ve kesim büyüklüğüne göre değişir. Sıcak servis et.',
    ],
    details: {
      prepMinutes: 10,
      cookMinutes: 25,
      restMinutes: 0,
      difficulty: 'easy',
      tips: [
        'Sepeti doldurmak yerine tek kat yerleşim kullan.',
        'Patates ve havucun pişmesini çatalla kontrol et; kabağı daha sonra ekle.',
      ],
      servingSuggestion: 'Yoğurtlu bir sosla veya ana yemeğin yanında servis edebilirsin.',
    },
  },
  {
    id: 'airfryer-mucver',
    title: 'Airfryer’da peynirli mücver',
    description: 'Suyu sıkılmış kabak, beyaz peynir ve dereotuyla küçük, yumuşak mücverler.',
    minutes: 35,
    baseServings: 2,
    category: 'main',
    diets: ['vegetarian'],
    budget: 'balanced',
    equipment: ['airfryer'],
    color: '#9BAA65',
    art: 'greens',
    ingredients: [
      ['zucchini', 400],
      ['egg', 100],
      ['flour', 60],
      ['feta', 80],
      ['dill', 15],
      ['oil', 12],
      ['blackpepper', 1],
    ].map(([ingredientId, quantity]) => ({
      ingredientId: String(ingredientId),
      quantity: Number(quantity),
      unit: 'g',
    })),
    steps: [
      'Kabağı rendele ve temiz bir bezle suyunu iyice sık. Dereotunu ince kıy, peyniri ufala.',
      'Kabak, yumurta, un, peynir, dereotu ve karabiberi karıştır. Karışımı cihazına uygun küçük, yağlanmış ısıya dayanıklı kalıplara paylaştır.',
      'Kalıpları sepetin hava dolaşımını engellemeyecek şekilde yerleştir. 180 derecede yaklaşık 20 dakika, orta kısmı tamamen pişene kadar pişir; gerekirse süreyi uzat.',
      'Cihazın kullanım kılavuzuna uy, boş pişirme kâğıdı kullanma. Kalıpları dikkatle çıkarıp 5 dakika dinlendir.',
    ],
    details: {
      prepMinutes: 10,
      cookMinutes: 20,
      restMinutes: 5,
      difficulty: 'easy',
      tips: [
        'Kabağın suyunu iyi sıkmak kıvamı belirler.',
        'Kalıpları fazla doldurma; cihaz küçükse partiler halinde pişir.',
      ],
      servingSuggestion: 'Yanına domatesli bir salata hazırlayabilirsin.',
    },
  },
];
// Variants use our existing representative photos of the same dish family.
export const photoAliases: Record<string, string> = {
  'airfryer-sebze': 'firinsebze',
  'airfryer-mucver': 'mucver',
};
