// Catalog of honest UI capabilities. Credentials alone must not enable a commerce provider.
export const serviceCatalog = [
  {
    id: 'auth',
    title: 'Hesap ve bulut yedeği',
    stage: 'Demo hazır · Bağlantı bekliyor',
    description:
      'Supabase e-posta girişi, doğrulama, şifre yenileme ve çakışma kontrollü eşitleme kodu hazır. Gerçek proje üzerinde bağlantı testi gerekli.',
  },
  {
    id: 'social',
    title: 'Apple ve Google ile giriş',
    stage: 'Kapalı · Sağlayıcı kurulumu gerekli',
    description:
      'Google/Apple giriş akışı hazır. Sağlayıcı kurulumu ve gerçek cihaz testleri tamamlanana kadar kapalıdır.',
  },
  {
    id: 'market',
    title: 'Migros, CarrefourSA ve Trendyol',
    stage: 'Resmî site bağlantıları',
    description:
      'Ürün, stok, fiyat, sepet, teslimat ve ödeme için izinli iş ortaklığı API erişimi gerekli. Burada sipariş oluşmaz.',
  },
  {
    id: 'push',
    title: 'Bildirimler',
    stage: 'Telefon hatırlatması hazır',
    description:
      'iOS/Android üzerinde izinle cihaz içi haftalık menü hatırlatması planlanır. Tarayıcı yalnızca tercihi saklar. Sunucudan push gönderimi kapalıdır; gerçek cihaz kabul testi gerekli.',
  },
  {
    id: 'household',
    title: 'Aileyle ortak kullanım',
    stage: 'Yerel deneme hazır · Canlı bağlantı bekliyor',
    description:
      'Ortak soframızda davet, üye yetkileri, ortak menü ve alışveriş akışı denenebilir. Gerçek hesaplarla kullanım için Supabase hane kurulumu ve cihazlar arası kabul testi gerekiyor.',
  },
  {
    id: 'media',
    title: 'Fotoğraf ve video',
    stage: 'Kişisel fotoğraf ve video bağlantısı',
    description:
      'Galeriden küçük tarif fotoğrafı ekleme, çevrimdışı saklama ve kişisel yedekte taşıma hazır. Video bağlantısı oynatılır; büyük medya dosyaları için ayrı altyapı gerekiyor.',
  },
  {
    id: 'billing',
    title: 'Üyelik ve ödeme',
    stage: 'Kapalı',
    description:
      'Ücretli plan veya tahsilat yok. Fiyatlandırma ve mağaza ödeme altyapısı belirlenmeden satış açılmaz.',
  },
  {
    id: 'support',
    title: 'Destek ve hata raporları',
    stage: 'Yardım ekranı hazır',
    description:
      'Destek adresi ve isteğe bağlı hata raporu sağlayıcısı yayından önce tanımlanacak. Şu an veri gönderilmiyor.',
  },
] as const;
export interface NotificationAdapter {
  available: boolean;
  schedule(input: { day: number; time: string }): Promise<string>;
  cancel(id: string): Promise<void>;
}
export const notifications: NotificationAdapter = {
  available: false,
  async schedule() {
    throw new Error('Bildirim sağlayıcısı bağlı değil.');
  },
  async cancel() {
    throw new Error('Bildirim sağlayıcısı bağlı değil.');
  },
};
export interface SocialAuthAdapter {
  available: boolean;
  signIn(provider: 'apple' | 'google'): Promise<void>;
}
// Legacy disabled port kept for compatibility. The active PKCE implementation
// used by AuthProvider is in social.ts; this object is not the sign-in path.
export const socialAuth: SocialAuthAdapter = {
  available: false,
  async signIn() {
    throw new Error('Sosyal giriş sağlayıcısı bağlı değil.');
  },
};
