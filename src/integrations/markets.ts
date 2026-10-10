import { ShoppingItem } from '../domain/model';

export type MarketId = 'migros' | 'trendyol' | 'carrefoursa';
export type MarketCapability = {
  id: MarketId;
  label: string;
  enabled: boolean;
  reason: string;
  // Public website navigation is separate from authorized basket transfer.
  websiteUrl: `https://${string}`;
};
export type AuthorizedMarketAdapter = {
  capability: MarketCapability;
  // Gelecekte yalnızca izinli sunucu üzerinden resmî API kullanılmalı.
  prepareBasket(
    items: ShoppingItem[],
    signal?: AbortSignal,
  ): Promise<{ officialCheckoutUrl: string }>;
};
class DisabledMarketAdapter implements AuthorizedMarketAdapter {
  capability: MarketCapability;
  constructor(id: MarketId, label: string, websiteUrl: `https://${string}`) {
    this.capability = {
      id,
      label,
      enabled: false,
      reason: 'Bu uygulama için resmî API erişimi tanımlı değil.',
      websiteUrl,
    };
  }
  async prepareBasket(): Promise<never> {
    throw new Error(`${this.capability.label} bağlantısı etkin değil. Sipariş oluşturulmadı.`);
  }
}
// Bir ortam değişkeni bağlantıyı açamaz. Gerçek adaptör için sunucu doğrulaması ve sözleşme gerekir.
export const markets: AuthorizedMarketAdapter[] = [
  new DisabledMarketAdapter('migros', 'Migros', 'https://www.migros.com.tr/'),
  new DisabledMarketAdapter('trendyol', 'Trendyol', 'https://www.trendyol.com/'),
  new DisabledMarketAdapter('carrefoursa', 'CarrefourSA', 'https://www.carrefoursa.com/'),
];
