import React from 'react';
import { View } from 'react-native';
import { router } from 'expo-router';
import { useApp } from '../state/AppProvider';
import { allIngredients } from '../domain/ingredients';
import { menuText } from '../domain/sharing';
import { buildShoppingList, mealsInWeek } from '../domain/logic';
import { shoppingText } from '../domain/experience';
import { Button, Notice, Page, WeekPicker } from '../ui/components';
import { SharePanel } from '../ui/SharePanel';
import { Text } from '../ui/Text';
import { styles as s } from '../ui/theme';
export function Household() {
  const { state, week } = useApp();
  const meals = mealsInWeek(state, week);
  const items = buildShoppingList(meals, state.recipes, state.pantry, allIngredients(state));
  const extras = state.experience.extras.filter((i) => i.week === week);
  return (
    <Page maxWidth={720}>
      <Text style={s.eyebrow}>AYNI SOFRADA</Text>
      <Text style={s.title}>Ev halkıyla paylaş</Text>
      <Text style={s.text}>Bu haftanın menüsünü ve alışverişini birlikte kararlaştırın.</Text>
      <Button
        label="Ortak soframızı aç"
        icon="people-outline"
        onPress={() => router.push('/shared-household')}
      />
      <WeekPicker />
      <View style={s.card}>
        <Text style={s.h2}>Menüyü konuşalım</Text>
        <Text style={s.muted}>
          {meals.length} öğün hazır. Paylaşım öncesi metni kontrol edebilirsin.
        </Text>
        {meals.length > 0 ? (
          <SharePanel title="Haftalık menü" label="Menüyü paylaş" text={menuText(state, week)} />
        ) : (
          <Button label="Menümü hazırlayayım" onPress={() => router.push('/prepare-week')} />
        )}
      </View>
      <View style={s.card}>
        <Text style={s.h2}>Alışverişi paylaşalım</Text>
        <Text style={s.muted}>
          Evdeki miktar düşülmüş liste ve ek ürünler paylaşılır. Hesap bilgilerin ve mutfak
          stoklarının tamamı paylaşılmaz.
        </Text>
        {items.length + extras.length > 0 ? (
          <SharePanel
            title="Haftalık alışveriş"
            text={shoppingText(
              'Sofra · Haftalık alışveriş',
              items,
              state.checked[week] ?? [],
              extras,
            )}
          />
        ) : (
          <Button label="Alışveriş listemi aç" secondary onPress={() => router.push('/list')} />
        )}
      </View>
      <Notice text="Bu bölüm metin olarak paylaşılan bir kopyadır. Alıcının işaretledikleri senin listene yansımaz. Davet ve ortak liste için Ortak soframızı aç seçeneğini kullan." />
      <Text style={s.muted}>
        Bir tarifi göndermek için tarifin içindeki “Tarifi paylaş” seçeneğini kullan. Alıcı, Sofra
        içinde “Tarif aktar” ekranının Metin sekmesinden kendi defterine ekleyebilir.
      </Text>
    </Page>
  );
}
