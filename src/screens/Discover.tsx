import { Text } from '../ui/Text';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, TextInput, View, useWindowDimensions } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useApp } from '../state/AppProvider';
import { Budget, Recipe, budgetLabels, dietLabels } from '../domain/model';
import { dateLabel, filterRecipes, mealsInWeek, weekDays } from '../domain/logic';
import { makeId } from '../domain/state';
import { Button, Chip, Empty, Notice, Page } from '../ui/components';
import { colors, styles as s } from '../ui/theme';
import { RecipeImage } from '../ui/RecipeImage';
import { matchesExperience } from '../domain/experience';
import { allIngredients } from '../domain/ingredients';
import {
  DiscoveryTheme,
  discoveryThemes,
  matchesTheme,
  recipeCategoryLabels,
} from '../domain/discovery';
import { DiscoveryHighlights, DiscoveryShortcuts } from '../ui/DiscoveryHighlights';

function RecipeCard({
  recipe,
  onPress,
  onAdd,
  selected,
  imageSize,
}: {
  recipe: Recipe;
  onPress: () => void;
  onAdd?: () => void;
  selected: boolean;
  imageSize: number;
}) {
  return (
    <View style={{ paddingTop: 20 }}>
      <View
        style={{
          position: 'absolute',
          top: imageSize * 0.45,
          bottom: 0,
          left: 0,
          right: 0,
          backgroundColor: colors.surface,
          borderRadius: 20,
        }}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={recipe.title + ', ' + recipe.minutes + ' dakika'}
        onPress={onPress}
        style={({ pressed }) => ({ opacity: pressed ? 0.75 : 1 })}
      >
        <RecipeImage
          id={recipe.id}
          style={{
            width: imageSize - 16,
            height: imageSize - 16,
            alignSelf: 'center',
            borderRadius: imageSize,
            borderWidth: 5,
            borderColor: colors.surface,
          }}
        />
        <View style={{ padding: 12, paddingTop: 14, gap: 7, paddingBottom: 18 }}>
          <Text
            style={[
              s.h3,
              {
                minHeight: imageSize < 180 ? 60 : 44,
                textAlign: 'center',
                fontSize: imageSize < 180 ? 14 : 16,
                lineHeight: 20,
              },
            ]}
            numberOfLines={3}
          >
            {recipe.title}
          </Text>
          <View
            style={{ flexDirection: 'row', justifyContent: 'center', gap: 5, alignItems: 'center' }}
          >
            <Ionicons name="time-outline" size={14} color={colors.muted} />
            <Text style={[s.muted, { fontSize: 12 }]}>{recipe.minutes} dk</Text>
          </View>
          <Text
            style={{
              textAlign: 'center',
              color: selected ? colors.green : colors.muted,
              fontSize: 11,
            }}
          >
            {selected ? 'Menünde ✓' : budgetLabels[recipe.budget]}
          </Text>
        </View>
      </Pressable>
      {onAdd && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={recipe.title + (selected ? ' menüde, detayları aç' : ' menüye ekle')}
          onPress={selected ? onPress : onAdd}
          style={({ pressed }) => ({
            position: 'absolute',
            top: imageSize - 29,
            right: 4,
            height: 44,
            width: 44,
            borderRadius: 22,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: selected ? colors.ink : colors.green,
            borderWidth: 3,
            borderColor: colors.surface,
            opacity: pressed ? 0.7 : 1,
          })}
        >
          <Ionicons name={selected ? 'checkmark' : 'add'} size={24} color="white" />
        </Pressable>
      )}
    </View>
  );
}

