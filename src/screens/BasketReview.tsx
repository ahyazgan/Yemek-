import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { amountLabel, buildShoppingList, mealsInWeek } from '../domain/logic';
import { allIngredients } from '../domain/ingredients';
import { markets } from '../integrations/markets';
import { Button, Notice, Page, WeekPicker } from '../ui/components';
import { Text } from '../ui/Text';
import { colors, styles as s } from '../ui/theme';
export function BasketReview() {
  const { state, week } = useApp();
  const items = buildShoppingList(
    mealsInWeek(state, week),
    state.recipes,
    state.pantry,
    allIngredients(state),
  ).filter((i) => i.grams > 0 && i.ingredientId !== 'water');
  const extras = state.experience.extras.filter((i) => i.week === week);
  const market = markets.find(
    (m) => m.capability.id === state.experience.preferredMarket,
  )?.capability;
  return (
    <Page maxWidth={780}>
      <Text style={s.eyebrow}>LİSTEDEN MARKETE</Text>
      <Text style={s.title}>Sepet hazırlığı</Text>
      <WeekPicker />
      <View style={[s.card, { backgroundColor: colors.yellow }]}>
        <Text style={s.h2}>{market?.label ?? 'Marketini seç'}</Text>
        <Text style={s.text}>
          {items.length} malzeme · {extras.length} ek ürün
        </Text>
        <Button
          label="Market seçimini değiştir"
          secondary
          onPress={() => router.push('/markets')}
        />
      </View>
      <Notice text="Bu bir sipariş sepeti değildir. Resmî ürün bağlantısı açıldığında marka, paket, stok ve fiyatları onaylayabileceksin." />
      <View style={s.card}>
        <Text style={s.h2}>Eşleştirilecek malzemeler</Text>
        {items.map((i) => (
          <View key={i.ingredientId} style={s.between}>
            <Text style={[s.text, { flex: 1 }]}>{i.name}</Text>
            <Text style={s.h3}>{amountLabel(i.grams)}</Text>
          </View>
        ))}
        {extras.map((i) => (
          <View key={i.id} style={s.between}>
            <Text style={[s.text, { flex: 1 }]}>{i.name}</Text>
            <Text style={s.h3}>
              {i.quantity} {i.unit}
            </Text>
          </View>
        ))}
        {!items.length && !extras.length && (
          <Text style={s.muted}>Önce menüne yemek veya listene ürün ekle.</Text>
        )}
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Market bağlantısıyla açılacaklar</Text>
        {[
          'Marka ve paket alternatifleri',
          'Geçerli promosyon ve sadakat koşulları',
          'Teslimat / mağazadan teslim saatleri',
          'Resmî ödeme sayfası ve sipariş takibi',
        ].map((t) => (
          <Text key={t} style={s.muted}>
            ○ {t}
          </Text>
        ))}
      </View>
      <Button label="Listeye dön" onPress={() => router.push('/list')} />
    </Page>
  );
}
