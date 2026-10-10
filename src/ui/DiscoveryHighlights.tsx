import React from 'react';
import { Pressable, ScrollView, View, useWindowDimensions } from 'react-native';
import { router } from 'expo-router';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Recipe } from '../domain/model';
import { discoveryThemes, DiscoveryTheme, matchesTheme } from '../domain/discovery';
import { Text } from './Text';
import { RecipeImage } from './RecipeImage';
import { colors, styles as s } from './theme';
import { dailyRecipe } from '../domain/content';
import { StoryCards } from './ContentCards';

export function DiscoveryHighlights({
  recipes,
  onTheme,
}: {
  recipes: Recipe[];
  onTheme: (value: DiscoveryTheme) => void;
}) {
  const { width } = useWindowDimensions();
  const wide = width >= 760;
  const featured = dailyRecipe(recipes);
  if (!featured) return null;
  return (
    <View style={{ gap: 22 }}>
      <View style={{ flexDirection: wide ? 'row' : 'column', gap: 16 }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={'Günün fikri: ' + featured.title}
          onPress={() => router.push({ pathname: '/recipe/[id]', params: { id: featured.id } })}
          style={({ pressed }) => ({
            flex: wide ? 1.8 : undefined,
            backgroundColor: '#E4ECCD',
            borderRadius: 26,
            overflow: 'hidden',
            minHeight: wide ? 252 : 208,
            flexDirection: 'row',
            alignItems: 'center',
            padding: wide ? 28 : 18,
            gap: 8,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View style={{ flex: 1, gap: 9, zIndex: 1 }}>
            <Text style={[s.eyebrow, { fontSize: 10, color: '#3E5226' }]}>
              BUGÜNÜN LEZZET FİKRİ
            </Text>
            <Text style={[s.title, { fontSize: wide ? 34 : 23, lineHeight: wide ? 39 : 28 }]}>
              {featured.title}
            </Text>
            <Text style={[s.muted, { color: '#48563C', fontSize: 13 }]}>
              {featured.minutes} dakika · {featured.baseServings} kişilik
            </Text>
            <View style={[s.row, { marginTop: 4, gap: 7 }]}>
              <Text style={[s.h3, { fontSize: 13 }]}>Tarifi keşfet</Text>
              <Ionicons name="arrow-forward" size={18} color={colors.ink} />
            </View>
          </View>
          <RecipeImage
            id={featured.id}
            style={{
              width: wide ? 210 : 132,
              height: wide ? 210 : 132,
              borderRadius: 160,
              marginRight: wide ? -10 : -26,
              transform: [{ rotate: '-10deg' }],
            }}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Haftamı hazırla"
          onPress={() => router.push('/prepare-week')}
          style={({ pressed }) => ({
            flex: wide ? 1 : undefined,
            backgroundColor: colors.yellow,
            borderRadius: 26,
            padding: wide ? 26 : 18,
            justifyContent: 'space-between',
            gap: 16,
            opacity: pressed ? 0.8 : 1,
          })}
        >
          <View
            style={{
              flexDirection: wide ? 'column' : 'row',
              alignItems: wide ? 'flex-start' : 'center',
              gap: 12,
            }}
          >
            <Ionicons name="calendar-outline" size={wide ? 34 : 28} color={colors.ink} />
            <View style={{ flex: wide ? undefined : 1, gap: 6 }}>
              <Text style={[s.h2, { fontSize: wide ? 27 : 20 }]}>Bir haftalık rahatlık.</Text>
              <Text style={[s.text, { fontSize: 14 }]}>Yemekleri seç, listen hazır olsun.</Text>
            </View>
            {!wide && <Ionicons name="arrow-forward" size={24} color={colors.ink} />}
          </View>
          {wide && (
            <View style={s.between}>
              <Text style={s.h3}>Haftamı hazırla</Text>
              <Ionicons name="arrow-forward" size={22} color={colors.ink} />
            </View>
          )}
        </Pressable>
      </View>
      <StoryCards recipes={recipes} />
      <View style={{ gap: 12 }}>
        <Text style={[s.h2, { fontSize: 21 }]}>Canın neye çekiyor?</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
        >
          {discoveryThemes.map((theme) => {
            const count = recipes.filter((r) => matchesTheme(r, theme.id)).length;
            return (
              <Pressable
                key={theme.id}
                accessibilityRole="button"
                accessibilityLabel={theme.title + ' seçkisi, ' + count + ' tarif'}
                onPress={() => onTheme(theme.id)}
                style={({ pressed }) => ({
                  width: wide ? 250 : 170,
                  minHeight: 150,
                  padding: 16,
                  borderRadius: 22,
                  backgroundColor: theme.color,
                  overflow: 'hidden',
                  opacity: pressed ? 0.75 : 1,
                })}
              >
                <Text style={[s.h3, { fontSize: 16, zIndex: 1 }]}>{theme.title}</Text>
                <Text style={[s.muted, { fontSize: 11, zIndex: 1 }]}>{count} tarif</Text>
                <Text style={[s.muted, { fontSize: 11, width: 85, marginTop: 32, zIndex: 1 }]}>
                  {theme.subtitle}
                </Text>
                <RecipeImage
                  id={theme.cover}
                  style={{
                    position: 'absolute',
                    width: 96,
                    height: 96,
                    borderRadius: 48,
                    right: -4,
                    bottom: -10,
                    transform: [{ rotate: '10deg' }],
                  }}
                />
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}
export function DiscoveryShortcuts({
  pantryCount,
  collectionCount,
}: {
  pantryCount: number;
  collectionCount: number;
}) {
  return (
    <View style={{ gap: 12, marginTop: 14 }}>
      <Text style={s.h2}>Senin mutfağın, senin tariflerin.</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Evdekilerle ne pişirsem?"
        onPress={() => router.push('/pantry-recipes')}
        style={[s.card, s.row, { backgroundColor: '#DEE8CB' }]}
      >
        <Ionicons name="leaf-outline" size={30} color="#485F37" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.h3}>Evdekileri değerlendir</Text>
          <Text style={s.muted}>
            {pantryCount
              ? pantryCount + ' malzemen kayıtlı. Neler pişirebileceğine bakalım.'
              : 'Dolabındakileri kaydet, eksikleri az olan tarifleri bul.'}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={22} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Koleksiyonlarımı aç"
        onPress={() => router.push('/collections')}
        style={[s.card, s.row, { backgroundColor: '#E7DEF0' }]}
      >
        <Ionicons name="albums-outline" size={30} color="#625170" />
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={s.h3}>Kendi seçkini oluştur</Text>
          <Text style={s.muted}>
            {collectionCount
              ? collectionCount + ' koleksiyonun var. Tarif defterini aç.'
              : 'Pazar kahvaltıları, pratik akşamlar… Hepsi bir yerde.'}
          </Text>
        </View>
        <Ionicons name="arrow-forward" size={22} />
      </Pressable>
    </View>
  );
}
