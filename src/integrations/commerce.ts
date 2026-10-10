import { z } from 'zod';
import type { MarketId } from './markets';
import type { ShoppingItem } from '../domain/model';

// Contract for a server holding authorized retailer access. No provider credentials enter the app.
export const offerSchema = z
  .object({
    market: z.enum(['migros', 'trendyol', 'carrefoursa']),
    storeId: z.string().min(1),
    productId: z.string().min(1),
    ingredientId: z.string().min(1),
    title: z.string().min(1),
    packageGrams: z.number().finite().positive().max(10000000),
    priceCents: z.number().int().min(0).max(100000000),
    currency: z.literal('TRY'),
    available: z.boolean(),
    maxPackages: z.number().int().min(0).max(100000),
    observedAt: z.iso.datetime(),
    expiresAt: z.iso.datetime(),
    promotion: z
      .object({ label: z.string().min(1), conditions: z.string().min(1), eligible: z.boolean() })
      .nullable(),
  })
  .refine((v) => Date.parse(v.expiresAt) > Date.parse(v.observedAt), 'Fiyat süresi geçersiz');
export type OfficialOffer = z.infer<typeof offerSchema>;
export function matchOfficialOffers(
  items: ShoppingItem[],
  offers: unknown[],
  market: MarketId,
  storeId: string,
  now: number,
) {
  const valid = offers
    .map((o) => offerSchema.parse(o))
    .filter(
      (o) =>
        o.market === market &&
        o.storeId === storeId &&
        o.available &&
        Date.parse(o.observedAt) <= now &&
        Date.parse(o.expiresAt) > now &&
        (!o.promotion || o.promotion.eligible),
    );
  return items
    .filter((i) => i.grams > 0 && i.ingredientId !== 'water')
    .map((item) => ({
      item,
      alternatives: valid
        .filter((o) => o.ingredientId === item.ingredientId)
        .map((offer) => {
          const packages = Math.ceil(item.grams / offer.packageGrams);
          return {
            offer,
            packages,
            totalCents: packages * offer.priceCents,
            surplusGrams: packages * offer.packageGrams - item.grams,
          };
        })
        .filter((row) => row.packages <= row.offer.maxPackages)
        .sort((a, b) => a.totalCents - b.totalCents || a.surplusGrams - b.surplusGrams),
    }));
}
export function officialCheckoutUrl(value: string, allowedHosts: readonly string[]) {
  const url = new URL(value);
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.port ||
    !allowedHosts.includes(url.hostname)
  )
    throw new Error('Resmî ödeme adresi doğrulanamadı.');
  return url.href;
}
export interface CommerceGateway {
  capability(
    market: MarketId,
  ): Promise<{
    authorized: boolean;
    reason: string;
    permissions: ('catalog' | 'basket' | 'slots' | 'orders' | 'loyalty')[];
  }>;
  offers(input: {
    market: MarketId;
    storeId: string;
    ingredientIds: string[];
  }): Promise<OfficialOffer[]>;
  deliverySlots(input: {
    market: MarketId;
    storeId: string;
    method: 'delivery' | 'pickup';
  }): Promise<{ id: string; startsAt: string; feeCents: number }[]>;
  quote(input: {
    market: MarketId;
    storeId: string;
    products: { productId: string; packages: number }[];
    slotId: string | null;
    promotionCode: string | null;
  }): Promise<{ id: string; expiresAt: string; totalCents: number; warnings: string[] }>;
  checkout(input: {
    quoteId: string;
    idempotencyKey: string;
    confirmedTotalCents: number;
  }): Promise<{ checkoutUrl: string }>;
  orders(
    market: MarketId,
  ): Promise<
    {
      id: string;
      placedAt: string;
      status: 'received' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
      totalCents: number;
      supportUrl: string;
    }[]
  >;
}
export const commerceUnavailable =
  'Resmî market erişimi henüz bağlı değil. Ürün, fiyat veya sipariş oluşturulmadı.';
const unavailable = async (): Promise<never> => {
  throw new Error(commerceUnavailable);
};
export const commerce: CommerceGateway = {
  capability: async () => ({ authorized: false, reason: commerceUnavailable, permissions: [] }),
  offers: unavailable,
  deliverySlots: unavailable,
  quote: unavailable,
  checkout: unavailable,
  orders: unavailable,
};
