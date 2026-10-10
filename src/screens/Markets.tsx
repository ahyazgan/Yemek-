import { Text } from '../ui/Text';
import React from 'react';
import { Link } from 'expo-router';
import { View } from 'react-native';
import { markets } from '../integrations/markets';
import { Page, Button } from '../ui/components';
import { useApp } from '../state/AppProvider';
import { colors, styles as s } from '../ui/theme';

export function Markets() {
  const { state, dispatch } = useApp();
  return (
    <Page maxWidth={780}>
      <View style={{ gap: 10, paddingTop: 12, alignItems: 'center' }}>
        <Text style={[s.title, { textAlign: 'center' }]}>Nereden alışveriş yapalım?</Text>
        <Text style={[s.muted, { textAlign: 'center' }]}>
          Ürünlerini marketin kendi sitesinde seçip siparişini orada tamamlayabilirsin.
        </Text>
      </View>
      <View style={{ padding: 16, borderRadius: 20, backgroundColor: colors.yellow, gap: 4 }}>
        <Text style={[s.h3, { fontSize: 14 }]}>Listen otomatik olarak sepete aktarılmaz.</Text>
        <Text style={[s.muted, { fontSize: 12, lineHeight: 18 }]}>
          Fiyatı, teslimatı ve ödemeyi seçtiğin sitede kontrol et. Sofra sipariş oluşturmaz.
        </Text>
      </View>
      <View style={{ gap: 12 }}>
        {markets.map(({ capability: market }) => (
          <View key={market.id} style={[s.card, { gap: 10 }]}>
            <View style={s.between}>
              <View style={{ flex: 1, gap: 3 }}>
                <Text style={[s.h3, { fontSize: 19 }]}>{market.label}</Text>
                <Text style={[s.muted, { fontSize: 12 }]}>
                  {market.websiteUrl.replace('https://www.', '').replace(/\/$/, '')}
                </Text>
              </View>
              <View
                style={{
                  paddingHorizontal: 9,
                  paddingVertical: 5,
                  borderRadius: 16,
                  backgroundColor: colors.soft,
                }}
              >
                <Text style={{ fontSize: 11, color: colors.muted }}>Sepet bağlantısı yok</Text>
              </View>
            </View>
            <Button
              secondary
              label={
                state.experience.preferredMarket === market.id
                  ? 'Tercih ettiğin market ✓'
                  : market.label + ' tercihimi kaydet'
              }
              onPress={() =>
                dispatch({ type: 'experience', value: { preferredMarket: market.id } })
              }
            />
            <Link
              href={market.websiteUrl}
              target="_blank"
              rel="noopener noreferrer"
              accessibilityLabel={market.label + ' sitesini aç'}
              style={{
                fontFamily: 'OutfitSemiBold',
                color: colors.surface,
                fontSize: 14,
                paddingHorizontal: 14,
                paddingVertical: 14,
                borderRadius: 24,
                backgroundColor: colors.green,
                textAlign: 'center',
              }}
            >
              {market.label} sitesini aç ↗
            </Link>
          </View>
        ))}
      </View>
      <View style={{ gap: 5 }}>
        <Text style={[s.h3, { fontSize: 14 }]}>Tek adımda sepet ne zaman?</Text>
        <Text style={[s.muted, { fontSize: 12, lineHeight: 19 }]}>
          Marketin resmî sepet erişimi sağlandığında. Şu an bu markalarla etkin bir entegrasyon veya
          iş ortaklığı bulunmuyor.
        </Text>
      </View>
    </Page>
  );
}