export function Discover({ choosing = false }: { choosing?: boolean }) {
  const { state, dispatch, week } = useApp();
  const params = useLocalSearchParams<{ date?: string; slot?: 'lunch' | 'dinner' }>();
  const { width } = useWindowDimensions();
  const [gridWidth, setGridWidth] = useState(Math.min(width, 1160) - 40);
  const columns = width >= 1000 ? 4 : width >= 700 ? 3 : 2;
  const cardWidth = Math.floor((gridWidth - (columns - 1) * 16) / columns);
  const [query, setQuery] = useState('');
  const [theme, setTheme] = useState<DiscoveryTheme>('all');
  const [sortQuick, setSortQuick] = useState(false);
  const [diet, setDiet] = useState('all');
  const [budget, setBudget] = useState<Budget | 'all'>('all');
  const [personalized, setPersonalized] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(''), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  const eligible = filterRecipes(
    state.recipes,
    query,
    diet,
    budget,
    state.profile,
    personalized,
    allIngredients(state),
  ).filter((r) => !personalized || matchesExperience(r, state.experience));
  const filtered = eligible.filter((r) => matchesTheme(r, theme));
  if (sortQuick) filtered.sort((a, b) => a.minutes - b.minutes);
  const themeLabel =
    discoveryThemes.find((t) => t.id === theme)?.title ??
    recipeCategoryLabels[theme as keyof typeof recipeCategoryLabels];
  const showHighlights =
    !choosing && !query && theme === 'all' && diet === 'all' && budget === 'all' && !filtersOpen;
  const meals = mealsInWeek(state, week);
  const filteredCount = Number(diet !== 'all') + Number(budget !== 'all');
  const add = (recipe: Recipe) => {
    const date = weekDays(week).find(
      (day) => !meals.some((meal) => meal.date === day && meal.slot === 'dinner'),
    );
    if (!date) {
      setNotice(
        'Akşam menün dolu. Menüm ekranından bir öğünü değiştirebilir veya öğle yemeği ekleyebilirsin.',
      );
      return;
    }
    dispatch({
      type: 'meal',
      value: {
        id: makeId('meal'),
        recipeId: recipe.id,
        date,
        slot: 'dinner',
        servings: state.profile?.people ?? 2,
      },
    });
    setNotice(recipe.title + ', ' + dateLabel(date, { weekday: 'long' }) + ' akşamına eklendi.');
  };
  return (
    <View style={s.page}>
      <Page>
        <View
          style={{
            gap: 8,
            paddingTop: width >= 900 ? 28 : 12,
            paddingBottom: 8,
            alignItems: 'center',
          }}
        >
          <Text style={[s.title, { textAlign: 'center' }]}>
            {choosing ? 'Sofrana ne ekleyelim?' : 'Bu akşam ne pişirsek?'}
          </Text>
          <Text style={[s.muted, { textAlign: 'center' }]}>
            {choosing
              ? 'İçine sinen tarifi seç.'
              : state.recipes.length + ' tariften ilham al. Menünü seç, listen hazır olsun.'}
          </Text>
        </View>
        <View style={[s.row, { gap: 10 }]}>
          <View
            style={[
              s.input,
              s.row,
              {
                flex: 1,
                backgroundColor: colors.surface,
                borderWidth: 0,
                borderRadius: 28,
                gap: 8,
              },
            ]}
          >
            <Ionicons name="search-outline" size={20} color={colors.muted} />
            <TextInput
              accessibilityLabel="Tarif ara"
              placeholder="Canın ne çekiyor?"
              placeholderTextColor={colors.muted}
              value={query}
              onChangeText={setQuery}
              style={{
                flex: 1,
                fontFamily: 'Outfit',
                fontSize: 15,
                color: colors.ink,
                minHeight: 24,
                minWidth: 0,
              }}
            />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Filtrele"
            accessibilityState={{ expanded: filtersOpen }}
            onPress={() => setFiltersOpen(!filtersOpen)}
            style={[
              s.row,
              {
                gap: 5,
                minHeight: 48,
                paddingHorizontal: 12,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: filtersOpen || filteredCount ? colors.green : colors.line,
                backgroundColor: colors.surface,
              },
            ]}
          >
            <Ionicons name="options-outline" size={19} color={colors.ink} />
            <Text style={{ fontSize: 13, fontWeight: '600', color: colors.ink }}>
              {filteredCount ? 'Filtre (' + filteredCount + ')' : 'Filtrele'}
            </Text>
          </Pressable>
        </View>
        {filtersOpen && (
          <View style={[s.card, { backgroundColor: colors.soft }]}>
            <Text style={s.h3}>Beslenme</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              <Chip label="Tümü" selected={diet === 'all'} onPress={() => setDiet('all')} />
              {Object.entries(dietLabels).map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={diet === key}
                  onPress={() => setDiet(key)}
                />
              ))}
            </View>
            <Text style={s.h3}>Bütçe tercihi</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7 }}>
              <Chip
                label="Her bütçe"
                selected={budget === 'all'}
                onPress={() => setBudget('all')}
              />
              {Object.entries(budgetLabels).map(([key, label]) => (
                <Chip
                  key={key}
                  label={label}
                  selected={budget === key}
                  onPress={() => setBudget(key as Budget)}
                />
              ))}
            </View>
            <Pressable
              accessibilityRole="switch"
              accessibilityLabel="Tercihlerime uygun tarifler"
              accessibilityState={{ checked: personalized }}
              aria-checked={personalized}
              onPress={() => setPersonalized(!personalized)}
              style={[s.row, { minHeight: 44 }]}
            >
              <Ionicons
                name={personalized ? 'checkbox' : 'square-outline'}
                size={22}
                color={colors.green}
              />
              <Text style={s.muted}>Tercihlerime uygun tarifler</Text>
            </Pressable>
            <Text style={[s.muted, { fontSize: 12 }]}>
              Bütçe etiketleri görecelidir; gerçek fiyat değildir.
            </Text>
            <Button
              label={filtered.length + ' tarifi göster'}
              onPress={() => setFiltersOpen(false)}
            />
          </View>
        )}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
        >
          <Chip label="Hepsi" selected={theme === 'all'} onPress={() => setTheme('all')} />
          <Chip
            label="20 dk ve altı"
            selected={theme === 'quick'}
            onPress={() => setTheme('quick')}
          />
          {Object.entries(recipeCategoryLabels).map(([key, label]) => (
            <Chip
              key={key}
              label={label}
              selected={theme === key}
              onPress={() => setTheme(key as DiscoveryTheme)}
            />
          ))}
        </ScrollView>
        {showHighlights && <DiscoveryHighlights recipes={eligible} onTheme={setTheme} />}
        {!choosing && !showHighlights && (
          <Button
            label="Haftamı hazırla"
            secondary
            icon="calendar-outline"
            onPress={() => router.push('/prepare-week')}
          />
        )}
        <View style={[s.between, { marginTop: 8 }]}>
          <Text style={[s.h2, { fontSize: 21 }]}>
            {theme !== 'all'
              ? themeLabel
              : query || filteredCount
                ? 'Aradığın lezzetler'
                : 'Sofrana yakışanlar'}
          </Text>
          <Text style={[s.muted, { fontSize: 12 }]}>{filtered.length} tarif</Text>
        </View>
        {!choosing && (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Chip label="Favorilerim" selected={false} onPress={() => router.push('/favorites')} />
            <Chip
              label="Koleksiyonlarım"
              selected={false}
              onPress={() => router.push('/collections')}
            />
            <Chip
              label="Evdekilerle pişir"
              selected={false}
              onPress={() => router.push('/pantry-recipes')}
            />
            <Chip label="Damak zevkim" selected={false} onPress={() => router.push('/taste')} />
          </View>
        )}
        <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap' }}>
          <Chip label="Önerilen sıra" selected={!sortQuick} onPress={() => setSortQuick(false)} />
          <Chip label="En hızlı önce" selected={sortQuick} onPress={() => setSortQuick(true)} />
          {theme !== 'all' && (
            <Chip label="Seçkiyi temizle" selected={false} onPress={() => setTheme('all')} />
          )}
        </View>
        <View
          testID="recipe-grid"
          onLayout={(event) => setGridWidth(event.nativeEvent.layout.width)}
          style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16, rowGap: 24 }}
        >
          {filtered.map((recipe) => (
            <View key={recipe.id} style={{ width: cardWidth }}>
              <RecipeCard
                recipe={recipe}
                imageSize={cardWidth}
                selected={meals.some((meal) => meal.recipeId === recipe.id)}
                onAdd={choosing ? undefined : () => add(recipe)}
                onPress={() =>
                  router.push({
                    pathname: '/recipe/[id]',
                    params: {
                      id: recipe.id,
                      ...(choosing ? { date: params.date, slot: params.slot } : {}),
                    },
                  })
                }
              />
            </View>
          ))}
        </View>
        {filtered.length === 0 && (
          <Empty title="Biraz farklı bakalım" description="Bu seçimlere uygun tarif bulunamadı.">
            <Button
              label="Filtreleri temizle"
              secondary
              onPress={() => {
                setQuery('');
                setDiet('all');
                setBudget('all');
                setPersonalized(false);
                setTheme('all');
              }}
            />
          </Empty>
        )}
        {!choosing && (
          <DiscoveryShortcuts
            pantryCount={Object.values(state.pantry).filter((n) => n > 0).length}
            collectionCount={state.experience.collections.length}
          />
        )}
        <Text style={[s.muted, { fontSize: 11, textAlign: 'center', marginTop: 12 }]}>
          Yazgan · Sofra demo / Geçici ürün adı
        </Text>
      </Page>
      {notice !== '' && (
        <View
          style={{
            paddingHorizontal: 20,
            paddingBottom: 8,
            maxWidth: 1000,
            alignSelf: 'center',
            width: '100%',
          }}
        >
          <Notice text={notice} />
        </View>
      )}
      {!choosing && meals.length > 0 && (
        <View
          style={{ borderTopWidth: 1, borderColor: colors.line, backgroundColor: colors.surface }}
        >
          <View
            style={[
              s.between,
              {
                width: '100%',
                maxWidth: 1000,
                alignSelf: 'center',
                paddingHorizontal: 20,
                paddingVertical: 10,
              },
            ]}
          >
            <View>
              <Text style={s.h3}>{meals.length} öğün seçtin</Text>
              <Text style={[s.muted, { fontSize: 12 }]}>{dateLabel(week)} haftası</Text>
            </View>
            <Button
              label="Menümü gör"
              icon="arrow-forward"
              onPress={() => router.navigate('/plan')}
            />
          </View>
        </View>
      )}
    </View>
  );
}
